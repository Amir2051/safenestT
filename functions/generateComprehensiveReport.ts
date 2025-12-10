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
    Generate a Comprehensive Investigation Report for the following case.
    The report must be professional, structured, and detailed, suitable for law enforcement or internal review.

    CASE DETAILS:
    ID: ${currentCase.case_number || caseId}
    Title: ${currentCase.case_title || 'Untitled'}
    Date Reported: ${currentCase.created_date}
    Type: ${currentCase.issue_type || currentCase.fraud_type || 'Fraud'}
    Status: ${currentCase.status}
    Description: ${currentCase.description}
    Amount Lost: ${currentCase.amount_lost || currentCase.amount_stolen_usd || 0} ${currentCase.cryptocurrency || 'USD'}

    VICTIM DETAILS:
    Name: ${currentCase.client_name || currentCase.victim_name || 'Redacted'}
    Email: ${currentCase.client_email || currentCase.victim_email || 'Redacted'}
    Phone: ${currentCase.phone_number || currentCase.victim_phone || 'Redacted'}
    Address: ${currentCase.victim_contact_info?.address || 'N/A'}

    SUSPECT DETAILS:
    Name: ${currentCase.scammer_info?.name || currentCase.suspect_details?.primary_suspect?.name || 'Unknown'}
    Email: ${currentCase.scammer_info?.email || 'Unknown'}
    Phone: ${currentCase.scammer_info?.phone || 'Unknown'}
    Wallet Addresses: ${(currentCase.scammer_wallet ? [currentCase.scammer_wallet] : []).concat(currentCase.scammer_info?.wallet_addresses || []).join(', ')}
    Websites: ${currentCase.scammer_info?.website || 'N/A'}
    
    EVIDENCE & ANALYSIS:
    Files Uploaded:
    ${evidenceSummary || "No files uploaded."}

    Blockchain Analysis (First 50 transactions extracted):
    ${txSummary || "No transactions extracted."}

    CONNECTIONS & PATTERNS:
    ${connectedCasesSummary}

    INSTRUCTIONS:
    Generate a report with the following Markdown sections:
    1. **Case Summary**: Brief overview of the incident.
    2. **Victim Details**: Contact info and relevant notes.
    3. **Suspect Details**: All known identifiers (wallets, emails, aliases).
    4. **Evidence Analysis**: Summarize the findings from files and blockchain data. specificy key transaction flows.
    5. **Connections & Patterns**: Highlight links to other cases or known scam patterns.
    6. **Insights & Findings**: Professional assessment of the fraud type and indicators.
    7. **Recommended Actions**: Concrete next steps (e.g., "File IC3", "Monitor Wallet 0x...", "Contact Exchange X").

    Tone: Professional, Objective, Analytical.
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