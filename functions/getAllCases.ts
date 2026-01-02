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
        
        // Fetch cases using user context (RLS will handle filtering)
        // Admin users can see all cases via RLS rules
        const cases = await base44.entities.MyCase.list('-created_date', 50000);
        console.log(`✅ FETCHED: ${cases.length} cases for ${user.email}`);
        
        const isAdmin = user.role === 'admin' || user.is_admin || user.job_title === 'Fraud Specialist';
        
        return Response.json({ 
            success: true, 
            cases: cases,
            count: cases.length,
            user_role: isAdmin ? 'admin' : 'user'
        });
        
    } catch (error) {
        console.error('❌ GET ALL CASES ERROR:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});