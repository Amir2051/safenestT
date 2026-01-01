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

        if (action === 'create' || action === 'create_for_user') {
            // Admin check for create_for_user
            if (action === 'create_for_user') {
                if (user.role !== 'admin' && !user.is_admin) {
                    return Response.json({ error: 'Unauthorized: Only admins can create cases for others' }, { status: 403 });
                }
            }

            const { victim_wallet, scammer_wallet, target_user_email, target_user_name } = data;

            // 0. DUPLICATE CHECK (Prevent double submissions)
            // Check for identical case created by same user in last 24h
            try {
                const recentCases = await base44.asServiceRole.entities.MyCase.filter({
                    created_by: user.email.toLowerCase(),
                    issue_type: data.issue_type || 'other',
                    status: 'Pending'
                });
                
                for (const rc of recentCases) {
                    // Check if critical fields match (Scammer Wallet OR Amount if wallet missing)
                    const sameWallet = rc.scammer_wallet && data.scammer_wallet && 
                                      rc.scammer_wallet.toLowerCase() === data.scammer_wallet.toLowerCase();
                    const sameAmount = Math.abs((rc.amount_lost || 0) - (data.amount_lost || 0)) < 1; // within $1
                    
                    if (sameWallet || (sameAmount && !rc.scammer_wallet && !data.scammer_wallet)) {
                        return Response.json({ 
                            error: "Duplicate Case Detected. You already have a pending case with these details.",
                            duplicate: true,
                            case_id: rc.id
                        }, { status: 409 });
                    }
                }
            } catch (dupErr) {
                console.error("Duplicate check failed", dupErr);
            }

            // 1. Mandatory Wallet Validation
            const validateWallet = (addr) => {
                if (!addr) return null;
                if (/^0x[a-fA-F0-9]{40}$/.test(addr)) return "ethereum";
                if (/^(1|3)[a-zA-Z0-9]{25,34}$|^bc1[a-zA-Z0-9]{39,59}$/.test(addr)) return "bitcoin";
                if (/^T[a-zA-Z0-9]{33}$/.test(addr)) return "tron";
                return null;
            };

            // Only scammer wallet is strictly required for tracking, victim wallet is optional
            const scammerNet = validateWallet(scammer_wallet);
            const victimNet = victim_wallet ? validateWallet(victim_wallet) : null;

            if (!scammerNet) {
                return Response.json({ error: "Scammer wallet is required and must be a valid format (ETH, BTC, TRON)." }, { status: 400 });
            }
            
            // If victim wallet is provided but invalid, warn or ignore? 
            // Better to fail if provided but invalid to avoid data bad entry, but let's be lenient or check if it was intended.
            if (victim_wallet && !victimNet) {
                 return Response.json({ error: "Victim wallet provided is invalid. Please check the format or leave it empty." }, { status: 400 });
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
            
            // Determine Creator/Owner
            let creatorEmail = user.email.toLowerCase();
            let creatorName = user.full_name || user.first_name;
            
            // Find User ID for Robust RLS
            let ownerUserId = user.id;
            
            // If admin creating for user, override creator fields to target user
            if (action === 'create_for_user' && target_user_email) {
                creatorEmail = target_user_email.toLowerCase();
                creatorName = target_user_name || 'User';
                
                // Lookup target user ID
                try {
                    const targetUsers = await base44.asServiceRole.entities.User.list(null, 1000);
                    const targetUser = targetUsers.find(u => u.email?.toLowerCase() === creatorEmail);
                    if (targetUser) ownerUserId = targetUser.id;
                } catch(e) { console.error("Failed to lookup target user", e); }
            }

            // 🚨 CRITICAL VISIBILITY ENFORCEMENT
            // Create Case with ALL ownership fields for guaranteed visibility
            const caseData = {
                // PRIMARY OWNERSHIP FIELD - Required for RLS
                user_id: ownerUserId,
                
                // Merge input data
                ...data,
                
                // Case identifier
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
                
                // 🔒 VISIBILITY GUARANTEE: ALL ownership fields MUST be consistent
                // RLS reads: user_id, created_by, client_email, created_by_email
                created_by: creatorEmail,
                created_by_email: creatorEmail,
                created_by_name: creatorName,
                client_email: creatorEmail,  // CRITICAL for user visibility
                client_name: creatorName || data.client_name,
                
                // Activity tracking
                last_activity: new Date().toISOString(),
                
                // Admin metadata
                created_by_admin: action === 'create_for_user',
                admin_creator_email: action === 'create_for_user' ? user.email : null,
                
                // Ensure metadata is stringified if present
                metadata: typeof data.metadata === 'object' ? JSON.stringify(data.metadata) : data.metadata
            };
            
            // Validation log for audit
            console.log(`✅ Creating case with ownership: user_id=${ownerUserId}, created_by=${creatorEmail}, client_email=${creatorEmail}`);

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

            // 🔥 CRITICAL: Use asServiceRole to bypass RLS during creation
            // This ensures the case is ALWAYS created regardless of RLS rules
            const newCase = await base44.asServiceRole.entities.MyCase.create(caseData);
            
            // 🚨 IMMEDIATE VERIFICATION: Confirm case was created successfully
            console.log(`✅ CASE CREATED: ID=${newCase.id}, Number=${newCase.case_number}, Owner=${creatorEmail}`);
            
            // Double-check visibility by fetching back
            const verifyCase = await base44.asServiceRole.entities.MyCase.get(newCase.id);
            if (!verifyCase) {
                console.error(`❌ CRITICAL: Case ${newCase.id} created but not readable!`);
                throw new Error("Case creation verification failed");
            }

            // AUTOMATION: Notify User if Created by Admin
            if (action === 'create_for_user' && target_user_email) {
                try {
                    await base44.integrations.Core.SendEmail({
                        to: target_user_email,
                        subject: `New Case Created: ${newCase.case_number}`,
                        body: `
                            <div style="font-family: Arial, sans-serif;">
                                <h2>Case Created on Your Behalf</h2>
                                <p>Hello ${target_user_name || 'User'},</p>
                                <p>A new investigation case has been created for you by the SafeNestT team.</p>
                                <p><strong>Case ID:</strong> ${newCase.case_number}</p>
                                <p><strong>Title:</strong> ${newCase.issue_type}</p>
                                <p>You can view and manage this case in your dashboard under "My Cases".</p>
                                <a href="https://safenestt.com/dashboard/cases" style="background-color: #0891b2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Case</a>
                            </div>
                        `
                    });
                } catch (e) {
                    console.error("Failed to send user notification email", e);
                }
            }

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

            // 🚨 FINAL AUDIT LOG: Record successful creation
            await base44.asServiceRole.entities.AuditLog.create({
                action_type: 'settings_updated',
                action_category: 'security', 
                description: `Case ${caseId} created by ${creatorEmail}. Status: Pending. Amount: $${caseData.amount_lost}`,
                severity: 'high',
                metadata: JSON.stringify({
                    case_id: newCase.id,
                    case_number: caseId,
                    user_email: creatorEmail,
                    user_id: ownerUserId,
                    amount: caseData.amount_lost,
                    action: 'case_created',
                    timestamp: new Date().toISOString()
                }),
                created_by: user.email
            }).catch(e => console.error("Audit log failed:", e));
            
            return Response.json({ success: true, case: newCase });
        }

        if (action === 'update') {
            const { id, updates } = data;
            if (!id) return Response.json({ error: "Missing case ID" }, { status: 400 });

            // Ensure numeric fields are numbers
            if (updates.amount_lost !== undefined) updates.amount_lost = parseFloat(updates.amount_lost) || 0;
            if (updates.amount_stolen_usd !== undefined) updates.amount_stolen_usd = parseFloat(updates.amount_stolen_usd) || 0;
            
            // Track recovery amount changes for workflow triggers
            const oldRecoveryAmount = updates.recovery_amount !== undefined ? null : undefined;
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

                    // WORKFLOW TRIGGER: Law Enforcement Status
                    if (updates.status === 'law_enforcement') {
                        base44.asServiceRole.functions.invoke('workflowAutomation', {
                            trigger_type: 'case_status_law_enforcement',
                            trigger_data: { case_id: id }
                        }).catch(e => console.error("Workflow trigger failed:", e));
                    }

                    // AUTOMATION 1: Trigger Workflow Tasks for 'Investigating'
                    if (updates.status.toLowerCase() === 'investigating' && existing.status.toLowerCase() !== 'investigating') {
                        const tasks = [
                            { title: "Initial Victim Contact", description: "Reach out to the victim to confirm details and gather additional evidence.", priority: "high" },
                            { title: "Trace Funds on Blockchain", description: "Use tracking tools to follow the stolen funds to a centralized exchange.", priority: "critical" },
                            { title: "Check for Linked Cases", description: "Search database for similar wallet addresses or scammer profiles.", priority: "medium" },
                            { title: "File Preliminary Report", description: "Draft the initial investigation findings.", priority: "medium" }
                        ];

                        for (const task of tasks) {
                            await base44.asServiceRole.entities.CaseTask.create({
                                case_id: id,
                                title: task.title,
                                description: task.description,
                                assigned_to: existing.assigned_to || user.email, // Assign to case owner or current user
                                assigned_by: 'system_automation',
                                status: 'todo',
                                priority: task.priority,
                                due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours due
                            });
                        }
                    }

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

                // WORKFLOW TRIGGER: Priority Escalation
                if (updates.priority && (updates.priority === 'high' || updates.priority === 'critical')) {
                    if (existing.priority !== updates.priority) {
                        base44.asServiceRole.functions.invoke('workflowAutomation', {
                            trigger_type: 'priority_escalation',
                            trigger_data: { case_id: id, priority: updates.priority }
                        }).catch(e => console.error("Priority workflow failed:", e));
                    }
                }

                // WORKFLOW TRIGGER: Recovery Amount Updated
                if (updates.recovery_amount !== undefined && oldRecoveryAmount !== undefined) {
                    if (updates.recovery_amount > (existing.recovery_amount || 0)) {
                        base44.asServiceRole.functions.invoke('workflowAutomation', {
                            trigger_type: 'recovery_amount_updated',
                            trigger_data: {
                                case_id: id,
                                old_amount: existing.recovery_amount || 0,
                                new_amount: updates.recovery_amount
                            }
                        }).catch(e => console.error("Recovery workflow failed:", e));
                    }
                }

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

            if (action === 'recover_access') {
                if (user.role !== 'admin' && !user.is_admin) {
                    return Response.json({ error: 'Unauthorized' }, { status: 403 });
                }

                // 1. Fetch ALL data (Cases and Users) to perform deep linking
                const cases = await base44.asServiceRole.entities.MyCase.list(null, 5000);
                const users = await base44.asServiceRole.entities.User.list(null, 5000);

                let updatedCount = 0;
                let fixedDates = 0;
                let reLinked = 0;
                let userIdFixed = 0;

                // Map users by normalized email AND ID for comprehensive lookup
                const userMap = {};
                const userByEmail = {};
                users.forEach(u => {
                    if (u.email) {
                        const normalizedEmail = u.email.toLowerCase().trim();
                        userMap[normalizedEmail] = u;
                        userByEmail[normalizedEmail] = u;
                    }
                    if (u.id) {
                        userMap[u.id] = u;
                    }
                });

                for (const c of cases) {
                    let updates = {};
                    let needsUpdate = false;

                    // --- A. Date Recovery ---
                    if (!c.created_date || c.created_date === 'Invalid Date' || c.created_date.startsWith('0000')) {
                        let date = new Date().toISOString();
                        if (c.case_number && c.case_number.startsWith('SN-')) {
                            const parts = c.case_number.split('-');
                            if (parts[1] && !isNaN(parts[1]) && parts[1].length === 4) {
                                date = new Date(`${parts[1]}-01-01T12:00:00Z`).toISOString();
                            }
                        } else if (c.updated_date) {
                            date = c.updated_date;
                        }
                        updates.created_date = date;
                        fixedDates++;
                        needsUpdate = true;
                    }

                    // --- B. User Re-linking (COMPREHENSIVE Fix) ---
                    let targetUser = null;
                    let targetEmail = null;

                    // Priority 1: Find user by user_id
                    if (c.user_id && userMap[c.user_id]) {
                        targetUser = userMap[c.user_id];
                        targetEmail = targetUser.email;
                    }

                    // Priority 2: Find by created_by
                    if (!targetUser && c.created_by && typeof c.created_by === 'string') {
                        const normalized = c.created_by.toLowerCase().trim();
                        if (userByEmail[normalized]) {
                            targetUser = userByEmail[normalized];
                            targetEmail = targetUser.email;
                        }
                    }

                    // Priority 3: Find by client_email
                    if (!targetUser && c.client_email && typeof c.client_email === 'string') {
                        const normalized = c.client_email.toLowerCase().trim();
                        if (userByEmail[normalized]) {
                            targetUser = userByEmail[normalized];
                            targetEmail = targetUser.email;
                        }
                    }

                    // Priority 4: Find by created_by_email
                    if (!targetUser && c.created_by_email && typeof c.created_by_email === 'string') {
                        const normalized = c.created_by_email.toLowerCase().trim();
                        if (userByEmail[normalized]) {
                            targetUser = userByEmail[normalized];
                            targetEmail = targetUser.email;
                        }
                    }

                    // Apply ALL critical fields for RLS visibility
                    if (targetUser && targetEmail) {
                        // CRITICAL: Set user_id for robust RLS matching
                        if (c.user_id !== targetUser.id) {
                            updates.user_id = targetUser.id;
                            userIdFixed++;
                            needsUpdate = true;
                        }

                        // Normalize ALL email fields to match exact user.email
                        if (c.created_by !== targetEmail) { 
                            updates.created_by = targetEmail; 
                            needsUpdate = true; 
                            reLinked++;
                        }
                        if (c.created_by_email !== targetEmail) { 
                            updates.created_by_email = targetEmail; 
                            needsUpdate = true; 
                        }
                        if (c.client_email !== targetEmail) { 
                            updates.client_email = targetEmail; 
                            needsUpdate = true; 
                        }

                        // Set client_name if missing but we have user name
                        if (!c.client_name && targetUser.full_name) {
                            updates.client_name = targetUser.full_name;
                            needsUpdate = true;
                        }
                    } else {
                        // Orphaned case - sync internal fields at minimum
                        if (!c.created_by && c.client_email) { 
                            updates.created_by = c.client_email; 
                            needsUpdate = true; 
                        }
                        if (!c.created_by_email && c.created_by) { 
                            updates.created_by_email = c.created_by; 
                            needsUpdate = true; 
                        }
                        if (!c.client_email && c.created_by) {
                            updates.client_email = c.created_by;
                            needsUpdate = true;
                        }
                    }

                    // --- C. Status Safety ---
                    if (!c.status) {
                        updates.status = 'Pending';
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        await base44.asServiceRole.entities.MyCase.update(c.id, updates);
                        updatedCount++;
                    }
                }

                return Response.json({ 
                    success: true, 
                    message: `Recovery Complete.\nScanned: ${cases.length}\nUpdated: ${updatedCount}\nFixed Dates: ${fixedDates}\nRe-linked Users: ${reLinked}\nUser IDs Fixed: ${userIdFixed}`,
                    details: { 
                        total_cases: cases.length, 
                        updated: updatedCount,
                        user_id_fixed: userIdFixed,
                        emails_normalized: reLinked 
                    }
                });
            }

            if (action === 'import_all_legacy_cases') {
                if (user.role !== 'admin' && !user.is_admin) {
                    return Response.json({ error: 'Unauthorized' }, { status: 403 });
                }

                let stats = { imported: 0, updated: 0, skipped: 0, errors: 0 };
                const importedIds = [];

                try {
                    // FETCH ALL SOURCES
                    const [
                        myCases,
                        scamReports,
                        investigationCases,
                        clientCases,
                        fraudCases
                    ] = await Promise.all([
                        base44.asServiceRole.entities.MyCase.list(null, 10000),
                        base44.asServiceRole.entities.ScamDatabase.list(null, 5000),
                        base44.asServiceRole.entities.InvestigationCase.list(null, 2000).catch(() => []),
                        base44.asServiceRole.entities.ClientCase.list(null, 2000).catch(() => []),
                        base44.asServiceRole.entities.FraudCase.list(null, 2000).catch(() => [])
                    ]);

                    // Helper: Check if already imported
                    // We check metadata for source_id match, or fallback to exact description/creator match
                    const findExisting = (sourceId, uniqueDesc, creator) => {
                        return myCases.find(c => 
                            (c.metadata && typeof c.metadata === 'string' && c.metadata.includes(sourceId)) ||
                            (c.description === uniqueDesc && c.created_by === creator) ||
                            (c.case_number === sourceId) // Some might have used case number as ID
                        );
                    };

                    const importRecord = async (sourceRecord, sourceType, mapFn) => {
                        try {
                            // SKIP: If record is already a MyCase (shouldn't happen given logic, but safety)
                            if (sourceType === 'MyCase') return;

                            const existing = findExisting(sourceRecord.id, sourceRecord.description || sourceRecord.case_title, sourceRecord.created_by);
                            
                            if (existing) {
                                // UPDATE: Only sync missing/empty critical fields to avoid overwriting admin edits
                                let updates = {};
                                const mapped = mapFn(sourceRecord);
                                
                                // Fields to check for updates
                                const checkFields = ['amount_lost', 'scammer_wallet', 'transaction_hash', 'victim_wallet'];
                                checkFields.forEach(field => {
                                    if (!existing[field] && mapped[field]) {
                                        updates[field] = mapped[field];
                                    }
                                });

                                if (Object.keys(updates).length > 0) {
                                    await base44.asServiceRole.entities.MyCase.update(existing.id, updates);
                                    stats.updated++;
                                } else {
                                    stats.skipped++;
                                }
                            } else {
                                // CREATE NEW COPY
                                const mapped = mapFn(sourceRecord);
                                
                                // Generate Case ID if missing
                                if (!mapped.case_number || !mapped.case_number.startsWith('SN-')) {
                                    const date = mapped.created_date ? new Date(mapped.created_date) : new Date();
                                    const year = date.getFullYear();
                                    const seq = await getNextSequence(base44, year);
                                    mapped.case_number = `SN-${year}-${seq.toString().padStart(5, '0')}`;
                                }

                                // Append Metadata
                                mapped.metadata = JSON.stringify({
                                    source_id: sourceRecord.id,
                                    source_type: sourceType,
                                    imported_at: new Date().toISOString(),
                                    original_data: JSON.stringify(sourceRecord).substring(0, 500) // Truncate to save space
                                });

                                await base44.asServiceRole.entities.MyCase.create(mapped);
                                stats.imported++;
                                importedIds.push(mapped.case_number);
                            }
                        } catch (err) {
                            console.error(`Error importing ${sourceType} ${sourceRecord.id}:`, err);
                            stats.errors++;
                        }
                    };

                    // 1. IMPORT SCAM DATABASE (Reports)
                    for (const rec of scamReports) {
                        await importRecord(rec, 'ScamDatabase', (r) => ({
                            client_name: r.reporter_name || r.created_by_name || 'Anonymous',
                            client_email: r.created_by || 'unknown',
                            issue_type: 'scam_report',
                            status: 'Pending', // Default for reports
                            description: r.scam_description || 'Imported Scam Report',
                            amount_lost: r.total_stolen_usd || 0,
                            scammer_wallet: r.scam_type === 'wallet' ? r.identifier : null,
                            blockchain: r.blockchain,
                            created_by: r.created_by,
                            created_date: r.created_date
                        }));
                    }

                    // 2. IMPORT INVESTIGATION CASES (Legacy)
                    for (const rec of investigationCases) {
                        await importRecord(rec, 'InvestigationCase', (r) => ({
                            client_name: r.client_name || 'Unknown',
                            client_email: r.client_email || r.created_by,
                            issue_type: r.fraud_type || 'other',
                            status: r.status || 'Pending',
                            description: r.description || r.case_title,
                            amount_lost: r.amount_lost || 0,
                            scammer_wallet: r.scammer_wallet,
                            victim_wallet: r.victim_wallet,
                            blockchain: r.blockchain,
                            created_by: r.created_by,
                            created_date: r.created_date,
                            assigned_to: r.assigned_to
                        }));
                    }

                    // 3. IMPORT CLIENT CASES (Legacy)
                    for (const rec of clientCases) {
                        await importRecord(rec, 'ClientCase', (r) => ({
                            client_name: r.client_name || r.created_by_name || 'Unknown',
                            client_email: r.client_email || r.created_by_email || r.created_by,
                            issue_type: r.issue_type || 'other',
                            status: r.status || 'Pending',
                            description: r.description,
                            amount_lost: r.amount_lost || 0,
                            scammer_wallet: r.scammer_wallet,
                            victim_wallet: r.victim_wallet,
                            created_by: r.created_by,
                            created_date: r.created_date,
                            evidence_files: r.evidence_files
                        }));
                    }

                    // 4. IMPORT FRAUD CASES (Legacy)
                    for (const rec of fraudCases) {
                        await importRecord(rec, 'FraudCase', (r) => ({
                            client_name: r.victim_contact_info?.name || 'Unknown',
                            client_email: r.victim_contact_info?.email || r.created_by,
                            phone_number: r.victim_contact_info?.phone,
                            issue_type: r.fraud_type || 'scam',
                            status: r.status === 'reported' ? 'Pending' : r.status,
                            description: r.description,
                            amount_lost: r.amount_stolen || r.amount_stolen_usd || 0,
                            cryptocurrency: r.currency_type === 'USD' ? '' : r.currency_type,
                            blockchain: r.blockchain,
                            scammer_wallet: r.scammer_wallet,
                            scammer_info: r.suspect_details,
                            created_by: r.created_by,
                            created_date: r.created_date || r.incident_date
                        }));
                    }

                    return Response.json({ 
                        success: true, 
                        message: `Full Import Complete.\nImported: ${stats.imported}\nUpdated: ${stats.updated}\nSkipped: ${stats.skipped}\nErrors: ${stats.errors}`,
                        stats 
                    });

                } catch (e) {
                    return Response.json({ error: e.message }, { status: 500 });
                }
            }

            if (action === 'merge_cases') {
                if (user.role !== 'admin' && !user.is_admin) {
                    return Response.json({ error: 'Unauthorized' }, { status: 403 });
                }

                const { caseIds } = data;
                if (!caseIds || !Array.isArray(caseIds) || caseIds.length < 2) {
                    return Response.json({ error: "Please select at least 2 cases to merge." }, { status: 400 });
                }

                // Fetch all cases to be merged
                // We fetch one by one or filter if supported. 
                // Given the API limitations, parallel fetch is safer.
                const cases = await Promise.all(caseIds.map(id => base44.asServiceRole.entities.MyCase.get(id)));
                
                if (cases.some(c => !c)) {
                    return Response.json({ error: "One or more cases not found." }, { status: 404 });
                }

                // 1. Verify Same User
                // We use 'client_email' as primary, fallback to 'created_by'. 
                // This ensures admin-created cases (where created_by=admin) match user-created cases (where created_by=user)
                // provided the client_email is consistent.
                const getOwner = (c) => (c.client_email || c.created_by || '').toLowerCase().trim();
                const primaryOwner = getOwner(cases[0]);
                
                // Allow merge if ANY of the identifiers match (client_email OR created_by)
                // This is a more permissive check to handle cases where email might be in one field but not the other
                const isSameUser = cases.every(c => {
                    const cClient = (c.client_email || '').toLowerCase().trim();
                    const cCreated = (c.created_by || '').toLowerCase().trim();
                    return cClient === primaryOwner || cCreated === primaryOwner;
                });

                if (!isSameUser) {
                    return Response.json({ error: "All selected cases must belong to the same user." }, { status: 400 });
                }

                // 2. Aggregate Data
                let totalLoss = 0;
                let walletAddresses = new Set();
                let transactionRecords = [];
                let evidenceIndex = [];
                let scamList = []; // Timeline

                for (const c of cases) {
                    totalLoss += (c.amount_lost || c.amount_stolen_usd || 0);
                    
                    if (c.scammer_wallet) walletAddresses.add(c.scammer_wallet);
                    if (c.monitored_wallets) c.monitored_wallets.forEach(w => walletAddresses.add(w));
                    
                    // Transactions
                    if (c.transactions) {
                        transactionRecords = [...transactionRecords, ...c.transactions];
                    }

                    // Evidence
                    if (c.evidence_files) {
                        c.evidence_files.forEach(e => {
                            evidenceIndex.push({
                                url: e.url,
                                name: e.name,
                                source_case: c.case_number || c.id,
                                type: e.type || 'file'
                            });
                        });
                    }

                    // Timeline / Scam List
                    scamList.push({
                        date: c.incident_date || c.created_date,
                        platform: c.platform || 'Unknown', // Assuming platform field might exist or default
                        method: c.issue_type,
                        amount: c.amount_lost || 0,
                        case_id: c.case_number || c.id
                    });
                }

                // Sort timeline
                scamList.sort((a, b) => new Date(a.date) - new Date(b.date));

                // 3. Create MasterCase (Profile Case)
                const profileCase = await base44.asServiceRole.entities.MasterCase.create({
                    user_id: primaryOwner,
                    linked_case_ids: caseIds,
                    merged_summary: `Profile Case consolidated from ${cases.length} incidents. Total loss: $${totalLoss.toLocaleString()}.`,
                    scam_list: scamList,
                    wallet_addresses: Array.from(walletAddresses),
                    transaction_records: transactionRecords,
                    evidence_index: evidenceIndex,
                    total_loss: totalLoss,
                    status: 'draft',
                    generated_date: new Date().toISOString()
                });

                // 4. Log Action
                await base44.asServiceRole.entities.AuditLog.create({
                    action_type: 'settings_updated', // Reuse or add new enum if possible (using closest existing)
                    action_category: 'security',
                    description: `Admin ${user.email} merged ${cases.length} cases into Profile Case ${profileCase.id}`,
                    severity: 'high',
                    created_by: user.email,
                    metadata: JSON.stringify({ merged_cases: caseIds, profile_case_id: profileCase.id })
                });

                return Response.json({ success: true, profileCase });
            }

            return Response.json({ error: 'Invalid action' }, { status: 400 });

            if (action === 'import_to_master_profile') {
                if (user.role !== 'admin' && !user.is_admin) {
                    return Response.json({ error: 'Unauthorized' }, { status: 403 });
                }

                // 1. Fetch ALL MyCases
                const allCases = await base44.asServiceRole.entities.MyCase.list(null, 5000);
                
                // 2. Group by User (client_email)
                const userGroups = {};
                for (const c of allCases) {
                    const owner = (c.client_email || c.created_by || 'unknown').toLowerCase().trim();
                    if (!userGroups[owner]) userGroups[owner] = [];
                    userGroups[owner].push(c);
                }

                let createdCount = 0;
                let updatedCount = 0;
                let pdfErrors = [];

                // 3. Process Groups
                for (const [userId, cases] of Object.entries(userGroups)) {
                    if (userId === 'unknown') continue;

                    // Check if MasterCase exists for this user
                    const existingMasters = await base44.asServiceRole.entities.MasterCase.filter({ user_id: userId });
                    
                    if (existingMasters.length > 0) {
                        // Update existing? Or skip?
                        // Let's ensure all cases are linked
                        const master = existingMasters[0];
                        const currentLinks = new Set(master.linked_case_ids || []);
                        let changed = false;
                        
                        cases.forEach(c => {
                            if (!currentLinks.has(c.id)) {
                                currentLinks.add(c.id);
                                changed = true;
                            }
                        });

                        if (changed) {
                            await base44.asServiceRole.entities.MasterCase.update(master.id, {
                                linked_case_ids: Array.from(currentLinks),
                                total_loss: cases.reduce((sum, c) => sum + (c.amount_lost || 0), 0)
                            });
                            updatedCount++;
                        }
                    } else {
                        // Create New MasterCase Profile
                        const totalLoss = cases.reduce((sum, c) => sum + (c.amount_lost || 0), 0);
                        
                        // Aggregate minimal data
                        const scamList = cases.map(c => ({
                            date: c.incident_date || c.created_date,
                            platform: c.platform || 'Unknown',
                            method: c.issue_type || 'Unknown',
                            amount: c.amount_lost || 0,
                            case_id: c.case_number || c.id
                        })).sort((a, b) => new Date(a.date) - new Date(b.date));

                        const newMaster = await base44.asServiceRole.entities.MasterCase.create({
                            user_id: userId,
                            linked_case_ids: cases.map(c => c.id),
                            merged_summary: `Auto-generated profile for ${userId}. Contains ${cases.length} cases.`,
                            scam_list: scamList,
                            total_loss: totalLoss,
                            status: 'draft',
                            generated_date: new Date().toISOString()
                        });
                        createdCount++;

                        const newMaster = await base44.asServiceRole.entities.MasterCase.create({
                            user_id: userId,
                            linked_case_ids: cases.map(c => c.id),
                            merged_summary: `Auto-generated profile for ${userId}. Contains ${cases.length} cases.`,
                            scam_list: scamList,
                            total_loss: totalLoss,
                            status: 'draft',
                            generated_date: new Date().toISOString()
                        });
                        createdCount++;

                        // GENERATE PDF
                        const profileData = {
                            victim_profile: {
                                identifier: userId,
                                contact_method: 'Email',
                                platforms: scamList.map(s => s.platform).filter((v, i, a) => a.indexOf(v) === i).join(', '),
                                loss_amount: totalLoss,
                                date_range: `${scamList[0]?.date || 'N/A'} - ${scamList[scamList.length-1]?.date || 'N/A'}`,
                                statement: `Aggregated profile for user ${userId} involving ${cases.length} linked cases.`
                            },
                            suspect_profile: {
                                scam_type: 'Multiple / Aggregated',
                                wallets: cases.map(c => c.scammer_wallet).filter(Boolean).join('\n')
                            },
                            linked_intelligence: {
                                summary: {
                                    total_linked: cases.length,
                                    total_loss: totalLoss,
                                    campaign_assessment: 'Multi-case correlation confirmed via Master Profile Import.'
                                },
                                linked_cases: cases.map(c => ({
                                    case_number: c.case_number || c.id,
                                    loss_amount: c.amount_lost || 0,
                                    match_type: 'User ID',
                                    match_value: userId,
                                    confidence: 'High'
                                }))
                            },
                            evidence_summary: `Total of ${cases.reduce((sum, c) => sum + (c.evidence_files?.length || 0), 0)} evidence files aggregated across all cases.`
                        };

                        const caseData = {
                            case_number: `PROF-${newMaster.id.slice(0, 6).toUpperCase()}`,
                            issue_type: 'Master Profile',
                            created_date: newMaster.generated_date,
                            status: 'Draft'
                        };

                        // TRIGGER PDF GENERATION
                        try {
                            const pdfRes = await base44.asServiceRole.functions.invoke('autoGenerateProfilePdf', {
                                masterCaseId: newMaster.id,
                                profileData: profileData,
                                caseData: caseData
                            });
                            
                            if (pdfRes.data?.error) {
                                pdfErrors.push({ userId, error: pdfRes.data.error });
                            }
                        } catch (e) {
                            console.error("AutoPDF Trigger Failed for " + userId, e);
                            pdfErrors.push({ userId, error: e.message });
                        }
                    }
                }

                let msg = `Import Complete. Created ${createdCount} new profiles. Updated ${updatedCount} existing profiles.`;
                if (pdfErrors.length > 0) {
                    msg += ` PDF Generation failed for ${pdfErrors.length} profiles. Check logs.`;
                } else {
                    msg += ` All PDFs generated successfully.`;
                }

                return Response.json({ 
                    success: true, 
                    message: msg,
                    pdfErrors: pdfErrors.length > 0 ? pdfErrors : undefined
                });
            }

            return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function triggerAIAnalysis(base44, { caseId }) {
  try {
    const cases = await base44.asServiceRole.entities.MyCase.filter({ id: caseId });
    if (cases.length === 0) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    const caseData = cases[0];
    
    const response = await base44.functions.invoke('fraudDetectionAI', {
      action: 'analyze_case',
      data: { caseId, caseData }
    });

    return Response.json({ success: true, analysis: response.data });
  } catch (error) {
    console.error('AI trigger error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}