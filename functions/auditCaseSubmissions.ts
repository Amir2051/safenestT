import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🔍 AUDIT FUNCTION: Check all case submissions for data integrity
 * Identifies orphaned cases, missing ownership fields, and RLS issues
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);
        
        if (!user || (user.role !== 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
        }

        // Fetch ALL cases and users
        const [allCases, allUsers] = await Promise.all([
            base44.asServiceRole.entities.MyCase.list(null, 10000),
            base44.asServiceRole.entities.User.list(null, 5000)
        ]);

        const userMap = {};
        allUsers.forEach(u => {
            if (u.email) userMap[u.email.toLowerCase()] = u;
            if (u.id) userMap[u.id] = u;
        });

        // Analysis
        const issues = {
            missing_user_id: [],
            missing_created_by: [],
            missing_client_email: [],
            user_id_mismatch: [],
            orphaned_cases: [],
            invalid_status: [],
            missing_case_number: []
        };

        for (const c of allCases) {
            // Check for missing critical fields
            if (!c.user_id) issues.missing_user_id.push(c.id);
            if (!c.created_by) issues.missing_created_by.push(c.id);
            if (!c.client_email) issues.missing_client_email.push(c.id);
            if (!c.case_number) issues.missing_case_number.push(c.id);
            if (!c.status) issues.invalid_status.push(c.id);

            // Check if user_id matches an actual user
            if (c.user_id && !userMap[c.user_id]) {
                issues.user_id_mismatch.push({
                    case_id: c.id,
                    case_number: c.case_number,
                    user_id: c.user_id,
                    created_by: c.created_by
                });
            }

            // Check for orphaned cases (no matching user)
            const hasValidUser = 
                (c.user_id && userMap[c.user_id]) ||
                (c.created_by && userMap[c.created_by.toLowerCase()]) ||
                (c.client_email && userMap[c.client_email.toLowerCase()]);
            
            if (!hasValidUser) {
                issues.orphaned_cases.push({
                    case_id: c.id,
                    case_number: c.case_number,
                    created_by: c.created_by,
                    client_email: c.client_email
                });
            }
        }

        const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);

        return Response.json({
            success: true,
            summary: {
                total_cases: allCases.length,
                total_users: allUsers.length,
                total_issues: totalIssues,
                cases_with_issues: new Set([
                    ...issues.missing_user_id,
                    ...issues.missing_created_by,
                    ...issues.missing_client_email,
                    ...issues.user_id_mismatch.map(i => i.case_id),
                    ...issues.orphaned_cases.map(i => i.case_id),
                    ...issues.invalid_status,
                    ...issues.missing_case_number
                ]).size
            },
            issues,
            recommendations: totalIssues > 0 ? [
                'Run recover_access action to fix ownership fields',
                'Check for system users vs real users in created_by fields',
                'Verify RLS rules are not overly restrictive'
            ] : ['No issues found - all cases properly configured']
        });

    } catch (error) {
        console.error('Audit error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});