import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Search cases created around Nov 23, 2025
        const startDate = "2025-11-20T00:00:00.000Z";
        const endDate = "2025-11-30T23:59:59.999Z";
        
        // We can't always filter by date range easily with simple filter object if backend doesn't support operators
        // But we can list and filter.
        // Let's list a larger batch and filter by date.
        
        const allCases = await base44.asServiceRole.entities.MyCase.list('-created_date', 500);
        
        const matches = allCases.filter(c => {
            return c.created_date >= startDate && c.created_date <= endDate;
        });
        
        // Also check specifically for "bring" in any field
        const stringMatches = allCases.filter(c => {
            const str = JSON.stringify(c).toLowerCase();
            return str.includes("bring") || str.includes("dhg");
        });

        return Response.json({
            date_matches_count: matches.length,
            string_matches: stringMatches,
            first_date_match: matches[0] || null
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});