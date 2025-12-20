import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const emails = ['bring2help2@gmail.com', 'Dhgtrucking@gmail.com'];
        // Also try lowercase
        const searchEmails = [...emails, ...emails.map(e => e.toLowerCase())];
        
        const entities = ['FraudCase', 'ClientCase', 'InvestigationCase', 'Report', 'ScamDatabase'];
        const results = {};

        for (const entity of entities) {
            const queries = [];
            for (const email of searchEmails) {
                // Try different field names depending on entity
                if (entity === 'ScamDatabase') {
                    queries.push(base44.asServiceRole.entities[entity].filter({ reported_by: email })); // Check schema?
                    // Schema says: reported_by enum? No, just string maybe? Schema says enum: user, ai, admin...
                    // So probably created_by?
                    queries.push(base44.asServiceRole.entities[entity].filter({ created_by: email }));
                } else {
                    queries.push(base44.asServiceRole.entities[entity].filter({ client_email: email }));
                    queries.push(base44.asServiceRole.entities[entity].filter({ created_by: email }));
                    queries.push(base44.asServiceRole.entities[entity].filter({ created_by_email: email }));
                    // FraudCase specific
                    if (entity === 'FraudCase') {
                         // victim_contact_info is object, can't filter nested easily usually.
                    }
                }
            }
            
            try {
                const res = await Promise.all(queries);
                const found = res.flat();
                if (found.length > 0) {
                    results[entity] = found.map(f => ({ id: f.id, created: f.created_date }));
                }
            } catch(e) {
                console.log(`Error filtering ${entity}: ${e.message}`);
            }
        }

        return Response.json({ results });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});