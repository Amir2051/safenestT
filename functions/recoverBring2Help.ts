import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const entities = ['MyCase', 'FraudCase', 'ClientCase', 'InvestigationCase'];
        const searchTerms = [
            'bring2help', 
            'dhg', 
            '6103907497', 
            'bring2help2@gmail.com', 
            'dhgtrucking@gmail.com'
        ];
        
        const results = {};

        for (const entity of entities) {
            // Fetch all records (limit 1000 per entity should be enough for now)
            const records = await base44.asServiceRole.entities[entity].list(null, 1000);
            
            const matches = records.filter(record => {
                const str = JSON.stringify(record).toLowerCase();
                return searchTerms.some(term => str.includes(term.toLowerCase()));
            });

            if (matches.length > 0) {
                results[entity] = matches.map(m => ({
                    id: m.id,
                    email: m.client_email || m.created_by || m.created_by_email,
                    description: m.description || m.case_title,
                    created_date: m.created_date
                }));
            }
        }

        return Response.json({ 
            success: true, 
            results
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});