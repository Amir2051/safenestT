import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const startDate = "2025-12-19T00:00:00.000Z";
        const endDate = "2025-12-19T23:59:59.999Z";
        
        const allCases = await base44.asServiceRole.entities.MyCase.list('-created_date', 1000);
        
        const matches = allCases.filter(c => {
            return c.created_date >= startDate && c.created_date <= endDate;
        });
        
        return Response.json({
            count: matches.length,
            cases: matches.map(c => ({
                id: c.id,
                created_date: c.created_date,
                client_name: c.client_name,
                client_email: c.client_email,
                phone: c.phone_number
            }))
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});