import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        console.log('🔍 GET ALL CASES REQUEST:', {
            user: user.email,
            role: user.role,
            is_admin: user.is_admin,
            job_title: user.job_title
        });
        
        const isAdmin = user.role === 'admin' || user.is_admin || user.job_title === 'Fraud Specialist';
        
        if (isAdmin) {
            // ADMIN: Return ALL cases with no filters
            const allCases = await base44.asServiceRole.entities.MyCase.list(null, 50000);
            console.log(`✅ ADMIN: Returning ${allCases.length} total cases`);
            
            return Response.json({ 
                success: true, 
                cases: allCases,
                count: allCases.length,
                user_role: 'admin'
            });
        } else {
            // USER: Return only their cases
            const userCases = await base44.entities.MyCase.list('-created_date', 10000);
            console.log(`✅ USER (${user.email}): Returning ${userCases.length} cases`);
            
            return Response.json({ 
                success: true, 
                cases: userCases,
                count: userCases.length,
                user_role: 'user'
            });
        }
        
    } catch (error) {
        console.error('❌ GET ALL CASES ERROR:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});