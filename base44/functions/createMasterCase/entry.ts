import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const forceRegenerate = body.regenerate || false;

    // 1. Return cached if not forcing regeneration
    if (!forceRegenerate) {
      const existing = await base44.entities.MasterCase.filter({ user_id: user.email }, '-generated_date', 1);
      if (existing.length > 0) {
        return new Response(JSON.stringify({ success: true, masterCase: existing[0], cached: true }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 2. Fetch ALL cases for this user across all entities
    const [myCases, investigationCases, clientCases] = await Promise.all([
      base44.entities.MyCase.filter({ created_by: user.email }, '-created_date', 100),
      base44.entities.InvestigationCase.filter({ created_by: user.email }, '-created_date', 100).catch(() => []),
      base44.entities.MyCase.filter({ client_email: user.email }, '-created_date', 100).catch(() => [])
    ]);

    // Deduplicate by ID
    const allCasesMap = new Map();
    [...myCases, ...investigationCases, ...clientCases].forEach(c => allCasesMap.set(c.id, c));
    const allCases = Array.from(allCasesMap.values());

    if (allCases.length === 0) {
      return new Response(JSON.stringify({ error: 'No cases found for this user' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Aggregate all fields
    const linkedCaseIds   = [];
    const scamList        = [];
    const walletSet       = new Set();
    const transactionRecords = [];
    const evidenceMap     = new Map();
    let   totalLoss       = 0;

    allCases.forEach(c => {
      linkedCaseIds.push(c.id);

      const amount = parseFloat(c.amount_lost || c.amount_stolen_usd || 0);
      totalLoss += amount;

      scamList.push({
        date:     c.incident_date || c.created_date,
        platform: c.platform || c.issue_type || c.fraud_type || 'Unknown',
        method:   c.incident_classification || c.fraud_method || c.fraud_type || 'Unknown',
        amount,
        case_id:  c.case_number || c.id
      });

      // Wallets
      if (c.scammer_wallet) walletSet.add(c.scammer_wallet);
      (c.scammer_info?.wallet_addresses || []).forEach(w => walletSet.add(w));
      (c.monitored_wallets || []).forEach(w => walletSet.add(w));
      (c.alleged_actor_information?.crypto_wallet_addresses || []).forEach(w => walletSet.add(w));

      // Transactions
      if (Array.isArray(c.transactions)) {
        transactionRecords.push(...c.transactions.map(t => ({ ...t, source_case: c.case_number || c.id })));
      }
      if (Array.isArray(c.payment_transactions)) {
        transactionRecords.push(...c.payment_transactions.map(t => ({ ...t, source_case: c.case_number || c.id })));
      }

      // Evidence
      [...(c.evidence_files || []), ...(c.evidence_log || []), ...(c.supporting_documentation || [])].forEach(ev => {
        const url = ev?.url || ev?.file_url;
        if (url && !evidenceMap.has(url)) {
          evidenceMap.set(url, {
            url,
            name:        ev.name || ev.description || 'Unnamed File',
            source_case: c.case_number || c.id,
            type:        ev.type || ev.evidence_type || 'document'
          });
        }
      });
    });

    const sortedScamList = scamList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. LLM — generate IC3-grade narrative + pattern analysis
    const victimName   = user.full_name || user.email;
    const walletList   = Array.from(walletSet);
    const dateRange    = sortedScamList.length
      ? `${new Date(sortedScamList[0].date).toLocaleDateString()} to ${new Date(sortedScamList[sortedScamList.length - 1].date).toLocaleDateString()}`
      : 'Unknown date range';

    const prompt = `
You are a senior fraud intelligence analyst preparing a Master Case dossier for submission to the FBI Internet Crime Complaint Center (IC3), EFCC, and Interpol.

VICTIM INFORMATION:
  Name:  ${victimName}
  Email: ${user.email}
  Total Financial Loss: $${totalLoss.toLocaleString()} USD
  Date Range of Victimization: ${dateRange}
  Number of Distinct Incidents: ${allCases.length}

INCIDENT CHRONOLOGY:
${JSON.stringify(sortedScamList, null, 2)}

IDENTIFIED SUSPECT WALLET ADDRESSES (${walletList.length}):
${walletList.join('\n') || 'None identified'}

EVIDENCE FILES COLLECTED: ${evidenceMap.size} items

INSTRUCTIONS:
Generate a professional law enforcement dossier in HTML with TWO distinct sections.

SECTION 1 — merged_summary:
Write a detailed, chronological narrative of how this victim was targeted. Requirements:
- Use professional law enforcement language (third person: "The victim")
- Reference each incident by its case ID and date
- Describe the fraud method, platform, and financial impact per incident
- Conclude with a summary of total loss and a formal request for investigation
- Format: HTML with headings, paragraphs, and a summary statistics table
- Include: Executive Summary, Incident Narrative, Financial Impact Summary, Conclusion & Action Requested

SECTION 2 — pattern_analysis:
Write a detailed intelligence analysis. Requirements:
- Identify patterns: shared wallets, recurring platforms, consistent methods (pig butchering, romance scam, recovery scam, etc.)
- Assess whether incidents appear linked (single actor/network vs. opportunistic)
- Flag any red flags (rapid fund movement, cross-chain activity, multiple victims implied)
- Note investigative priorities (wallet tracing, platform subpoenas, jurisdiction)
- Format: HTML with headings and bullet lists

Return ONLY valid JSON: { "merged_summary": "<html>...", "pattern_analysis": "<html>..." }
`;

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          merged_summary:   { type: 'string' },
          pattern_analysis: { type: 'string' }
        },
        required: ['merged_summary', 'pattern_analysis']
      }
    });

    // 5. Persist — update existing or create new
    const masterCaseData = {
      user_id:             user.email,
      linked_case_ids:     linkedCaseIds,
      merged_summary:      llmRes.merged_summary,
      pattern_analysis:    llmRes.pattern_analysis,
      scam_list:           sortedScamList,
      wallet_addresses:    walletList,
      transaction_records: transactionRecords,
      evidence_index:      Array.from(evidenceMap.values()),
      total_loss:          totalLoss,
      status:              'draft',
      generated_date:      new Date().toISOString()
    };

    const existing = await base44.entities.MasterCase.filter({ user_id: user.email });
    let resultEntity;

    if (existing.length > 0) {
      const current = existing[0];
      // Preserve submitted status and pdf_url if already submitted
      resultEntity = await base44.entities.MasterCase.update(current.id, {
        ...masterCaseData,
        status:  current.status === 'submitted' ? 'submitted' : 'draft',
        pdf_url: current.pdf_url || undefined
      });
    } else {
      resultEntity = await base44.entities.MasterCase.create(masterCaseData);
    }

    return new Response(JSON.stringify({ success: true, masterCase: resultEntity, cached: false }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Master Case Creation Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
});
