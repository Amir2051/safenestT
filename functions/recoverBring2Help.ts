import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Search by Date (User creation date)
        const startDate = "2025-11-22T00:00:00.000Z";
        const endDate = "2025-11-24T23:59:59.999Z";
        
        const dateCases = await base44.asServiceRole.entities.MyCase.filter({ 
            created_date: { $gte: startDate, $lte: endDate }
        });

        // 2. Search by Name Patterns
        const allCases = await base44.asServiceRole.entities.MyCase.list(null, 2000);
        const nameMatches = allCases.filter(c => {
            const name = (c.client_name || '').toLowerCase();
            const desc = (c.description || '').toLowerCase();
            const email = (c.client_email || '').toLowerCase();
            return name.includes('dhg') || name.includes('trucking') || 
                   email.includes('dhg') || email.includes('bring') ||
                   desc.includes('bring2help') || desc.includes('dhg');
        });

        return Response.json({ 
            dateCases: dateCases.map(c => ({id: c.id, email: c.client_email, name: c.client_name, date: c.created_date})),
            nameMatches: nameMatches.map(c => ({id: c.id, email: c.client_email, name: c.client_name}))
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});