import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const { caseId, entityName } = body;
    if (!caseId) {
        return new Response(JSON.stringify({ error: 'Case ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Fetch Case Data
    let currentCase = null;
    const entitiesToTry = entityName ? [entityName] : ['MyCase', 'InvestigationCase', 'ClientCase', 'FraudCase'];
    
    for (const entity of entitiesToTry) {
        if (base44.entities[entity]) {
            try {
                const cases = await base44.entities[entity].filter({ id: caseId });
                if (cases && cases.length > 0) {
                    currentCase = cases[0];
                    break;
                }
            } catch (e) {
                console.warn(`Failed to fetch from ${entity}`, e);
            }
        }
    }
    
    if (!currentCase) {
        return new Response(JSON.stringify({ error: "Case not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Fetch Evidence & Transactions
    const evidenceFiles = await base44.asServiceRole.entities.CaseEvidenceFile.filter({ case_id: caseId });
    const transactions = await base44.asServiceRole.entities.ExtractedTransaction.filter({ case_id: caseId });

    // 3. Fetch Connected Cases (Simplified logic from caseAnalysis)
    let connectedCasesSummary = "No cross-case connections detected.";
    try {
        // We'll call the existing function to avoid code duplication if possible, 
        // but for now, let's just do a simple check or rely on what's already saved in notes/metadata if available.
        // Actually, invoking the other function is cleaner if allowed.
        const analysisRes = await base44.asServiceRole.functions.invoke('caseAnalysis', { caseId, entityName });
        if (analysisRes.data && analysisRes.data.connections && analysisRes.data.connections.length > 0) {
            connectedCasesSummary = analysisRes.data.connections.map(c => 
                `- Linked Case: ${c.case.case_number || c.case.title} (Score: ${c.score})\n  Reasons: ${c.reasons.map(r => r.label + ': ' + r.value).join(', ')}`
            ).join('\n');
        }
    } catch (e) {
        console.warn("Failed to fetch connections", e);
    }

    // 4. Construct Prompt
    const evidenceSummary = evidenceFiles.map(f => 
        `- File: ${f.filename} (${f.mime_type})\n  Summary: ${JSON.stringify(f.summary || {})}`
    ).join('\n');

    const txSummary = transactions.slice(0, 50).map(t => 
        `- ${t.timestamp} | ${t.from_address} -> ${t.to_address} | ${t.value_eth} ${t.token_symbol} | Hash: ${t.tx_hash}`
    ).join('\n');

    const prompt = `
    You are tasked with generating a comprehensive case report. Use the following inputs: case details, victim information, suspect information, and uploaded evidence.

    INPUT DATA:
    
    [Case Summary]
    Case ID: ${currentCase.case_number || caseId}
    Report Date: ${currentCase.created_date}
    Type: ${currentCase.issue_type || currentCase.fraud_type || 'Fraud'}
    Description: ${currentCase.description}
    Amount Lost: ${currentCase.amount_lost || currentCase.amount_stolen_usd || 0} ${currentCase.cryptocurrency || 'USD'}

    [Victim Details]
    Name: ${currentCase.client_name || currentCase.victim_name || 'Redacted'}
    Contact: ${currentCase.client_email || 'N/A'}, ${currentCase.phone_number || 'N/A'}
    Address: ${currentCase.victim_contact_info?.address || 'N/A'}

    [Suspect Details]
    Name: ${currentCase.scammer_info?.name || currentCase.suspect_details?.primary_suspect?.name || 'Unknown'}
    Wallets: ${(currentCase.scammer_wallet ? [currentCase.scammer_wallet] : []).concat(currentCase.scammer_info?.wallet_addresses || []).join(', ')}
    Social Media: ${(currentCase.scammer_info?.social_media || []).join(', ')}
    Known Aliases: ${(currentCase.suspect_details?.primary_suspect?.aliases || []).join(', ')}
    Contact Info: ${currentCase.scammer_info?.email || 'N/A'}, ${currentCase.scammer_info?.phone || 'N/A'}
    Websites: ${currentCase.scammer_info?.website || 'N/A'}

    [Evidence & Analysis Inputs]
    Files:
    ${evidenceSummary || "No files uploaded."}

    Blockchain Logs (Extracted Transactions):
    ${txSummary || "No transactions extracted."}

    [Connections Inputs]
    ${connectedCasesSummary}

    ----------------------------------------------------------------
    
    GENERATE A STRUCTURED REPORT INCLUDING:

    1. **Case Summary**: 
       - Include Case ID, report date, type of scam/fraud, and a brief summary of the incident.

    2. **Victim Details**: 
       - Name, contact info, and any relevant notes.

    3. **Suspect Details**: 
       - Name, wallet addresses, social media handles, known aliases, and any available contact info.

    4. **Evidence Analysis**: 
       - Extract and summarize all evidence. 
       - For blockchain/transaction logs: Parse sender, receiver, amount, date, token type, and transaction hash. 
       - For files: Include screenshots, documents, or other uploads with short descriptions of their contents.

    5. **Connections & Patterns**: 
       - Cross-reference with other cases. 
       - Highlight shared wallet addresses, repeated tactics, or suspicious patterns based on the provided connections input.

    6. **Insights & Findings**: 
       - Provide analysis from the evidence—fraud indicators, timeline of events, and notable flags.

    7. **Recommended Actions**: 
       - Suggest next steps for investigation, reporting, or risk mitigation (e.g., "File IC3", "Trace funds through Exchange X", "Block wallet 0x...").

    The report should be clear, structured, professional, and ready for internal or external review. 
    Format: Markdown.
    `;

    const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt,
        // response_json_schema: null // We want markdown text
    });

    const reportContent = typeof llmRes === 'string' ? llmRes : llmRes.content || JSON.stringify(llmRes);

    return new Response(JSON.stringify({ 
        success: true,
        report: reportContent
    }), { 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Report Generation Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});