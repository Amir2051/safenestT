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
            incident_classification: payload.incident_classification,
            issue_type: payload.issue_type,
            has_financial_loss: payload.financial_loss?.has_financial_loss,
            amount: payload.amount_lost || payload.financial_loss?.total_amount_usd
        });

        // VALIDATION: Check required fields
        if (!payload.victim_name?.trim()) {
            return Response.json({ 
                success: false, 
                error: 'Victim name is required' 
            }, { status: 400 });
        }

        if (!payload.description?.trim()) {
            return Response.json({ 
                success: false, 
                error: 'Case description is required' 
            }, { status: 400 });
        }

        // Extract scammer wallets from alleged_actor_information
        const scammerWallets = payload.alleged_actor_information?.crypto_wallet_addresses || [];
        const primaryScammerWallet = scammerWallets[0] || null;

        // Calculate final amount
        const financialLoss = payload.financial_loss || {};
        const finalAmount = parseFloat(payload.amount_lost) || parseFloat(financialLoss.total_amount_usd) || 0;
        
        // 🔥 CRITICAL: user_id is the PRIMARY key for My Cases visibility
        const caseData = {
            // OWNERSHIP - MANDATORY for "My Cases" query
            user_id: user.id,  // ← THIS IS THE KEY FIELD
            created_by: user.email,
            created_by_email: user.email,
            created_by_name: user.full_name || payload.victim_name || 'User',
            client_email: payload.victim_email || user.email,
            client_name: payload.victim_name || user.full_name || 'User',
            phone_number: payload.victim_phone || null,
            
            // REQUIRED FIELDS (per schema)
            incident_classification: payload.incident_classification || payload.issue_type || 'other_cyber_fraud',
            issue_type: payload.issue_type || payload.incident_classification || 'other',
            
            // BASIC DATA
            description: payload.description || 'Case submitted via form',
            status: 'Pending',
            urgency: 'Medium',
            amount_lost: finalAmount,
            
            // INCIDENT TIMELINE
            incident_timeline: payload.incident_timeline || {},
            
            // ALLEGED ACTOR INFORMATION
            alleged_actor_information: payload.alleged_actor_information || {},
            
            // FINANCIAL LOSS
            financial_loss: financialLoss,
            
            // SCAMMER INFO (legacy fields for compatibility)
            scammer_wallet: primaryScammerWallet,
            blockchain: primaryScammerWallet ? 'ethereum' : null,
            cryptocurrency: financialLoss.payment_method === 'cryptocurrency' ? 'Unknown' : null,
            
            // EVIDENCE
            supporting_documentation: payload.supporting_documentation || [],
            evidence_files: payload.supporting_documentation || [],
            
            // SCAMMER DETAILS (legacy structure for compatibility)
            scammer_info: {
                email_addresses: payload.alleged_actor_information?.email_addresses || [],
                phone_numbers: payload.alleged_actor_information?.phone_numbers || [],
                wallet_addresses: scammerWallets,
                social_media: payload.alleged_actor_information?.social_media_accounts || '',
                websites: payload.alleged_actor_information?.websites_platforms || []
            },
            
            // LAW ENFORCEMENT
            law_enforcement_authorization: payload.law_enforcement_authorization || {
                authorized: false
            },
            
            // IC3 ACKNOWLEDGMENT
            ic3_referral_acknowledged: payload.ic3_referral_acknowledged || false,
            
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