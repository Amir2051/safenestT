import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * 🚨 EMERGENCY DATA RECOVERY FUNCTION
 * Scans ALL entities for submitted cases and recovers orphaned/lost data
 * Maps all records to MyCase with proper user associations
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);
        
        if (!user || (user.role !== 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
        }

        const { action } = await req.json();

        if (action === 'audit') {
            // SCAN ALL CASE-RELATED ENTITIES
            console.log('🔍 Starting comprehensive audit...');
            
            const [
                myCases,
                clientCases,
                fraudCases,
                investigationCases,
                scamReports,
                allUsers,
                auditLogs,
                timelineEvents
            ] = await Promise.all([
                base44.asServiceRole.entities.MyCase.list(null, 10000).catch(() => []),
                base44.asServiceRole.entities.ClientCase.list(null, 10000).catch(() => []),
                base44.asServiceRole.entities.FraudCase.list(null, 10000).catch(() => []),
                base44.asServiceRole.entities.InvestigationCase.list(null, 10000).catch(() => []),
                base44.asServiceRole.entities.ScamDatabase.list(null, 10000).catch(() => []),
                base44.asServiceRole.entities.User.list(null, 5000).catch(() => []),
                base44.asServiceRole.entities.AuditLog.list('-created_date', 1000).catch(() => []),
                base44.asServiceRole.entities.CaseTimelineEvent.list('-created_date', 1000).catch(() => [])
            ]);

            // Calculate totals
            const totalLossMyCases = myCases.reduce((sum, c) => sum + (c.amount_lost || 0), 0);
            const totalLossClient = clientCases.reduce((sum, c) => sum + (c.amount_lost || 0), 0);
            const totalLossFraud = fraudCases.reduce((sum, c) => sum + (c.amount_stolen_usd || 0), 0);
            const totalLossInvestigation = investigationCases.reduce((sum, c) => sum + (c.amount_lost || 0), 0);
            const totalLossScams = scamReports.reduce((sum, c) => sum + (c.total_stolen_usd || 0), 0);

            // Find unique users who submitted cases
            const userEmails = new Set();
            [...myCases, ...clientCases, ...fraudCases, ...investigationCases].forEach(c => {
                if (c.created_by) userEmails.add(c.created_by.toLowerCase());
                if (c.client_email) userEmails.add(c.client_email.toLowerCase());
                if (c.created_by_email) userEmails.add(c.created_by_email.toLowerCase());
            });

            // Check for orphaned cases (cases without matching users)
            const orphanedCases = [];
            const userMap = {};
            allUsers.forEach(u => {
                if (u.email) userMap[u.email.toLowerCase()] = u;
            });

            myCases.forEach(c => {
                const hasUser = 
                    (c.created_by && userMap[c.created_by.toLowerCase()]) ||
                    (c.client_email && userMap[c.client_email.toLowerCase()]);
                if (!hasUser) orphanedCases.push(c);
            });

            return Response.json({
                success: true,
                audit_timestamp: new Date().toISOString(),
                summary: {
                    total_users: allUsers.length,
                    users_with_submissions: userEmails.size,
                    total_cases_all_entities: myCases.length + clientCases.length + fraudCases.length + investigationCases.length + scamReports.length,
                    total_reported_losses: totalLossMyCases + totalLossClient + totalLossFraud + totalLossInvestigation + totalLossScams
                },
                breakdown: {
                    myCase: { count: myCases.length, total_loss: totalLossMyCases },
                    clientCase: { count: clientCases.length, total_loss: totalLossClient },
                    fraudCase: { count: fraudCases.length, total_loss: totalLossFraud },
                    investigationCase: { count: investigationCases.length, total_loss: totalLossInvestigation },
                    scamDatabase: { count: scamReports.length, total_loss: totalLossScams }
                },
                data_quality: {
                    orphaned_cases_count: orphanedCases.length,
                    orphaned_cases: orphanedCases.map(c => ({
                        id: c.id,
                        case_number: c.case_number,
                        created_by: c.created_by,
                        client_email: c.client_email,
                        amount: c.amount_lost
                    }))
                },
                recommendations: [
                    clientCases.length > 0 && "Run recover action to migrate ClientCase → MyCase",
                    fraudCases.length > 0 && "Run recover action to migrate FraudCase → MyCase",
                    investigationCases.length > 0 && "Run recover action to migrate InvestigationCase → MyCase",
                    orphanedCases.length > 0 && "Run recover action to fix orphaned case ownership"
                ].filter(Boolean)
            });
        }

        if (action === 'recover') {
            console.log('🔧 Starting EMERGENCY DATA RECOVERY...');
            
            const stats = {
                recovered: 0,
                updated: 0,
                errors: [],
                details: []
            };

            // Fetch all data sources
            const [allUsers, myCases, clientCases, fraudCases, investigationCases, scamReports] = await Promise.all([
                base44.asServiceRole.entities.User.list(null, 5000),
                base44.asServiceRole.entities.MyCase.list(null, 10000),
                base44.asServiceRole.entities.ClientCase.list(null, 10000).catch(() => []),
                base44.asServiceRole.entities.FraudCase.list(null, 10000).catch(() => []),
                base44.asServiceRole.entities.InvestigationCase.list(null, 10000).catch(() => []),
                base44.asServiceRole.entities.ScamDatabase.list(null, 10000).catch(() => [])
            ]);

            // Build user lookup maps
            const userByEmail = {};
            const userById = {};
            allUsers.forEach(u => {
                if (u.email) userByEmail[u.email.toLowerCase().trim()] = u;
                if (u.id) userById[u.id] = u;
            });

            // Helper: Find user for a case
            const findUser = (record) => {
                // Try multiple fields
                const emails = [
                    record.created_by,
                    record.client_email,
                    record.created_by_email,
                    record.victim_contact_info?.email,
                    record.victim_email
                ].filter(Boolean).map(e => e.toLowerCase().trim());

                for (const email of emails) {
                    if (userByEmail[email]) return userByEmail[email];
                }

                // Try user_id
                if (record.user_id && userById[record.user_id]) {
                    return userById[record.user_id];
                }

                return null;
            };

            // Helper: Check if case already exists in MyCase
            const caseExists = (sourceId, scammerWallet, description) => {
                return myCases.find(c => 
                    (c.metadata && c.metadata.includes(sourceId)) ||
                    (c.scammer_wallet && scammerWallet && c.scammer_wallet.toLowerCase() === scammerWallet.toLowerCase() && c.description === description)
                );
            };

            // 1. RECOVER FROM CLIENTCASE
            for (const cc of clientCases) {
                try {
                    if (caseExists(cc.id, cc.scammer_wallet, cc.description)) {
                        stats.details.push(`Skipped ClientCase ${cc.id} - already in MyCase`);
                        continue;
                    }

                    const user = findUser(cc);
                    if (!user) {
                        stats.errors.push(`ClientCase ${cc.id} - no matching user found`);
                        continue;
                    }

                    const recovered = await base44.asServiceRole.entities.MyCase.create({
                        user_id: user.id,
                        created_by: user.email,
                        created_by_email: user.email,
                        client_email: user.email,
                        client_name: cc.client_name || user.full_name,
                        phone_number: cc.phone_number,
                        issue_type: cc.issue_type || 'other',
                        status: cc.status || 'Pending',
                        urgency: cc.urgency || 'Medium',
                        description: cc.description,
                        amount_lost: parseFloat(cc.amount_lost) || 0,
                        cryptocurrency: cc.cryptocurrency,
                        blockchain: cc.blockchain,
                        scammer_wallet: cc.scammer_wallet,
                        victim_wallet: cc.victim_wallet,
                        evidence_files: cc.evidence_files || [],
                        case_number: cc.case_number,
                        created_date: cc.created_date,
                        metadata: JSON.stringify({
                            recovered_from: 'ClientCase',
                            original_id: cc.id,
                            recovery_date: new Date().toISOString()
                        }),
                        last_activity: new Date().toISOString()
                    });

                    stats.recovered++;
                    stats.details.push(`✅ Recovered ClientCase ${cc.case_number} → MyCase ${recovered.id}`);
                } catch (err) {
                    stats.errors.push(`ClientCase ${cc.id}: ${err.message}`);
                }
            }

            // 2. RECOVER FROM FRAUDCASE
            for (const fc of fraudCases) {
                try {
                    if (caseExists(fc.id, fc.scammer_wallet, fc.description)) continue;

                    const user = findUser(fc);
                    if (!user) {
                        stats.errors.push(`FraudCase ${fc.id} - no matching user`);
                        continue;
                    }

                    const recovered = await base44.asServiceRole.entities.MyCase.create({
                        user_id: user.id,
                        created_by: user.email,
                        created_by_email: user.email,
                        client_email: user.email,
                        client_name: fc.victim_contact_info?.name || user.full_name,
                        phone_number: fc.victim_contact_info?.phone,
                        issue_type: fc.fraud_type || 'other',
                        status: fc.status === 'reported' ? 'Pending' : (fc.status || 'Pending'),
                        description: fc.description,
                        amount_lost: parseFloat(fc.amount_stolen_usd) || 0,
                        cryptocurrency: fc.currency_type === 'USD' ? '' : fc.currency_type,
                        blockchain: fc.blockchain,
                        scammer_wallet: fc.scammer_wallet,
                        victim_wallet: fc.victim_wallet,
                        evidence_files: fc.evidence || [],
                        created_date: fc.created_date,
                        metadata: JSON.stringify({
                            recovered_from: 'FraudCase',
                            original_id: fc.id,
                            recovery_date: new Date().toISOString()
                        }),
                        last_activity: new Date().toISOString()
                    });

                    stats.recovered++;
                    stats.details.push(`✅ Recovered FraudCase → MyCase ${recovered.id}`);
                } catch (err) {
                    stats.errors.push(`FraudCase ${fc.id}: ${err.message}`);
                }
            }

            // 3. RECOVER FROM INVESTIGATIONCASE
            for (const ic of investigationCases) {
                try {
                    if (caseExists(ic.id, ic.scammer_wallet, ic.description)) continue;

                    const user = findUser(ic);
                    if (!user) {
                        stats.errors.push(`InvestigationCase ${ic.id} - no user`);
                        continue;
                    }

                    const recovered = await base44.asServiceRole.entities.MyCase.create({
                        user_id: user.id,
                        created_by: user.email,
                        created_by_email: user.email,
                        client_email: user.email,
                        client_name: ic.victim_name || user.full_name,
                        phone_number: ic.victim_phone,
                        issue_type: ic.fraud_type || 'other',
                        status: ic.status || 'Pending',
                        description: ic.description || ic.case_title,
                        amount_lost: parseFloat(ic.amount_lost || ic.amount_stolen_usd) || 0,
                        blockchain: ic.blockchain,
                        scammer_wallet: ic.scammer_wallet,
                        victim_wallet: ic.victim_wallet,
                        case_number: ic.case_number,
                        created_date: ic.created_date,
                        metadata: JSON.stringify({
                            recovered_from: 'InvestigationCase',
                            original_id: ic.id,
                            recovery_date: new Date().toISOString()
                        }),
                        last_activity: new Date().toISOString()
                    });

                    stats.recovered++;
                    stats.details.push(`✅ Recovered InvestigationCase ${ic.case_number} → MyCase ${recovered.id}`);
                } catch (err) {
                    stats.errors.push(`InvestigationCase ${ic.id}: ${err.message}`);
                }
            }

            // 4. FIX ORPHANED MYCASES (Missing user associations)
            for (const mc of myCases) {
                try {
                    const user = findUser(mc);
                    if (!user) {
                        stats.errors.push(`MyCase ${mc.id} - no matching user found`);
                        continue;
                    }

                    // Check if ALL ownership fields are correct
                    const needsUpdate = 
                        mc.user_id !== user.id ||
                        mc.created_by !== user.email ||
                        mc.client_email !== user.email ||
                        !mc.status;

                    if (needsUpdate) {
                        await base44.asServiceRole.entities.MyCase.update(mc.id, {
                            user_id: user.id,
                            created_by: user.email,
                            created_by_email: user.email,
                            client_email: user.email,
                            client_name: mc.client_name || user.full_name,
                            status: mc.status || 'Pending',
                            last_activity: mc.last_activity || new Date().toISOString()
                        });

                        stats.updated++;
                        stats.details.push(`🔧 Fixed MyCase ${mc.case_number} ownership`);
                    }
                } catch (err) {
                    stats.errors.push(`MyCase ${mc.id}: ${err.message}`);
                }
            }

            // 5. FINAL VERIFICATION
            const finalCases = await base44.asServiceRole.entities.MyCase.list(null, 10000);
            const finalTotalLoss = finalCases.reduce((sum, c) => sum + (c.amount_lost || 0), 0);

            return Response.json({
                success: true,
                recovery_complete: true,
                timestamp: new Date().toISOString(),
                stats: {
                    cases_recovered: stats.recovered,
                    cases_updated: stats.updated,
                    errors_count: stats.errors.length
                },
                final_state: {
                    total_cases: finalCases.length,
                    total_losses: finalTotalLoss,
                    unique_users: new Set(finalCases.map(c => c.client_email || c.created_by).filter(Boolean)).size
                },
                details: stats.details,
                errors: stats.errors
            });
        }

        return Response.json({ error: 'Invalid action. Use: audit or recover' }, { status: 400 });

    } catch (error) {
        console.error('❌ RECOVERY FAILED:', error);
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});