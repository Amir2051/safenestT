import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized - User not logged in' }, { status: 401 });
        }

        const payload = await req.json();
        
        console.log('📥 PAYLOAD RECEIVED:', {
            fraud_type: payload.fraud_type,
            scammer_wallet: payload.scammer_wallet,
            amount_lost: payload.amount_lost,
            has_transactions: !!payload.payment_transactions,
            transactions_count: payload.payment_transactions?.length
        });

        // VALIDATION: Check required fields
        if (!payload.victim_name?.trim()) {
            return Response.json({ 
                success: false, 
                error: 'Victim name is required' 
            }, { status: 400 });
        }

        if (!payload.scammer_wallet?.trim()) {
            return Response.json({ 
                success: false, 
                error: 'Scammer wallet address is required' 
            }, { status: 400 });
        }

        if (!payload.description?.trim()) {
            return Response.json({ 
                success: false, 
                error: 'Case description is required' 
            }, { status: 400 });
        }

        // Calculate final amount (prioritize transactions)
        const totalFromTransactions = (payload.payment_transactions || []).reduce(
            (sum, t) => sum + (parseFloat(t.amount) || 0), 
            0
        );
        const finalAmount = totalFromTransactions > 0 ? totalFromTransactions : parseFloat(payload.amount_lost) || 0;

        if (finalAmount <= 0) {
            return Response.json({ 
                success: false, 
                error: 'Amount lost must be greater than 0. Please add payment transactions or enter a total amount.' 
            }, { status: 400 });
        }
        
        // 🔥 CRITICAL: user_id is the PRIMARY key for My Cases visibility
        const caseData = {
            // OWNERSHIP - MANDATORY for "My Cases" query
            user_id: user.id,  // ← THIS IS THE KEY FIELD
            created_by: user.email,
            created_by_email: user.email,
            created_by_name: user.full_name || payload.victim_name || 'User',
            client_email: user.email,
            client_name: payload.victim_name || user.full_name || 'User',
            
            // REQUIRED FIELDS (per schema)
            issue_type: payload.fraud_type?.toLowerCase().replace(/ /g, '_') || 'other',
            
            // BASIC DATA
            description: payload.description || 'Case submitted via form',
            status: 'Pending',
            urgency: 'Medium',
            amount_lost: finalAmount,
            
            // PAYMENT TRANSACTIONS
            payment_transactions: payload.payment_transactions || [],
            
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
            
            // SOURCE TRACKING
            source_type: 'manual',
            
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

        // Generate case number
        const year = new Date().getFullYear();
        const configKey = `case_seq_${year}`;
        let seq = 1;
        
        try {
            const configs = await base44.asServiceRole.entities.SystemConfig.filter({ key_name: configKey });
            if (configs && configs.length > 0) {
                seq = parseInt(configs[0].value) + 1;
                await base44.asServiceRole.entities.SystemConfig.update(configs[0].id, { value: seq.toString() });
            } else {
                await base44.asServiceRole.entities.SystemConfig.create({ 
                    key_name: configKey, 
                    value: "1", 
                    description: `Case sequence counter for year ${year}` 
                });
            }
        } catch (e) {
            console.error('⚠️ Failed to get sequence, using timestamp fallback:', e);
            seq = Date.now() % 100000;
        }
        
        const caseNumber = `SN-${year}-${seq.toString().padStart(5, '0')}`;
        caseData.case_number = caseNumber;

        console.log('📝 CREATING CASE WITH NUMBER:', caseNumber);

        // DIRECT DATABASE WRITE - NO COMPLEX LOGIC
        const newCase = await base44.entities.MyCase.create(caseData);
        
        console.log('✅ CASE CREATED:', {
            id: newCase.id,
            case_number: newCase.case_number,
            user_id: newCase.user_id,
            client_email: newCase.client_email,
            amount: newCase.amount_lost,
            transactions: newCase.payment_transactions?.length
        });

        // VERIFICATION READ-BACK
        const verify = await base44.entities.MyCase.get(newCase.id);
        if (!verify) {
            console.error('❌ VERIFICATION FAILED - Case not readable');
            throw new Error('Case created but not readable');
        }

        console.log('✅ VERIFIED - Case readable in database');

        // Create timeline event
        try {
            await base44.entities.CaseTimelineEvent.create({
                case_id: newCase.id,
                event_type: 'system_action',
                event_title: 'Case Submitted',
                event_description: `Case ${caseNumber} submitted by ${user.email} via Crypto Protection portal`,
                severity: 'info',
                created_by_user: user.email,
                created_by_name: user.full_name,
                automated: true,
                visible_to_client: true
            });
        } catch (e) {
            console.error('⚠️ Timeline event creation failed:', e);
        }

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