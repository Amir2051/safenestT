import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🚨 DIAGNOSTIC FUNCTION: Verify case submission and visibility
 * This function checks if a case exists and is visible to the correct user
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { caseId, userEmail } = await req.json();

        // 1. Check if case exists (service role)
        const caseExists = await base44.asServiceRole.entities.MyCase.get(caseId).catch(() => null);
        
        if (!caseExists) {
            return Response.json({
                success: false,
                exists: false,
                message: `Case ${caseId} does not exist in database`
            });
        }

        // 2. Check visibility fields
        const ownershipFields = {
            user_id: caseExists.user_id,
            created_by: caseExists.created_by,
            client_email: caseExists.client_email,
            created_by_email: caseExists.created_by_email
        };

        // 3. Try to fetch as the user (test RLS)
        let visibleToUser = false;
        try {
            const userView = await base44.entities.MyCase.get(caseId);
            visibleToUser = !!userView;
        } catch (e) {
            visibleToUser = false;
        }

        // 4. Check if user should be able to see it
        const targetEmail = (userEmail || user.email).toLowerCase();
        const shouldBeVisible = 
            caseExists.user_id === user.id ||
            caseExists.created_by?.toLowerCase() === targetEmail ||
            caseExists.client_email?.toLowerCase() === targetEmail ||
            caseExists.created_by_email?.toLowerCase() === targetEmail ||
            user.role === 'admin' ||
            user.is_admin;

        return Response.json({
            success: true,
            exists: true,
            visible: visibleToUser,
            should_be_visible: shouldBeVisible,
            case_number: caseExists.case_number,
            status: caseExists.status,
            ownership_fields: ownershipFields,
            user_info: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            rls_issue: shouldBeVisible && !visibleToUser
        });

    } catch (error) {
        console.error('Verification error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});