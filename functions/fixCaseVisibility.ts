import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, target_user_email } = await req.json();

        // 1. DIAGNOSTIC: Check specific user's case visibility
        if (action === 'diagnose') {
            const targetEmail = target_user_email || user.email;
            
            // Find target user
            const allUsers = await base44.asServiceRole.entities.User.list(null, 5000);
            const targetUser = allUsers.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());
            
            if (!targetUser) {
                return Response.json({ 
                    error: 'User not found',
                    email: targetEmail 
                }, { status: 404 });
            }

            // Fetch ALL cases (admin view)
            const allCases = await base44.asServiceRole.entities.MyCase.list(null, 10000);
            
            // Find cases that SHOULD belong to this user
            const userCases = allCases.filter(c => {
                const email = targetEmail.toLowerCase();
                return (
                    c.user_id === targetUser.id ||
                    c.created_by?.toLowerCase() === email ||
                    c.created_by_email?.toLowerCase() === email ||
                    c.client_email?.toLowerCase() === email
                );
            });

            // Check which cases have BROKEN visibility
            const brokenCases = userCases.filter(c => c.user_id !== targetUser.id);

            return Response.json({
                success: true,
                target_user: {
                    id: targetUser.id,
                    email: targetUser.email,
                    full_name: targetUser.full_name
                },
                total_cases_found: userCases.length,
                broken_cases_count: brokenCases.length,
                working_cases_count: userCases.length - brokenCases.length,
                issues: brokenCases.map(c => ({
                    case_id: c.id,
                    case_number: c.case_number,
                    current_user_id: c.user_id,
                    expected_user_id: targetUser.id,
                    created_by: c.created_by,
                    client_email: c.client_email,
                    problem: c.user_id ? 'Wrong user_id' : 'Missing user_id'
                }))
            });
        }

        // 2. REPAIR: Fix all cases for a specific user
        if (action === 'repair_user') {
            const isAdmin = user.role === 'admin' || user.is_admin;
            if (!isAdmin) {
                return Response.json({ error: 'Admin access required' }, { status: 403 });
            }

            const targetEmail = target_user_email;
            if (!targetEmail) {
                return Response.json({ error: 'target_user_email required' }, { status: 400 });
            }

            // Find target user
            const allUsers = await base44.asServiceRole.entities.User.list(null, 5000);
            const targetUser = allUsers.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());
            
            if (!targetUser) {
                return Response.json({ error: 'User not found' }, { status: 404 });
            }

            // Find cases to fix
            const allCases = await base44.asServiceRole.entities.MyCase.list(null, 10000);
            const casesToFix = allCases.filter(c => {
                const email = targetEmail.toLowerCase();
                const belongsToUser = (
                    c.created_by?.toLowerCase() === email ||
                    c.created_by_email?.toLowerCase() === email ||
                    c.client_email?.toLowerCase() === email
                );
                const hasWrongUserId = c.user_id !== targetUser.id;
                
                return belongsToUser && hasWrongUserId;
            });

            console.log(`🔧 REPAIRING ${casesToFix.length} cases for ${targetEmail}`);

            // Fix each case
            let fixed = 0;
            for (const c of casesToFix) {
                try {
                    await base44.asServiceRole.entities.MyCase.update(c.id, {
                        user_id: targetUser.id,
                        client_email: targetUser.email,
                        created_by: targetUser.email,
                        created_by_email: targetUser.email,
                        created_by_name: targetUser.full_name || c.created_by_name,
                        client_name: targetUser.full_name || c.client_name
                    });
                    fixed++;
                    console.log(`✅ Fixed case ${c.case_number || c.id}`);
                } catch (err) {
                    console.error(`❌ Failed to fix case ${c.id}:`, err);
                }
            }

            return Response.json({
                success: true,
                message: `Repaired ${fixed} cases for ${targetEmail}`,
                details: {
                    user_id: targetUser.id,
                    user_email: targetUser.email,
                    cases_found: casesToFix.length,
                    cases_fixed: fixed
                }
            });
        }

        // 3. REPAIR ALL: Fix ALL orphaned cases in database
        if (action === 'repair_all') {
            const isAdmin = user.role === 'admin' || user.is_admin;
            if (!isAdmin) {
                return Response.json({ error: 'Admin access required' }, { status: 403 });
            }

            const allCases = await base44.asServiceRole.entities.MyCase.list(null, 10000);
            const allUsers = await base44.asServiceRole.entities.User.list(null, 5000);

            let fixed = 0;
            let skipped = 0;
            let errors = 0;

            for (const c of allCases) {
                try {
                    // Skip if user_id is already correctly set
                    let targetUser = null;

                    // Priority 1: If user_id is set, verify it matches a real user
                    if (c.user_id) {
                        targetUser = allUsers.find(u => u.id === c.user_id);
                        if (targetUser) {
                            // Verify email fields match
                            const emailMatches = 
                                c.client_email?.toLowerCase() === targetUser.email?.toLowerCase() ||
                                c.created_by?.toLowerCase() === targetUser.email?.toLowerCase();
                            
                            if (emailMatches) {
                                skipped++;
                                continue; // Already correct
                            }
                        }
                    }

                    // Priority 2: Find user by email fields
                    const emailToFind = (
                        c.client_email || 
                        c.created_by_email || 
                        c.created_by || 
                        ''
                    ).toLowerCase().trim();

                    if (emailToFind) {
                        targetUser = allUsers.find(u => 
                            u.email?.toLowerCase() === emailToFind
                        );
                    }

                    if (targetUser) {
                        // Fix ownership
                        await base44.asServiceRole.entities.MyCase.update(c.id, {
                            user_id: targetUser.id,
                            client_email: targetUser.email,
                            created_by: targetUser.email,
                            created_by_email: targetUser.email,
                            created_by_name: targetUser.full_name || c.created_by_name || c.client_name,
                            client_name: targetUser.full_name || c.client_name
                        });
                        fixed++;
                        console.log(`✅ Fixed case ${c.case_number || c.id} → ${targetUser.email}`);
                    } else {
                        console.warn(`⚠️ No user found for case ${c.case_number || c.id}`);
                        skipped++;
                    }
                } catch (err) {
                    console.error(`❌ Error fixing case ${c.id}:`, err);
                    errors++;
                }
            }

            return Response.json({
                success: true,
                message: `Repair complete: ${fixed} fixed, ${skipped} skipped, ${errors} errors`,
                details: {
                    total_cases: allCases.length,
                    cases_fixed: fixed,
                    cases_skipped: skipped,
                    errors: errors
                }
            });
        }

        return Response.json({ error: 'Invalid action. Use: diagnose, repair_user, or repair_all' }, { status: 400 });

    } catch (error) {
        console.error('❌ Fix Case Visibility Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});