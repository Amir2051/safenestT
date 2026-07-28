import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && !user.is_admin && user.job_title !== 'Fraud Specialist')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { transactions, address } = await req.json();

        if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
            return Response.json({ error: 'No transactions provided for analysis' }, { status: 400 });
        }

        // Format transactions for AI (CSV-like format to save tokens)
        // Limit to last 50 transactions to fit context window if needed
        const txList = transactions.slice(0, 50).map(tx => {
            const date = new Date(tx.timeStamp * 1000).toISOString().split('T')[0];
            const type = tx.to?.toLowerCase() === address?.toLowerCase() ? 'IN' : 'OUT';
            const val = parseFloat(tx.value).toFixed(4);
            const other = type === 'IN' ? tx.from : tx.to;
            return `${date},${type},${val},${other}`;
        }).join('\n');

        // Deterministic heuristics (computed in code, not just LLM) — strengthens
        // the analysis with reproducible signals and reduces hallucination.
        const txs = transactions.slice(0, 200).map(tx => ({
            date: new Date(tx.timeStamp * 1000),
            type: (tx.to || '').toLowerCase() === (address || '').toLowerCase() ? 'IN' : 'OUT',
            value: parseFloat(tx.value) || 0,
            other: (tx.type === 'IN' ? tx.from : tx.to || '')
        }));
        const ins = txs.filter(t => t.type === 'IN').sort((a, b) => a.date - b.date);
        const outs = txs.filter(t => t.type === 'OUT').sort((a, date) => a.date - date);
        const heuristics = {
            peeling_chain: ins.length > 0 && outs.length >= 3 && outs[0].date > ins[ins.length - 1].date && outs.every(o => o.value < (ins[ins.length - 1].value || 0) / 2) && outs.every((o, i) => i === 0 || o.value <= outs[i - 1].value + 1e-6),
            high_velocity_drain: ins.length > 0 && (ins[ins.length - 1].date - (outs[outs.length - 1]?.date || ins[ins.length - 1].date)) < 0 && (outs.length >= 5 && (outs[0].date - ins[ins.length - 1].date) < 3600_000),
            structuring: outs.filter(o => o.value > 0 && o.value < 0.05).length >= 5,
            mixer_like: outs.filter(o => Math.abs(o.value - outs[0]?.value) < 1e-4 && outs.length >= 4).length >= 4,
            rapid_round_trip: ins.length > 0 && outs.length > 0 && Math.abs(outs[0].date - ins[ins.length - 1].date) < 600_000 && ins.some(i => outs.some(o => o.other?.toLowerCase() === i.other?.toLowerCase()))
        };
        const heuristicFlags = Object.entries(heuristics).filter(([, v]) => v).map(([k]) => k);

        const prompt = `
        You are a Blockchain Forensic Analyst AI.
        Analyze the following Ethereum transaction history for the target wallet ${address}.

        Format: Date, Type (IN/OUT), Amount (ETH), Counterparty Address

        TRANSACTIONS:
        ${txList}

        PRE-COMPUTED HEURISTIC SIGNALS (verify, do not contradict without reason):
        ${heuristicFlags.length ? heuristicFlags.join(', ') : 'none detected'}

        TASK:
        Identify suspicious patterns or anomalies such as:
        1. Structuring / Smurfing (multiple small transactions just below reporting thresholds).
        2. Peeling Chains (large incoming, multiple small outgoing to different addresses).
        3. Round Tripping / Wash Trading (sending and receiving from same entities rapidly).
        4. Mixer / Tumbler Usage (uniform amounts, known mixer patterns).
        5. High Velocity draining (rapid depletion of funds).

        OUTPUT:
        Return a JSON object with:
        - "summary": A concise summary of the transaction behavior (2-3 sentences).
        - "risk_score": 0-100 score based on patterns.
        - "laundering_stage": one of "initial_deposit" | "layering" | "integration" | "unknown".
        - "patterns": Array of strings describing identified patterns.
        - "anomalies": Array of specific suspicious transactions.
        - "recommended_action": one of "monitor" | "flag_for_review" | "escalate_to_agency" | "freeze_recommended".
        - "confidence": 0-1 attribution confidence.
        `;

        const aiRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    summary: { type: "string" },
                    risk_score: { type: "number" },
                    laundering_stage: { type: "string" },
                    patterns: { type: "array", items: { type: "string" } },
                    anomalies: { type: "array", items: { type: "string" } },
                    recommended_action: { type: "string" },
                    confidence: { type: "number" }
                }
            }
        });

        // Merge deterministic heuristics into the result so downstream tooling
        // always has reproducible signals even if the LLM under-reports.
        const result = { ...aiRes, heuristics: heuristicFlags };
        return Response.json({ success: true, analysis: result });


    } catch (error) {
        return Response.json({ error: (error as Error).message }, { status: 500 });
    }
});