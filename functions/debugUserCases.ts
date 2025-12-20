import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Search by phone
        const phone = "6103907497"; // from user record
        const phoneFormatted = "+16103907497";
        
        const allCases = await base44.asServiceRole.entities.MyCase.list('-created_date', 1000);
        
        const matches = allCases.filter(c => {
            const p = c.phone_number || "";
            return p.includes(phone) || p.includes(phoneFormatted);
        });

        // Search in ALL entities for the email
        const entities = ['MyCase', 'FraudCase', 'InvestigationCase', 'ClientCase', 'ScamDatabase', 'MasterCase'];
        const globalMatches = {};
        
        for (const ent of entities) {
             const items = await base44.asServiceRole.entities[ent].list('-created_date', 500);
             const found = items.filter(i => {
                 const s = JSON.stringify(i).toLowerCase();
                 return s.includes("bring2help") || s.includes("dhgtrucking");
             });
             if (found.length > 0) {
                 globalMatches[ent] = found.map(f => ({id: f.id, created_date: f.created_date}));
             }
        }

        return Response.json({
            phone_matches: matches,
            global_matches: globalMatches
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});