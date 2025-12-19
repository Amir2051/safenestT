import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Fetch all users using service role (bypassing RLS)
        // We need service role to update other users
        const users = await base44.asServiceRole.entities.User.list(null, 1000);
        
        let updatedCount = 0;
        const updates = [];

        for (const user of users) {
            // Only update if not already active or if approved attributes are missing
            if (user.account_status !== 'active') {
                updates.push(
                    base44.asServiceRole.entities.User.update(user.id, {
                        account_status: 'active',
                        approved_at: new Date().toISOString(),
                        approved_by: 'system_migration_script'
                    })
                );
                updatedCount++;
            }
        }

        // Execute updates in parallel
        await Promise.all(updates);

        return Response.json({ 
            success: true, 
            message: `Successfully approved ${updatedCount} users.`,
            total_users: users.length,
            updated_count: updatedCount
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});