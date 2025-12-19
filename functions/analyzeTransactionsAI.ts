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

        const prompt = `
        You are a Blockchain Forensic Analyst AI.
        Analyze the following Ethereum transaction history for the target wallet ${address}.
        
        Format: Date, Type (IN/OUT), Amount (ETH), Counterparty Address
        
        TRANSACTIONS:
        ${txList}
        
        TASK:
        Identify suspicious patterns or anomalies such as:
        1. Structuring / Smurfing (multiple small transactions just below reporting thresholds).
        2. Peeling Chains (large incoming, multiple small outgoing to different addresses).
        3. Round Tripping / Wash Trading (sending and receiving from same entities rapidly).
        4. Mixer / Tumbler Usage (interaction with known mixer patterns, though addresses are anonymized here, look for uniform amounts).
        5. High Velocity draining (rapid depletion of funds).
        
        OUTPUT:
        Return a JSON object with:
        - "summary": A concise summary of the transaction behavior (2-3 sentences).
        - "risk_score": 0-100 score based on patterns.
        - "patterns": Array of strings describing identified patterns (e.g. "Possible Structuring detected on 2023-10-12").
        - "anomalies": Array of specific suspicious transactions (e.g. "Large outflow of 10 ETH immediately after inflow").
        `;

        const aiRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    summary: { type: "string" },
                    risk_score: { type: "number" },
                    patterns: { type: "array", items: { type: "string" } },
                    anomalies: { type: "array", items: { type: "string" } }
                }
            }
        });

        return Response.json({ success: true, analysis: aiRes });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});