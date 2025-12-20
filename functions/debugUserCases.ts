import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const entities = ['Conversation', 'SupportChat', 'SupportMessage', 'Referral', 'CommunicationLog'];
        const results = {};
        
        for (const ent of entities) {
             try {
                // Search by user_id if applicable, or just list and grep
                const items = await base44.asServiceRole.entities[ent].list('-created_date', 500);
                const found = items.filter(i => {
                    const s = JSON.stringify(i).toLowerCase();
                    return s.includes("bring2help") || s.includes("dhg") || s.includes("6103907497");
                });
                if (found.length > 0) {
                    results[ent] = found;
                }
             } catch (e) {}
        }

        return Response.json({
            results: results
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});