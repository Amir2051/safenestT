import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Fetch direct scam reports
        // Using asServiceRole to ensure we get everything if RLS is restrictive, 
        // though ScamDatabase RLS says read: true.
        const scams = await base44.asServiceRole.entities.ScamDatabase.list('-created_date', 500);
        
        // 2. Fetch Investigation Cases (MyCase)
        // Must use service role to access cases not owned by the requester (if we want a global view)
        // We will sanitize this data before returning it.
        const cases = await base44.asServiceRole.entities.MyCase.list('-created_date', 500);
        
        // 3. Transform Cases to Scam Format
        const caseReports = cases
            .filter(c => 
                // Only include if there's an actionable identifier
                (c.scammer_wallet && c.scammer_wallet.length > 5) || 
                (c.scammer_info?.website && c.scammer_info.website.length > 3) ||
                (c.scammer_info?.phone && c.scammer_info.phone.length > 5) ||
                (c.scammer_info?.email && c.scammer_info.email.length > 5)
            )
            .map(c => {
                // Determine primary identifier
                let identifier = c.scammer_wallet;
                let type = 'wallet';
                
                if (!identifier && c.scammer_info?.website) {
                    identifier = c.scammer_info.website;
                    type = 'website';
                } else if (!identifier && c.scammer_info?.email) {
                    identifier = c.scammer_info.email;
                    type = 'email';
                }
                
                return {
                    id: `case_${c.id}`,
                    source: 'case',
                    scam_type: type, // Map to enum if needed, or keep generic
                    identifier: identifier,
                    blockchain: c.blockchain || 'n/a',
                    risk_level: (c.urgency || 'medium').toLowerCase(),
                    scam_description: c.description,
                    victim_count: 1,
                    total_stolen_usd: c.amount_lost || c.amount_stolen_usd || 0,
                    first_reported: c.created_date,
                    verified: c.status === 'Resolved' || c.status === 'Verified',
                    status: 'active',
                    case_title: c.case_title || c.case_number, // Extra field for UI
                    original_case_id: c.id
                };
            });

        // 4. Transform Direct Reports to Unified Format
        const directReports = scams.map(s => ({
            ...s,
            source: 'report',
            id: `report_${s.id}`,
            original_report_id: s.id
        }));

        // 5. Merge and Deduplicate (Optional: could dedup by identifier)
        // For now, we simply concat. UI can handle grouping if needed.
        const merged = [...directReports, ...caseReports].sort((a, b) => 
            new Date(b.first_reported).getTime() - new Date(a.first_reported).getTime()
        );

        return Response.json({
            success: true,
            data: merged
        });

    } catch (error) {
        console.error("Error fetching public scams:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});