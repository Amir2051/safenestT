import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Fetch ALL data (Cases and Users)
        const cases = await base44.asServiceRole.entities.MyCase.list(null, 5000);
        const users = await base44.asServiceRole.entities.User.list(null, 5000);

        let updatedCount = 0;
        let reLinked = 0;
        let bring2helpFound = false;
        let bring2helpCases = 0;

        // Map users by normalized email
        const userMap = {};
        users.forEach(u => {
            if (u.email) userMap[u.email.toLowerCase().trim()] = u;
        });
        
        const targetEmail = "bring2help2@gmail.com";
        const targetUser = userMap[targetEmail];

        if (targetUser) {
            console.log("Target user found:", targetUser.id);
        } else {
            console.log("Target user NOT found in map!");
        }

        const updatesToRun = [];

        for (const c of cases) {
            let updates = {};
            let needsUpdate = false;
            let targetEmailFound = null;

            // Check if this case is related to bring2help2
            const isTarget = JSON.stringify(c).toLowerCase().includes("bring2help") || JSON.stringify(c).toLowerCase().includes("dhg");
            if (isTarget) {
                bring2helpFound = true;
                bring2helpCases++;
                console.log("Found candidate case:", c.id, c.client_email, c.created_by);
            }

            // 1. Try to find user by created_by
            if (c.created_by && typeof c.created_by === 'string') {
                const match = userMap[c.created_by.toLowerCase().trim()];
                if (match) targetEmailFound = match.email;
            }

            // 2. If not found, try client_email
            if (!targetEmailFound && c.client_email && typeof c.client_email === 'string') {
                const match = userMap[c.client_email.toLowerCase().trim()];
                if (match) targetEmailFound = match.email;
            }

            // 3. If not found, try created_by_email
            if (!targetEmailFound && c.created_by_email && typeof c.created_by_email === 'string') {
                const match = userMap[c.created_by_email.toLowerCase().trim()];
                if (match) targetEmailFound = match.email;
            }

            // Apply Email & User ID Fixes
            if (targetEmailFound) {
                const tUser = userMap[targetEmailFound.toLowerCase().trim()];
                if (tUser && c.user_id !== tUser.id) {
                    updates.user_id = tUser.id;
                    needsUpdate = true;
                }

                if (c.created_by !== targetEmailFound) { updates.created_by = targetEmailFound; needsUpdate = true; }
                if (c.created_by_email !== targetEmailFound) { updates.created_by_email = targetEmailFound; needsUpdate = true; }
                
                // Only update client_email if it was the source of the match? 
                // The original script updates client_email to targetEmail. This might overwrite if client_email was different but mapped to user?
                // Original logic: if (c.client_email !== targetEmail) { updates.client_email = targetEmail; needsUpdate = true; }
                // Let's stick to original logic to be safe/consistent.
                if (c.client_email !== targetEmailFound) { updates.client_email = targetEmailFound; needsUpdate = true; }

                if (needsUpdate) reLinked++;
            }

            if (needsUpdate) {
                // If it's the target user, log specifically
                if (targetEmailFound === targetEmail) {
                    console.log(`Fixing case ${c.id} for bring2help2`);
                }
                updatesToRun.push(base44.asServiceRole.entities.MyCase.update(c.id, updates));
                updatedCount++;
            }
        }

        await Promise.all(updatesToRun);

        return Response.json({ 
            success: true, 
            message: `Recovery Complete.`,
            details: { 
                total_cases: cases.length, 
                updated: updatedCount,
                bring2help_cases_found: bring2helpCases
            }
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});