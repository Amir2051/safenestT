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
            incident_classification: payload.incident_classification || payload.incidentClassification,
            issue_type: payload.issue_type,
            has_financial_loss: payload.financial_loss?.has_financial_loss,
            amount: payload.amount_lost || payload.financial_loss?.total_amount_usd,
            victim_name: payload.victim_name || payload.victimName || payload.client_name
        });

        // VALIDATION: Check required fields with flexible field names
        const victimName = payload.victim_name || payload.victimName || payload.client_name;
        if (!victimName?.trim()) {
            return Response.json({ 
                success: false, 
                error: 'Victim name is required' 
            }, { status: 400 });
        }

        const description = payload.description || payload.incidentDescription || payload.incident_description;
        if (!description?.trim()) {
            return Response.json({ 
                success: false, 
                error: 'Case description is required' 
            }, { status: 400 });
        }
        
        // CRITICAL: Validate incident_classification (REQUIRED by MyCase entity)
        const incidentClassification = payload.incident_classification || payload.incidentClassification || payload.issue_type;
        if (!incidentClassification) {
            return Response.json({ 
                success: false, 
                error: 'Incident classification is required' 
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
            created_by_name: user.full_name || victimName || 'User',
            client_email: payload.victim_email || payload.victimEmail || payload.client_email || user.email,
            client_name: victimName,
            phone_number: payload.victim_phone || payload.phoneNumber || payload.phone_number || null,
            
            // REQUIRED FIELDS (per schema)
            // CRITICAL FIX: Map old field names to new required field
            incident_classification: incidentClassification,
            issue_type: payload.issue_type || incidentClassification || 'other',
            
            // BASIC DATA
            description: description,
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
        console.log('📦 FINAL CASE DATA:', JSON.stringify({
            user_id: caseData.user_id,
            client_name: caseData.client_name,
            incident_classification: caseData.incident_classification,
            issue_type: caseData.issue_type,
            description: caseData.description?.substring(0, 50) + '...',
            amount_lost: caseData.amount_lost
        }, null, 2));

        // DIRECT DATABASE WRITE - Use asServiceRole to ensure proper creation
        const newCase = await base44.asServiceRole.entities.MyCase.create(caseData);
        
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

        // Auto-generate / refresh MasterCase in the background (non-blocking)
        (async () => {
          try {
            const [allMyCases, allInvCases] = await Promise.all([
              base44.asServiceRole.entities.MyCase.filter({ created_by: user.email }, '-created_date', 100),
              base44.asServiceRole.entities.InvestigationCase.filter({ created_by: user.email }, '-created_date', 100).catch(() => [])
            ]);
            const allCasesMap = new Map();
            [...allMyCases, ...allInvCases].forEach(c => allCasesMap.set(c.id, c));
            const allCases = Array.from(allCasesMap.values());

            const scamList = allCases.map(c => ({
              date:     c.incident_date || c.created_date,
              platform: c.issue_type || c.fraud_type || 'Unknown',
              method:   c.incident_classification || c.fraud_method || 'Unknown',
              amount:   parseFloat(c.amount_lost || c.amount_stolen_usd || 0),
              case_id:  c.id
            }));
            const walletSet = new Set();
            allCases.forEach(c => {
              if (c.scammer_wallet) walletSet.add(c.scammer_wallet);
              (c.scammer_info?.wallet_addresses || []).forEach(w => walletSet.add(w));
              (c.monitored_wallets || []).forEach(w => walletSet.add(w));
            });
            const totalLoss = allCases.reduce((s, c) => s + parseFloat(c.amount_lost || c.amount_stolen_usd || 0), 0);
            const evidenceMap = new Map();
            allCases.forEach(c => {
              [...(c.evidence_files || []), ...(c.evidence_log || [])].forEach(ev => {
                const url = ev?.url || ev?.file_url;
                if (url && !evidenceMap.has(url)) {
                  evidenceMap.set(url, { url, name: ev.name || 'Evidence file', source_case: c.case_number || c.id, type: ev.type || 'document' });
                }
              });
            });

            const masterPayload = {
              user_id:          user.email,
              linked_case_ids:  allCases.map(c => c.id),
              scam_list:        scamList,
              wallet_addresses: Array.from(walletSet),
              transaction_records: allCases.flatMap(c => (c.transactions || []).map(t => ({ ...t, source_case: c.id }))),
              evidence_index:   Array.from(evidenceMap.values()),
              total_loss:       totalLoss,
              status:           'draft',
              generated_date:   new Date().toISOString()
            };

            const existing = await base44.entities.MasterCase.filter({ user_id: user.email }, '-generated_date', 1);
            if (existing.length > 0) {
              const current = existing[0];
              await base44.entities.MasterCase.update(current.id, {
                ...masterPayload,
                status: current.status === 'submitted' ? 'submitted' : 'draft',
                merged_summary:   current.merged_summary,
                pattern_analysis: current.pattern_analysis,
                pdf_url:          current.pdf_url
              });
            } else {
              await base44.entities.MasterCase.create(masterPayload);
            }
            console.log(`✅ MasterCase auto-updated for ${user.email} — ${allCases.length} cases, $${totalLoss} total loss`);
          } catch (e) {
            console.error('⚠️ MasterCase auto-update failed (non-critical):', e.message);
          }
        })();

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