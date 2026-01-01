import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
        }

        const { action } = await req.json();

        if (action === 'full_audit') {
            console.log('🚨 P0 INCIDENT: Starting full system audit...');

            // STEP 1: Raw database counts (bypassing all RLS)
            const allUsers = await base44.asServiceRole.entities.User.list(null, 10000);
            const allCases = await base44.asServiceRole.entities.MyCase.list(null, 10000);
            
            console.log(`📊 RAW DATA: ${allCases.length} total cases in database`);
            console.log(`👥 RAW DATA: ${allUsers.length} total users in database`);

            // STEP 2: Check what ADMIN can see with normal query (RLS applied)
            const adminVisibleCases = await base44.entities.MyCase.list(null, 10000);
            console.log(`👀 ADMIN VIEW: ${adminVisibleCases.length} cases visible to admin (should be ${allCases.length})`);

            // STEP 3: Analyze each case for visibility issues
            const issues = [];
            const userMap = {};
            allUsers.forEach(u => {
                userMap[u.email?.toLowerCase()] = u;
                userMap[u.id] = u;
            });

            for (const c of allCases) {
                const problems = [];
                
                // Check ownership fields
                if (!c.user_id) problems.push('MISSING_USER_ID');
                if (!c.created_by) problems.push('MISSING_CREATED_BY');
                if (!c.client_email) problems.push('MISSING_CLIENT_EMAIL');
                if (!c.created_by_email) problems.push('MISSING_CREATED_BY_EMAIL');
                
                // Check user existence
                const owner = userMap[c.user_id] || userMap[c.created_by?.toLowerCase()] || userMap[c.client_email?.toLowerCase()];
                if (!owner) problems.push('USER_NOT_FOUND');
                
                // Check if case is visible to admin
                const visibleToAdmin = adminVisibleCases.some(ac => ac.id === c.id);
                if (!visibleToAdmin) problems.push('NOT_VISIBLE_TO_ADMIN');
                
                // Check status
                if (!c.status) problems.push('NO_STATUS');
                if (c.status === 'deleted' || c.status === 'archived') problems.push('SOFT_DELETED');
                
                if (problems.length > 0) {
                    issues.push({
                        case_id: c.id,
                        case_number: c.case_number,
                        problems,
                        user_id: c.user_id,
                        created_by: c.created_by,
                        client_email: c.client_email,
                        status: c.status,
                        amount: c.amount_lost
                    });
                }
            }

            // STEP 4: User visibility check
            const userVisibilityIssues = [];
            for (const u of allUsers) {
                if (u.account_status !== 'active') continue;
                
                const userCases = allCases.filter(c => 
                    c.user_id === u.id ||
                    c.created_by?.toLowerCase() === u.email?.toLowerCase() ||
                    c.client_email?.toLowerCase() === u.email?.toLowerCase() ||
                    c.created_by_email?.toLowerCase() === u.email?.toLowerCase()
                );

                if (userCases.length > 0) {
                    // Simulate what user would see
                    try {
                        // This is a limitation - we can't actually impersonate, but we can check fields
                        const shouldSee = userCases.length;
                        userVisibilityIssues.push({
                            user_email: u.email,
                            expected_cases: shouldSee,
                            case_ids: userCases.map(c => c.case_number)
                        });
                    } catch (e) {
                        console.error(`Failed to check visibility for ${u.email}:`, e);
                    }
                }
            }

            return Response.json({
                success: true,
                timestamp: new Date().toISOString(),
                audit_results: {
                    total_cases_in_db: allCases.length,
                    total_users: allUsers.length,
                    admin_visible_cases: adminVisibleCases.length,
                    visibility_gap: allCases.length - adminVisibleCases.length,
                    cases_with_issues: issues.length,
                    issues: issues,
                    user_visibility: userVisibilityIssues,
                    total_reported_losses: allCases.reduce((sum, c) => sum + (c.amount_lost || 0), 0)
                },
                severity: issues.length > 0 ? 'CRITICAL' : 'OK'
            });
        }

        if (action === 'force_fix_all') {
            console.log('🔧 P0 INCIDENT: Force fixing ALL cases...');

            const allUsers = await base44.asServiceRole.entities.User.list(null, 10000);
            const allCases = await base44.asServiceRole.entities.MyCase.list(null, 10000);
            
            const userMap = {};
            allUsers.forEach(u => {
                if (u.email) userMap[u.email.toLowerCase()] = u;
                if (u.id) userMap[u.id] = u;
            });

            let fixed = 0;
            const errors = [];

            for (const c of allCases) {
                try {
                    const updates = {};
                    let needsUpdate = false;

                    // Find the owner
                    let owner = null;
                    if (c.user_id && userMap[c.user_id]) {
                        owner = userMap[c.user_id];
                    } else if (c.created_by && userMap[c.created_by.toLowerCase()]) {
                        owner = userMap[c.created_by.toLowerCase()];
                    } else if (c.client_email && userMap[c.client_email.toLowerCase()]) {
                        owner = userMap[c.client_email.toLowerCase()];
                    } else if (c.created_by_email && userMap[c.created_by_email.toLowerCase()]) {
                        owner = userMap[c.created_by_email.toLowerCase()];
                    }

                    if (!owner) {
                        errors.push({ case_id: c.id, error: 'NO_OWNER_FOUND' });
                        continue;
                    }

                    // Fix ALL ownership fields
                    if (c.user_id !== owner.id) {
                        updates.user_id = owner.id;
                        needsUpdate = true;
                    }
                    if (c.created_by !== owner.email) {
                        updates.created_by = owner.email;
                        needsUpdate = true;
                    }
                    if (c.client_email !== owner.email) {
                        updates.client_email = owner.email;
                        needsUpdate = true;
                    }
                    if (c.created_by_email !== owner.email) {
                        updates.created_by_email = owner.email;
                        needsUpdate = true;
                    }

                    // Fix status
                    if (!c.status || c.status === 'deleted' || c.status === 'archived') {
                        updates.status = 'Pending';
                        needsUpdate = true;
                    }

                    // Fix dates
                    if (!c.created_date || c.created_date === 'Invalid Date') {
                        updates.created_date = new Date().toISOString();
                        needsUpdate = true;
                    }

                    // Ensure last_activity
                    if (!c.last_activity) {
                        updates.last_activity = c.updated_date || c.created_date || new Date().toISOString();
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        await base44.asServiceRole.entities.MyCase.update(c.id, updates);
                        fixed++;
                        console.log(`✅ Fixed case ${c.case_number}`);
                    }
                } catch (err) {
                    errors.push({ case_id: c.id, error: err.message });
                    console.error(`❌ Failed to fix case ${c.id}:`, err);
                }
            }

            // VERIFICATION: Count again
            const verifiedCases = await base44.asServiceRole.entities.MyCase.list(null, 10000);
            const adminVisible = await base44.entities.MyCase.list(null, 10000);

            return Response.json({
                success: true,
                timestamp: new Date().toISOString(),
                results: {
                    cases_fixed: fixed,
                    errors: errors.length,
                    error_details: errors,
                    verification: {
                        total_in_db: verifiedCases.length,
                        admin_can_see: adminVisible.length,
                        visibility_gap: verifiedCases.length - adminVisible.length
                    }
                }
            });
        }

        if (action === 'verify_user_visibility') {
            const { user_email } = await req.json();
            
            const allCases = await base44.asServiceRole.entities.MyCase.list(null, 10000);
            const userCases = allCases.filter(c => 
                c.created_by?.toLowerCase() === user_email.toLowerCase() ||
                c.client_email?.toLowerCase() === user_email.toLowerCase() ||
                c.created_by_email?.toLowerCase() === user_email.toLowerCase()
            );

            return Response.json({
                success: true,
                user_email,
                total_cases_for_user: userCases.length,
                cases: userCases.map(c => ({
                    id: c.id,
                    case_number: c.case_number,
                    status: c.status,
                    amount: c.amount_lost,
                    created_date: c.created_date,
                    ownership: {
                        user_id: c.user_id,
                        created_by: c.created_by,
                        client_email: c.client_email,
                        created_by_email: c.created_by_email
                    }
                }))
            });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('P0 INCIDENT ERROR:', error);
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});