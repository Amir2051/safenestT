import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const results = {};
        
        // 1. Search by Name Patterns
        const namePatterns = ["bring", "help", "Dhg", "trucking"];
        const entity = 'MyCase';
        
        // Get recent cases first to inspect
        const recentCases = await base44.asServiceRole.entities[entity].list('-created_date', 20);
        results.recent_cases = recentCases.map(c => ({
            id: c.id,
            client_name: c.client_name,
            client_email: c.client_email,
            created_by: c.created_by,
            created_by_email: c.created_by_email,
            user_id: c.user_id
        }));

        // 2. Search for name matches (client-side filtering as filter() is exact match often)
        // Note: SDK filter is exact match usually, so we rely on listing and filtering in memory if we can't do regex.
        // We'll filter the recent 100 cases.
        const allRecent = await base44.asServiceRole.entities[entity].list('-created_date', 100);
        
        results.matches = allRecent.filter(c => {
            const str = JSON.stringify(c).toLowerCase();
            return namePatterns.some(p => str.includes(p.toLowerCase()));
        });

        return Response.json({
            results: results
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});