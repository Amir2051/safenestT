import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
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

    // 1. Get current case
    let currentCase = null;
    let foundEntity = entityName;

    const entitiesToTry = entityName ? [entityName] : ['MyCase', 'InvestigationCase', 'ClientCase', 'FraudCase'];
    
    for (const entity of entitiesToTry) {
        if (base44.entities[entity]) {
            try {
                const cases = await base44.entities[entity].filter({ id: caseId });
                if (cases && cases.length > 0) {
                    currentCase = cases[0];
                    foundEntity = entity;
                    break;
                }
            } catch (e) {
                console.warn(`Failed to fetch from ${entity}`, e);
            }
        }
    }
    
    if (!currentCase) {
        return new Response(JSON.stringify({ error: `Case not found. Searched in: ${entitiesToTry.join(', ')}` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Prepare data for LLM
    const evidenceList = (currentCase.evidence_files || []).map(f => f.name).join(', ');
    const timelineEvents = (currentCase.timeline || []).map(e => `${e.date}: ${e.event}`).join('\n');
    const monitoredWallets = (currentCase.monitored_wallets || []).join(', ');

    const prompt = `
    Generate a concise, professional executive summary for this fraud investigation case.
    The summary should be 2-3 sentences long, highlighting the key facts: what happened, amount lost, current status, and any key findings (like traced wallets or identified suspects).
    
    Case Details:
    Title: ${currentCase.case_title || currentCase.case_number || 'Untitled'}
    Description: ${currentCase.description || 'No description provided.'}
    Amount Lost: ${currentCase.amount_lost || currentCase.amount_stolen_usd || 0} ${currentCase.cryptocurrency || 'USD'}
    Status: ${currentCase.status}
    
    Key Evidence:
    Files: ${evidenceList || 'None'}
    Monitored Wallets: ${monitoredWallets || 'None'}
    
    Timeline Highlights:
    ${timelineEvents.slice(0, 500) || 'No timeline events'}
    
    Suspect Info:
    ${JSON.stringify(currentCase.scammer_info || {})}
    
    Output ONLY the summary text, no preamble.
    `;

    const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt,
    });
    
    const summary = typeof llmRes === 'string' ? llmRes : llmRes.content || JSON.stringify(llmRes);

    // Update the case with the new summary
    await base44.entities[foundEntity].update(caseId, {
        ai_analysis: summary,
        last_activity: new Date().toISOString()
    });

    return new Response(JSON.stringify({ 
        success: true,
        summary
    }), { 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}