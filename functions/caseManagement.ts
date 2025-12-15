import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

async function getNextSequence(base44, year) {
    const configKey = `case_seq_${year}`;
    // Use service role for system config access
    const configs = await base44.asServiceRole.entities.SystemConfig.filter({ key_name: configKey });
    let seq = 1;
    
    if (configs && configs.length > 0) {
        const config = configs[0];
        seq = parseInt(config.value) + 1;
        await base44.asServiceRole.entities.SystemConfig.update(config.id, { value: seq.toString() });
    } else {
        await base44.asServiceRole.entities.SystemConfig.create({ 
            key_name: configKey, 
            value: "1", 
            description: `Case sequence counter for year ${year}` 
        });
    }
    return seq;
}

async function generateCaseId(base44, dateStr = null) {
    const date = dateStr ? new Date(dateStr) : new Date();
    const year = date.getFullYear();
    const seq = await getNextSequence(base44, year);
    const padded = seq.toString().padStart(5, '0');
    return `SN-${year}-${padded}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, data } = await req.json();

        if (action === 'create') {
            const { victim_wallet, scammer_wallet } = data;

            // 1. Mandatory Wallet Validation
            const validateWallet = (addr) => {
                if (/^0x[a-fA-F0-9]{40}$/.test(addr)) return "ethereum";
                if (/^(1|3)[a-zA-Z0-9]{25,34}$|^bc1[a-zA-Z0-9]{39,59}$/.test(addr)) return "bitcoin";
                if (/^T[a-zA-Z0-9]{33}$/.test(addr)) return "tron";
                return null;
            };

            const victimNet = validateWallet(victim_wallet);
            const scammerNet = validateWallet(scammer_wallet);

            if (!victimNet || !scammerNet) {
                return Response.json({ error: "Both Client and Scammer wallets are required and must be valid formats (ETH, BTC, TRON)." }, { status: 400 });
            }

            const blockchain = scammerNet; // Prioritize scammer network for investigation

            // 2. Automatic Wallet Analysis (Scammer & Victim)
            let walletAnalysis = {};
            let aiAnalysisSummary = "Pending analysis...";
            try {
                // Track Scammer Wallet
                const intelRes = await base44.asServiceRole.functions.invoke('blockchainIntelligence', {
                    action: 'track-wallet',
                    data: { 
                        wallet_address: scammer_wallet, 
                        blockchain,
                        fraud_case_id: null,
                        wallet_type: 'scammer'
                    }
                });
                
                if (intelRes.data && intelRes.data.success) {
                    const intel = intelRes.data.data;
                    walletAnalysis = {
                        risk_score: intel.riskScore?.score,
                        risk_level: intel.riskScore?.level,
                        indicators: intel.riskScore?.indicators || [],
                        balance: intel.balance?.amount,
                        total_transactions: intel.transactions?.length,
                        analyzed_at: new Date().toISOString()
                    };
                    aiAnalysisSummary = `High Risk Scammer Wallet (Score: ${walletAnalysis.risk_score}/100). Indicators: ${walletAnalysis.indicators.join(', ')}.`;
                }

                // Track Victim Wallet
                if (victim_wallet) {
                    const victimBlockchain = validateWallet(victim_wallet) || 'ethereum';
                    await base44.asServiceRole.functions.invoke('blockchainIntelligence', {
                        action: 'track-wallet',
                        data: { 
                            wallet_address: victim_wallet, 
                            blockchain: victimBlockchain,
                            fraud_case_id: null, // Will link later or via linking logic
                            wallet_type: 'victim'
                        }
                    });
                }

            } catch (e) {
                console.error("Wallet analysis failed:", e);
                aiAnalysisSummary = "Automated analysis failed. Manual review required.";
            }

            // 3. Case Linking (Intelligence)
            let linkedCaseIds = [];
            try {
                // Link by Scammer Wallet
                const existingCasesScammer = await base44.asServiceRole.entities.MyCase.filter({ scammer_wallet: scammer_wallet });
                existingCasesScammer.forEach(c => {
                    if (!linkedCaseIds.includes(c.id)) linkedCaseIds.push(c.id);
                });

                // Link by Victim Wallet (Repeat Victim or Organized Ring)
                if (victim_wallet) {
                    const existingCasesVictim = await base44.asServiceRole.entities.MyCase.filter({ victim_wallet: victim_wallet });
                    existingCasesVictim.forEach(c => {
                        if (!linkedCaseIds.includes(c.id)) linkedCaseIds.push(c.id);
                    });
                }

                if (linkedCaseIds.length > 0) {
                    aiAnalysisSummary += ` LINKED: ${linkedCaseIds.length} related cases found via wallet matching.`;
                }
            } catch(e) {}

            // Generate ID
            const caseId = await generateCaseId(base44);
            
            // Create Case
            const caseData = {
                ...data,
                case_number: caseId,
                // Wallets & Blockchain
                victim_wallet,
                scammer_wallet,
                blockchain,
                wallet_analysis: walletAnalysis,
                linked_case_ids: linkedCaseIds,
                monitored_wallets: [scammer_wallet],
                ai_analysis: aiAnalysisSummary,
                scammer_info: {
                    wallet_addresses: [scammer_wallet],
                    ...data.scammer_info
                },
                // Ensure numbers are numbers
                amount_lost: data.amount_lost ? parseFloat(data.amount_lost) : 0,
                status: data.status || "Pending",
                created_by: user.email.toLowerCase(),
                created_by_email: user.email.toLowerCase(),
                created_by_name: user.full_name || user.first_name
            };

            // AUTOMATION 1: Auto-Assignment
            // Assign to specialist based on criteria if not already assigned
            if (!caseData.assigned_to) {
                if (caseData.amount_lost >= 100000) {
                     // High value cases go to senior specialists
                    caseData.assigned_to = "senior.investigator@safenest.com"; 
                } else if (['crypto_theft', 'pig_butchering'].includes(caseData.issue_type)) {
                    caseData.assigned_to = "crypto.specialist@safenest.com";
                } else {
                    // Default assignment
                    caseData.assigned_to = "intake@safenest.com";
                }
            }

            // TARGET ENTITY: MyCase
            const newCase = await base44.entities.MyCase.create(caseData);

            // Update Wallet Monitors with Case ID
            try {
                const monitors = await base44.asServiceRole.entities.WalletMonitor.filter({ 
                    wallet_address: { $in: [scammer_wallet, victim_wallet].filter(Boolean) } 
                });
                for (const m of monitors) {
                    if (!m.fraud_case_id) {
                        await base44.asServiceRole.entities.WalletMonitor.update(m.id, { fraud_case_id: newCase.id });
                    }
                }
            } catch(e) { console.error("Failed to link monitors", e); }

            // AUTOMATION: High Priority Notifications
            if (caseData.priority === 'critical' || caseData.priority === 'high' || caseData.amount_lost >= 50000) {
                const message = `HIGH PRIORITY CASE: ${newCase.case_number} (${newCase.case_title}). Amount: $${newCase.amount_lost}. Assigned to: ${newCase.assigned_to}`;
                
                // Notify Assigned Specialist
                if (newCase.assigned_to) {
                    try {
                        // Create in-app notification
                        await base44.asServiceRole.entities.Notification.create({
                            user_id: newCase.assigned_to, // Assuming email is used as ID or mapped
                            type: 'system',
                            title: 'New High Priority Case',
                            message: message,
                            actionUrl: `/investigation/${newCase.id}`
                        });

                        // Send Email
                        await base44.integrations.Core.SendEmail({
                            to: newCase.assigned_to,
                            subject: `URGENT: New Case Assignment ${newCase.case_number}`,
                            body: message
                        });
                    } catch (e) {
                        console.error("Failed to send priority notifications", e);
                    }
                }
            }

            return Response.json({ success: true, case: newCase });
        }

        if (action === 'update') {
            const { id, updates } = data;
            if (!id) return Response.json({ error: "Missing case ID" }, { status: 400 });

            // Ensure numeric fields are numbers
            if (updates.amount_lost !== undefined) updates.amount_lost = parseFloat(updates.amount_lost) || 0;
            if (updates.amount_stolen_usd !== undefined) updates.amount_stolen_usd = parseFloat(updates.amount_stolen_usd) || 0;
            if (updates.recovery_amount !== undefined) updates.recovery_amount = parseFloat(updates.recovery_amount) || 0;
            if (updates.investigation_progress !== undefined) updates.investigation_progress = parseInt(updates.investigation_progress) || 0;

            // Always update metadata
            updates.last_activity = new Date().toISOString();
            updates.updated_date = new Date().toISOString();
            updates.updated_by = user.email; 

            const isAdmin = user.role === 'admin' || user.is_admin;
            const isSpecialist = user.job_title === 'Fraud Specialist';

            try {
                // Try MyCase first
                let existing = await base44.asServiceRole.entities.MyCase.get(id).catch(() => null);
                let entityType = 'MyCase';

                if (!existing) {
                    // Fallback to InvestigationCase
                    existing = await base44.asServiceRole.entities.InvestigationCase.get(id).catch(() => null);
                    entityType = 'InvestigationCase';
                }

                if (!existing) {
                    return Response.json({ error: `Case ${id} not found` }, { status: 404 });
                }

                // ADMIN OVERRIDE: If admin, skip ownership check entirely
                if (!isAdmin && !isSpecialist) {
                    // Regular users can only update their own cases
                    if (existing.created_by !== user.email) {
                        return Response.json({ error: "Unauthorized" }, { status: 403 });
                    }
                }

                // Log status changes
                if (updates.status && existing.status !== updates.status) {
                    await base44.asServiceRole.entities.CaseTimelineEvent.create({
                        case_id: id,
                        event_type: 'status_change',
                        description: `Status updated to ${updates.status}`,
                        performed_by: user.email,
                        previous_status: existing.status,
                        new_status: updates.status,
                        metadata: JSON.stringify({ timestamp: new Date().toISOString() })
                    }).catch(e => console.error("Log failed:", e));

                    // AUTOMATION 2: Email Notification on Status Change
                    const recipientEmail = existing.client_email || existing.created_by_email;
                    if (recipientEmail) {
                        try {
                            await base44.integrations.Core.SendEmail({
                                to: recipientEmail,
                                subject: `Case Status Update: ${existing.case_number || 'Your Case'}`,
                                body: `Hello ${existing.client_name || 'User'},\n\nYour case status has been updated from "${existing.status}" to "${updates.status}".\n\nPlease log in to your SafeNest dashboard to view the latest details and any required actions.\n\nBest regards,\nSafeNest Security Team`
                            });
                        } catch (emailError) {
                            console.error("Failed to send status email:", emailError);
                        }
                    }
                }

                // PERFORM UPDATE
                const updatedCase = await base44.asServiceRole.entities[entityType].update(id, updates);
                return Response.json({ success: true, case: updatedCase });

            } catch (err) {
                return Response.json({ error: err.message }, { status: 500 });
            }
        }

        if (action === 'migrate') {
            if (user.role !== 'admin' && !user.is_admin) {
                return Response.json({ error: 'Unauthorized' }, { status: 403 });
            }

            const { type } = data;

            if (type === 'migrate_to_mycase') {
                // MIGRATE CLIENTCASE -> MYCASE
                const clientCases = await base44.asServiceRole.entities.ClientCase.list(null, 1000);
                const users = await base44.asServiceRole.entities.User.list(null, 1000);
                
                const migratedCases = [];
                for (const cc of clientCases) {
                    // Match User (Logic from previous step refined)
                    const matchingUser = users.find(u => 
                        u.email.toLowerCase() === cc.client_email?.toLowerCase() ||
                        u.email.toLowerCase() === cc.created_by?.toLowerCase() ||
                        u.email.toLowerCase() === cc.created_by_email?.toLowerCase()
                    );

                    const newCase = {
                        ...cc,
                        id: undefined, // Create new ID
                        created_date: cc.created_date, // Preserve timestamp
                        updated_date: cc.updated_date,
                        
                        // Ensure Ownership
                        created_by: matchingUser?.email || cc.created_by || cc.client_email,
                        created_by_email: matchingUser?.email || cc.created_by_email || cc.client_email,
                        created_by_name: matchingUser?.full_name || cc.created_by_name || cc.client_name,
                        
                        // Metadata trace
                        metadata: JSON.stringify({ legacy_id: cc.id, source: 'client_case_migration' })
                    };
                    
                    // Create in MyCase
                    await base44.asServiceRole.entities.MyCase.create(newCase);
                    // Delete from ClientCase
                    await base44.asServiceRole.entities.ClientCase.delete(cc.id);
                    migratedCases.push(newCase);
                }

                // Also check for stragglers in FraudCase if any remain
                const fraudCases = await base44.asServiceRole.entities.FraudCase.list(null, 1000);
                for (const fc of fraudCases) {
                     // Match User
                    const matchingUser = users.find(u => 
                        u.email.toLowerCase() === fc.victim_contact_info?.email?.toLowerCase() ||
                        u.email.toLowerCase() === fc.created_by?.toLowerCase()
                    );

                     const newCase = {
                        // Core
                        case_title: fc.case_title,
                        client_name: fc.victim_contact_info?.name || matchingUser?.full_name || 'Unknown',
                        client_email: fc.victim_contact_info?.email || matchingUser?.email,
                        phone_number: fc.victim_contact_info?.phone,
                        amount_lost: fc.amount_stolen || fc.amount_stolen_usd || 0,
                        cryptocurrency: fc.currency_type === 'USD' ? '' : fc.currency_type,
                        blockchain: fc.blockchain,
                        issue_type: fc.fraud_type || 'scam',
                        description: fc.description,
                        status: fc.status === 'reported' ? 'Pending' : fc.status,
                        incident_date: fc.incident_date || fc.created_date,
                        created_date: fc.created_date, 
                        scammer_wallet: fc.scammer_wallet,
                        scammer_info: fc.suspect_details || {},
                        created_by: matchingUser?.email || fc.created_by,
                        created_by_email: matchingUser?.email || fc.created_by,
                        created_by_name: matchingUser?.full_name || fc.victim_contact_info?.name,
                        metadata: JSON.stringify({ legacy_id: fc.id, source: 'fraud_case_migration_final' })
                    };

                    await base44.asServiceRole.entities.MyCase.create(newCase);
                    await base44.asServiceRole.entities.FraudCase.delete(fc.id);
                    migratedCases.push(newCase);
                }

                return Response.json({ 
                    success: true, 
                    message: `Full Migration to MyCase Complete. Moved ${migratedCases.length} cases.` 
                });
            }

            if (type === 'ownership_sync') {
                // Legacy sync logic kept just in case, but full_migration covers it.
                // ... code removed to avoid redundancy since full_migration is better ...
                return Response.json({ error: 'Use type: full_migration' });
            }

            // Default migration: ID generation (legacy code kept)
            // Fetch all cases
            const cases = await base44.asServiceRole.entities.ClientCase.list(null, 1000); // adjust limit as needed
            
            // Filter those without valid SN- ID
            const toMigrate = cases.filter(c => !c.case_number || !c.case_number.startsWith('SN-'));
            
            // Sort by date
            toMigrate.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
            
            const updates = [];
            const yearSequences = {}; // cache sequences for migration run

            for (const c of toMigrate) {
                const year = new Date(c.created_date).getFullYear();
                if (!yearSequences[year]) {
                    // Initialize from DB or 0 if creating fresh for old years
                    const configKey = `case_seq_${year}`;
                    const configs = await base44.asServiceRole.entities.SystemConfig.filter({ key_name: configKey });
                    yearSequences[year] = configs.length > 0 ? parseInt(configs[0].value) : 0;
                }
                
                yearSequences[year]++;
                const seq = yearSequences[year];
                const padded = seq.toString().padStart(5, '0');
                const newId = `SN-${year}-${padded}`;
                
                updates.push(base44.asServiceRole.entities.ClientCase.update(c.id, { case_number: newId }));
            }

            // Update config counters
            for (const year in yearSequences) {
                const configKey = `case_seq_${year}`;
                const configs = await base44.asServiceRole.entities.SystemConfig.filter({ key_name: configKey });
                if (configs.length > 0) {
                    await base44.asServiceRole.entities.SystemConfig.update(configs[0].id, { value: yearSequences[year].toString() });
                } else {
                    await base44.asServiceRole.entities.SystemConfig.create({ 
                        key_name: configKey, 
                        value: yearSequences[year].toString(), 
                        description: `Case sequence counter for year ${year}` 
                    });
                }
            }

            await Promise.all(updates);

            return Response.json({ success: true, migrated_count: updates.length });
            }

            if (action === 'toggle_redaction') {
            if (user.role !== 'admin' && !user.is_admin) {
                return Response.json({ error: 'Unauthorized: Only admins can redact fields' }, { status: 403 });
            }

            const { caseId, field, isRedacted } = data;
            if (!caseId || !field) {
                return Response.json({ error: "Missing caseId or field" }, { status: 400 });
            }

            const existing = await base44.asServiceRole.entities.MyCase.get(caseId);
            if (!existing) {
                return Response.json({ error: "Case not found" }, { status: 404 });
            }

            let redactedFields = existing.redacted_fields || [];
            if (isRedacted) {
                if (!redactedFields.includes(field)) redactedFields.push(field);
            } else {
                redactedFields = redactedFields.filter(f => f !== field);
            }

            const updatedCase = await base44.asServiceRole.entities.MyCase.update(caseId, { 
                redacted_fields: redactedFields,
                last_activity: new Date().toISOString()
            });

            // Log Audit
            await base44.asServiceRole.entities.AuditLog.create({
                action_type: 'settings_updated', // Using existing enum
                action_category: 'security',
                description: `Case ${existing.case_number} field '${field}' ${isRedacted ? 'redacted' : 'unredacted'}`,
                severity: 'medium',
                metadata: JSON.stringify({ 
                    case_id: caseId, 
                    field, 
                    redacted: isRedacted,
                    performed_by: user.email
                }),
                created_by: user.email
            });

            return Response.json({ success: true, case: updatedCase });
            }

            return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});