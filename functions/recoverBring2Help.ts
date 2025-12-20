import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const emails = ['bring2help2@gmail.com', 'Dhgtrucking@gmail.com', 'dhgtrucking@gmail.com'];
        const phones = ['+16103907497', '6103907497', '16103907497'];
        
        // 1. Check Counts
        const allCases = await base44.asServiceRole.entities.MyCase.list(null, 1);
        const totalEstimate = 1000; // Assumption for now, but list limit is what matters

        // 2. Direct Filter Search (More reliable than memory scan if pagination is issue)
        // We have to try multiple filters because OR is tricky in some SDK versions, let's do parallel
        
        const queries = [];
        
        // Email fields
        for (const email of emails) {
            queries.push(base44.asServiceRole.entities.MyCase.filter({ client_email: email }));
            queries.push(base44.asServiceRole.entities.MyCase.filter({ created_by: email }));
            queries.push(base44.asServiceRole.entities.MyCase.filter({ created_by_email: email }));
        }

        // Phone fields
        for (const phone of phones) {
            queries.push(base44.asServiceRole.entities.MyCase.filter({ phone_number: phone }));
            // Phone might be in victim_contact_info object, hard to filter via API for nested, rely on memory scan for that
        }

        const results = await Promise.all(queries);
        const found = results.flat();
        
        // Deduplicate
        const unique = {};
        found.forEach(c => unique[c.id] = c);
        const uniqueCases = Object.values(unique);

        return Response.json({ 
            count: uniqueCases.length,
            cases: uniqueCases.map(c => ({
                id: c.id,
                created_date: c.created_date,
                client_email: c.client_email,
                created_by: c.created_by,
                description: (c.description || '').substring(0, 50)
            }))
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});