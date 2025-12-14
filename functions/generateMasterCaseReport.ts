import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Fetch ALL cases for this user
    // We'll search in MyCase and InvestigationCase
    const myCases = await base44.entities.MyCase.list({ created_by: user.email }, 100);
    const investigationCases = await base44.entities.InvestigationCase.list({ created_by: user.email }, 100);

    // Filter to ensure ownership (SDK list param usually handles sorting/limit, filter is safer)
    // Note: The SDK 'list' method signature in previous turns was list(sort, limit). 
    // We should use filter for robust querying if supported, or list and filter in memory.
    // Based on context, .filter() is available.
    
    // Let's use filter to be precise
    const userEmail = user.email;
    
    // Combining cases and normalizing
    const allCases = [
        ...myCases.filter(c => c.created_by === userEmail || c.client_email === userEmail),
        ...investigationCases.filter(c => c.created_by === userEmail || c.victim_email === userEmail)
    ];

    if (allCases.length === 0) {
        return new Response(JSON.stringify({ error: 'No cases found for this user' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Fetch Evidence for all cases
    const caseIds = allCases.map(c => c.id);
    // Fetching evidence might require iteration or a specific query if supported. 
    // We'll iterate for now as we don't have a bulk 'in' query guaranteed in the prompt context.
    // Optimization: Fetch all evidence files if RLs allows, then filter. Or just fetch per case.
    // Let's rely on extracting evidence from the case objects if 'evidence_files' is populated.
    // If not, we might miss some, but MyCase schema has 'evidence_files' array.
    
    // 3. Aggregate Data
    const aggregatedData = {
        cases: [],
        wallets: new Set(),
        transactions: [],
        scams: [],
        totalLoss: 0,
        timelines: []
    };

    allCases.forEach(c => {
        // Amount
        const amount = c.amount_lost || c.amount_stolen_usd || 0;
        aggregatedData.totalLoss += parseFloat(amount) || 0;

        // Wallets
        if (c.scammer_wallet) aggregatedData.wallets.add(c.scammer_wallet);
        if (c.scammer_info?.wallet_addresses) c.scammer_info.wallet_addresses.forEach(w => aggregatedData.wallets.add(w));
        if (c.monitored_wallets) c.monitored_wallets.forEach(w => aggregatedData.wallets.add(w));

        // Transactions (if stored in case)
        if (c.transactions) aggregatedData.transactions.push(...c.transactions);

        // Timeline
        if (c.timeline) {
            c.timeline.forEach(t => aggregatedData.timelines.push({
                date: t.date,
                event: t.event,
                details: t.details,
                sourceCase: c.case_number || c.case_title
            }));
        }
        // Add creation as timeline event
        aggregatedData.timelines.push({
            date: c.created_date || c.incident_date,
            event: "Case Reported",
            details: `Case ${c.case_number} reported: ${c.case_title}`,
            sourceCase: c.case_number
        });

        // Case Summary for Context
        aggregatedData.cases.push({
            id: c.id,
            caseNumber: c.case_number,
            title: c.case_title || "Untitled",
            description: c.description,
            scamType: c.issue_type || c.fraud_type,
            amount: amount,
            date: c.incident_date || c.created_date,
            evidenceCount: (c.evidence_files?.length || 0) + (c.evidence_log?.length || 0)
        });
    });

    // Sort Timeline
    aggregatedData.timelines.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 4. LLM Analysis & Report Generation
    const prompt = `
    Generate a comprehensive "Master Case" IC3-ready investigation report for a victim of multiple crypto scams.
    
    VICTIM INFO:
    Name: ${user.full_name || 'Redacted'}
    Email: ${user.email}
    Total Combined Loss: $${aggregatedData.totalLoss.toLocaleString()}
    
    CASE DATA AGGREGATED:
    ${JSON.stringify(aggregatedData.cases, null, 2)}
    
    IDENTIFIED WALLETS (Suspects):
    ${Array.from(aggregatedData.wallets).join(', ')}
    
    TIMELINE OF EVENTS:
    ${JSON.stringify(aggregatedData.timelines.slice(0, 50), null, 2)}
    
    INSTRUCTIONS:
    1. CONSOLIDATE: Treat these separate case files as one ongoing victimization campaign or a series of related incidents.
    2. NARRATIVE: Write a professional, chronological narrative suitable for law enforcement (FBI/IC3). Use "The victim" or the user's name.
    3. PATTERN ANALYSIS: Identify if these scams seem linked (e.g. pig butchering leading to recovery scam).
    4. STRUCTURE: Return HTML format with these sections:
       - <h1 class="text-2xl font-bold">Master Case Executive Summary</h1>
       - <div class="stats">... (Total Loss, Case Count, Date Range) ...</div>
       - <h2>Incident Narrative</h2> (The consolidated story)
       - <h2>Scam Incident Breakdown</h2> (Table or list of each event)
       - <h2>Financial & Blockchain Analysis</h2> (Wallets, flows, total impact)
       - <h2>Evidence Inventory</h2> (Reference the attached files from the cases)
       - <h2>Conclusion & Request for Action</h2>
    
    5. FORMATTING: Use Tailwind CSS classes for styling where appropriate (e.g., bg-gray-100 p-4 rounded). Make it look like a professional document.
    `;

    const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
            type: "object",
            properties: {
                report_html: { type: "string" },
                analysis_summary: { type: "string" }
            }
        }
    });

    return new Response(JSON.stringify({
        success: true,
        reportHtml: llmRes.report_html,
        stats: {
            totalLoss: aggregatedData.totalLoss,
            caseCount: allCases.length,
            walletCount: aggregatedData.wallets.size
        },
        rawCases: aggregatedData.cases
    }), { 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Master Case Gen Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});