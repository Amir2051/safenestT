import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const targetEmail = 'bring2help2@gmail.com';
        
        // 1. Get User Details
        const users = await base44.asServiceRole.entities.User.list(null, 1000);
        const user = users.find(u => u.email?.toLowerCase() === targetEmail);
        
        if (!user) {
            return Response.json({ error: "User not found" });
        }

        // 2. Define Search Terms based on user profile
        const searchTerms = [
            targetEmail,
            user.id,
            user.full_name,
            user.phone_number, // if exists
            'dhg',
            'bring2help'
        ].filter(Boolean).map(t => t.toLowerCase());

        // 3. Broad Entity Search
        const entities = [
            'MyCase', 'FraudCase', 'ClientCase', 'InvestigationCase', 
            'ScamDatabase', 'CyberFraudProfile', 'Report', 'Feedback', 
            'Alert', 'Conversation', 'SupportChat', 'SupportMessage', 
            'Referral', 'CommunicationLog', 'MasterCase'
        ];
        
        const results = {};

        for (const entity of entities) {
            try {
                const records = await base44.asServiceRole.entities[entity].list(null, 1000);
                
                const matches = records.filter(record => {
                    const str = JSON.stringify(record).toLowerCase();
                    return searchTerms.some(term => str.includes(term));
                });

                if (matches.length > 0) {
                    results[entity] = matches.map(m => ({
                        id: m.id,
                        summary: JSON.stringify(m).substring(0, 200) // Brief preview
                    }));
                }
            } catch (e) {
                // Ignore errors for entities that might not exist or deny access
                console.log(`Error scanning ${entity}: ${e.message}`);
            }
        }

        return Response.json({ 
            success: true, 
            user,
            searchTerms,
            results
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});