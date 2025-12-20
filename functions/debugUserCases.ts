import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const email = "Dhgtrucking@gmail.com";
        
        let user = null;
        try {
            const users = await base44.asServiceRole.entities.User.filter({ email: email });
            if (users && users.length > 0) {
                user = users[0];
            }
        } catch (e) {}

        return Response.json({
            user: user
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});