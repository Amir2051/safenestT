import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const targetEmail = "bring2help2@gmail.com";
        const altEmail = "Dhgtrucking@gmail.com";
        
        // 1. Try to find the user
        // Note: accessing User entity usually requires service role
        let user = null;
        try {
            const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
            if (users && users.length > 0) {
                user = users[0];
            }
        } catch (e) {
            console.error("Error finding user", e);
        }

        const userId = user ? user.id : null;
        
        // 2. Search Entities
        const entitiesToSearch = ['MyCase', 'ClientCase', 'FraudCase', 'InvestigationCase', 'ScamDatabase'];
        const results = {};

        for (const entity of entitiesToSearch) {
            try {
                // Search by email in various fields
                const queries = [
                    { client_email: targetEmail },
                    { created_by: targetEmail },
                    { created_by_email: targetEmail },
                    { victim_email: targetEmail },
                    { email: targetEmail },
                    { client_email: altEmail },
                    { created_by: altEmail },
                    { created_by_email: altEmail },
                    { victim_email: altEmail },
                    { email: altEmail }
                ];

                // If we found a user ID, search by that too
                if (userId) {
                    queries.push({ user_id: userId });
                    queries.push({ created_by: userId }); // Sometimes created_by is ID
                    queries.push({ created_by_id: userId });
                }

                // Execute queries
                // We can't do OR across all fields easily in one query with filter() usually, so we'll do them sequentially or use a broader filter if supported.
                // For now, let's just try to find ANY match.
                
                // Using a more manual approach to be safe: list recent and filter? No, too many.
                // Let's try the $or query if supported by SDK (it usually is for some adapters).
                // If not, we'll try individual queries.
                
                const orQuery = { "$or": queries };
                const found = await base44.asServiceRole.entities[entity].filter(orQuery).catch(e => []);
                
                if (found.length > 0) {
                    results[entity] = found;
                }
            } catch (e) {
                results[entity + "_error"] = e.message;
            }
        }

        return Response.json({
            user: user,
            results: results
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});