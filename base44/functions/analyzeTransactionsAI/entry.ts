import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && !user.is_admin && user.job_title !== 'Fraud Specialist')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const { transactions, address, validate = true } = body || {};

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return Response.json({ error: 'No transactions provided for analysis' }, { status: 400 });
    }
    if (validate && !address) return Response.json({ error: 'address is required when validate=true' }, { status: 400 });

    const limited = transactions.slice(0, 200).map(tx => ({
      date: new Date((tx.timeStamp ?? tx.timestamp ?? 0) * 1000),
      type: (tx.to || '').toLowerCase() === (address || '').toLowerCase() ? 'IN' : 'OUT',
      value: parseFloat(tx.value || '0'),
      other: (tx.type === 'IN' ? tx.from : tx.to || ''),
      hash: tx.hash || tx.txHash || tx.id || ''
    }));

    const txs = limited.filter(t => t.date instanceof Date && !isNaN(t.date));
    const ins = txs.filter(t => t.type === 'IN').sort((a, b) => a.date - b.date);
    const outs = txs.filter(t => t.type === 'OUT').sort((a, b) => a.date - b.date);

    const heuristicFlags = [];
    const addFlagIf = (name, cond) => { if (cond) heuristicFlags.push(name); };

    if (ins.length > 0 && outs.length >= 3) {
      const lastIn = ins[ins.length - 1].value || 0;
      const peeling = outs.every(o => o.value < lastIn / 2) && outs.slice(1).every((o, i) => o.value <= outs[i].value + 1e-6);
      addFlagIf('peeling_chain', peeling);
    }
    addFlagIf('high_velocity_drain', !!ins.length && ((ins[ins.length - 1].date.getTime() - (outs[outs.length - 1]?.date.getTime() || ins[ins.length - 1].date.getTime())) < 0) && outs.length >= 5 && (outs[0].date.getTime() - ins[ins.length - 1].date.getTime()) < 3600_000);
    addFlagIf('structuring', outs.filter(o => o.value > 0 && o.value < 0.05).length >= 5);
    addFlagIf('mixer_like', outs.length >= 4 && outs.slice(1).every((o, i) => Math.abs(o.value - outs[i].value) < 1e-4));
    addFlagIf('rapid_round_trip', !!ins.length && !!outs.length && Math.abs(outs[0].date.getTime() - ins[ins.length - 1].date.getTime()) < 600_000 && ins.some(i => outs.some(o => o.other?.toLowerCase() === i.other?.toLowerCase())));

    const samples = txs.slice(0, 50).map(t => `${t.date.toISOString().split('T')[0]},${t.type},${t.value.toFixed(4)},${t.other}`).join('\n');
    const prompt = `You are a Blockchain Forensic Analyst AI. Analyze the following Ethereum transaction history for target wallet ${address || 'unknown'}.\n\nFormat: Date, Type (IN/OUT), Amount (ETH), Counterparty Address\nTRANSACTIONS:\n${samples}\n\nPRE-COMPUTED SIGNALS: ${heuristicFlags.length ? heuristicFlags.join(', ') : 'none'}\nTASK:\n1. Return one concise summary sentence.\n2. risk_score 0-100.\n3. laundering_stage from initial_deposit|layering|integration|unknown.\n4. patterns array.\n5. anomalies array of specific suspicious txs.\n6. recommended_action from monitor|flag_for_review|escalate_to_agency|freeze_recommended.\n7. confidence 0-1.\n`;

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

    const result = {
      ...aiRes,
      heuristics: heuristicFlags,
      meta: {
        tx_count: txs.length,
        in_count: ins.length,
        out_count: outs.length,
        address
      }
    };
    return Response.json({ success: true, analysis: result });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
