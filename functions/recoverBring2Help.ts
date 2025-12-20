import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const searchTerms = ['bring2help2@gmail.com', 'dhgtrucking@gmail.com'];
        
        const entities = ['Conversation', 'SupportChat', 'SupportMessage', 'CommunicationLog'];
        const results = {};

        for (const entity of entities) {
            const records = await base44.asServiceRole.entities[entity].list(null, 1000);
            const matches = records.filter(r => {
                const str = JSON.stringify(r).toLowerCase();
                return searchTerms.some(t => str.includes(t.toLowerCase()));
            });
            
            if (matches.length > 0) {
                results[entity] = matches.map(m => ({id: m.id, created: m.created_date}));
            }
        }

        // Also check if they are in "AdminInvites" or similar?
        
        return Response.json({ results });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});