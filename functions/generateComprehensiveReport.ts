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
    You are an AI investigator. Your task is to generate a full case report using the following inputs: case details, victim information, suspect information, and uploaded evidence files (documents, transaction logs, screenshots, wallet addresses, etc.). Follow these instructions exactly:

    INPUT CONTEXT:
    
    [Case Details]
    ID: ${currentCase.case_number || caseId}
    Date: ${currentCase.created_date}
    Type: ${currentCase.issue_type || currentCase.fraud_type || 'Fraud'}
    Description: ${currentCase.description}
    Amount: ${currentCase.amount_lost || currentCase.amount_stolen_usd || 0} ${currentCase.cryptocurrency || 'USD'}

    [Victim Details]
    Name: ${currentCase.client_name || currentCase.victim_name || 'Redacted'}
    Contact: ${currentCase.client_email || 'N/A'}, ${currentCase.phone_number || 'N/A'}
    Notes: ${currentCase.victim_contact_info?.address || ''} ${currentCase.notes || ''}

    [Suspect Details]
    Name: ${currentCase.scammer_info?.name || currentCase.suspect_details?.primary_suspect?.name || 'Unknown'}
    Wallets: ${(currentCase.scammer_wallet ? [currentCase.scammer_wallet] : []).concat(currentCase.scammer_info?.wallet_addresses || []).join(', ')}
    Social: ${(currentCase.scammer_info?.social_media || []).join(', ')}
    Aliases: ${(currentCase.suspect_details?.primary_suspect?.aliases || []).join(', ')}
    Contact: ${currentCase.scammer_info?.email || 'N/A'}, ${currentCase.scammer_info?.phone || 'N/A'}

    [Evidence Files & Content]
    ${evidenceSummary || "No files uploaded."}

    [Blockchain Logs / Transactions]
    ${txSummary || "No transactions extracted."}

    [Cross-Reference Connections]
    ${connectedCasesSummary}

    ----------------------------------------------------------------

    Parse Evidence:
    For blockchain/transaction files (Etherscan CSV, JSON, or logs), extract: sender, receiver, amount, date, token type, transaction hash.
    For documents/screenshots, summarize the content and highlight relevant data (wallets, amounts, usernames, communications).
    Match any extracted wallet addresses with the victim-reported scammer wallets.

    Generate Report Sections:
    Case Summary: Case ID, date reported, scam type, brief description.
    Victim Details: Name, contact info, notes.
    Suspect Details: Name, wallet addresses, social media handles, known aliases, contact info.
    Evidence Summary: List each evidence item, its type, and a short summary including any relevant extracted details.
    Connections & Patterns: Automatically cross-reference suspect wallet addresses or other identifiers with existing cases; highlight matches and patterns.
    Insights & Findings: Analyze the evidence and connections; identify suspicious activity, fraud indicators, or notable flags.
    Recommended Actions: Suggest next steps (e.g., investigation, reporting, freezing assets, contacting authorities).

    Format Output:
    Output as a structured report ready to share internally or with authorities.
    Include all parsed data, matched connections, and relevant findings clearly.
    Always ensure the report is accurate, professional, and includes everything extracted from evidence, even if partial or incomplete.
    
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