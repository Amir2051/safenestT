import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized - User not logged in' }, { status: 401 });
        }

        const payload = await req.json();
        
        // 🔥 CRITICAL: user_id is the PRIMARY key for My Cases visibility
        const caseData = {
            // OWNERSHIP - MANDATORY for "My Cases" query
            user_id: user.id,  // ← THIS IS THE KEY FIELD
            created_by: user.email,
            created_by_email: user.email,
            created_by_name: user.full_name || payload.victim_name || 'User',
            client_email: user.email,
            client_name: user.full_name || payload.victim_name || 'User',
            
            // REQUIRED FIELDS (per schema)
            issue_type: payload.fraud_type?.toLowerCase().replace(/ /g, '_') || 'other',
            
            // BASIC DATA
            description: payload.description || 'Case submitted via form',
            status: 'Pending',
            urgency: 'Medium',
            amount_lost: parseFloat(payload.amount_lost) || 0,
            
            // SCAMMER INFO
            scammer_wallet: payload.scammer_wallet || null,
            victim_wallet: payload.victim_wallet || null,
            blockchain: payload.blockchain?.toLowerCase() || 'ethereum',
            cryptocurrency: payload.currency_type || 'USD',
            phone_number: payload.victim_phone || null,
            transaction_date: payload.incident_date || null,
            
            // EVIDENCE
            evidence_files: payload.evidence_files || [],
            
            // SCAMMER DETAILS
            scammer_info: {
                name: payload.scammer_name || null,
                email: payload.scammer_email || null,
                phone: payload.scammer_phone || null,
                social_media: payload.scammer_social_media?.split('\n').filter(s => s.trim()) || [],
                wallet_addresses: [payload.scammer_wallet].filter(Boolean)
            },
            
            // LAW ENFORCEMENT
            law_enforcement_authorization: payload.law_enforcement_authorization || {
                authorized: false
            },
            
            // METADATA
            last_activity: new Date().toISOString(),
            created_by_admin: false
        };

        console.log('🚀 CREATING CASE:', {
            user_email: user.email,
            user_id: user.id,  // ← VERIFY THIS IS SET
            issue_type: caseData.issue_type,
            amount: caseData.amount_lost
        });
        
        // 🔥 CRITICAL CHECK: Verify user_id is set
        if (!caseData.user_id) {
            throw new Error('CRITICAL: user_id not set - case will not appear in My Cases');
        }

        // DIRECT DATABASE WRITE - NO COMPLEX LOGIC
        const newCase = await base44.entities.MyCase.create(caseData);
        
        console.log('✅ CASE CREATED:', {
            id: newCase.id,
            case_number: newCase.case_number,
            user_id: newCase.user_id,
            client_email: newCase.client_email
        });

        // VERIFICATION READ-BACK
        const verify = await base44.entities.MyCase.get(newCase.id);
        if (!verify) {
            console.error('❌ VERIFICATION FAILED - Case not readable');
            throw new Error('Case created but not readable');
        }

        console.log('✅ VERIFIED - Case readable in database');

        return Response.json({
            success: true,
            case: newCase,
            message: `Case ${newCase.case_number || newCase.id} created successfully`
        });

    } catch (error) {
        console.error('❌ SUBMISSION FAILED:', error);
        return Response.json({
            success: false,
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});