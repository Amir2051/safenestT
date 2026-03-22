import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user.role !== 'admin' && !user.is_admin) {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        // EMERGENCY RECOVERY - Fix ALL broken case-user relationships
        console.log("🚨 EMERGENCY CASE RECOVERY INITIATED");

        // 1. Fetch ALL cases and users
        const allCases = await base44.asServiceRole.entities.MyCase.list(null, 10000);
        const allUsers = await base44.asServiceRole.entities.User.list(null, 10000);

        console.log(`📊 Scanned: ${allCases.length} cases, ${allUsers.length} users`);

        // 2. Build user lookup maps (case-insensitive)
        const userByEmail = {};
        const userById = {};
        allUsers.forEach(u => {
            if (u.email) {
                userByEmail[u.email.toLowerCase().trim()] = u;
            }
            if (u.id) {
                userById[u.id] = u;
            }
        });

        // 3. Process each case
        let fixed = 0;
        let orphaned = 0;
        const fixedCases = [];

        for (const caseRecord of allCases) {
            let targetUser = null;
            let updates = {};

            // Strategy 1: Match by user_id
            if (caseRecord.user_id && userById[caseRecord.user_id]) {
                targetUser = userById[caseRecord.user_id];
            }

            // Strategy 2: Match by created_by
            if (!targetUser && caseRecord.created_by) {
                const email = caseRecord.created_by.toLowerCase().trim();
                targetUser = userByEmail[email];
            }

            // Strategy 3: Match by client_email
            if (!targetUser && caseRecord.client_email) {
                const email = caseRecord.client_email.toLowerCase().trim();
                targetUser = userByEmail[email];
            }

            // Strategy 4: Match by created_by_email
            if (!targetUser && caseRecord.created_by_email) {
                const email = caseRecord.created_by_email.toLowerCase().trim();
                targetUser = userByEmail[email];
            }

            // Strategy 5: Match by created_by_id (built-in field)
            if (!targetUser && caseRecord.created_by_id && userById[caseRecord.created_by_id]) {
                targetUser = userById[caseRecord.created_by_id];
            }

            if (targetUser) {
                // CRITICAL: Ensure ALL ownership fields are set correctly
                const needsUpdate = 
                    caseRecord.user_id !== targetUser.id ||
                    caseRecord.created_by !== targetUser.email ||
                    caseRecord.client_email !== targetUser.email ||
                    caseRecord.created_by_email !== targetUser.email ||
                    !caseRecord.status;

                if (needsUpdate) {
                    updates = {
                        user_id: targetUser.id,
                        created_by: targetUser.email,
                        client_email: targetUser.email,
                        created_by_email: targetUser.email,
                        status: caseRecord.status || 'Pending'
                    };

                    // Set name if missing
                    if (!caseRecord.client_name && targetUser.full_name) {
                        updates.client_name = targetUser.full_name;
                    }

                    await base44.asServiceRole.entities.MyCase.update(caseRecord.id, updates);
                    fixed++;
                    fixedCases.push({
                        case_number: caseRecord.case_number,
                        user_email: targetUser.email,
                        fixed_fields: Object.keys(updates)
                    });
                }
            } else {
                orphaned++;
                console.warn(`⚠️ ORPHANED CASE: ${caseRecord.case_number} - No matching user found`);
            }
        }

        console.log(`✅ Recovery Complete: ${fixed} cases fixed, ${orphaned} orphaned`);

        return Response.json({
            success: true,
            total_cases: allCases.length,
            total_users: allUsers.length,
            cases_fixed: fixed,
            orphaned_cases: orphaned,
            fixed_details: fixedCases,
            message: `🚨 EMERGENCY RECOVERY COMPLETE\n\nScanned: ${allCases.length} cases\nFixed: ${fixed} cases\nOrphaned: ${orphaned} cases\n\nAll users should now see their cases.`
        });

    } catch (error) {
        console.error("❌ Emergency recovery failed:", error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});