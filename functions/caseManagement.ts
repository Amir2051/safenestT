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
            // Generate ID
            const caseId = await generateCaseId(base44);
            
            // Create Case
            const caseData = {
                ...data,
                case_number: caseId,
                // Ensure numbers are numbers
                amount_lost: data.amount_lost ? parseFloat(data.amount_lost) : 0,
                status: data.status || "Pending",
                created_by: user.email,
                created_by_email: user.email,
                created_by_name: user.full_name || user.first_name
            };

            // TARGET ENTITY: MyCase
            const newCase = await base44.entities.MyCase.create(caseData);
            return Response.json({ success: true, case: newCase });
        }

        if (action === 'update') {
            // Robust update using service role
            const { id, updates } = data;
            if (!id) return Response.json({ error: "Missing case ID" }, { status: 400 });

            console.log(`[CaseUpdate] Updating case ${id} with:`, JSON.stringify(updates));

            // Ensure numeric fields are numbers
            if (updates.amount_lost !== undefined) updates.amount_lost = parseFloat(updates.amount_lost) || 0;
            if (updates.amount_stolen_usd !== undefined) updates.amount_stolen_usd = parseFloat(updates.amount_stolen_usd) || 0;
            if (updates.recovery_amount !== undefined) updates.recovery_amount = parseFloat(updates.recovery_amount) || 0;
            if (updates.investigation_progress !== undefined) updates.investigation_progress = parseInt(updates.investigation_progress) || 0;

            // Always update metadata
            updates.last_activity = new Date().toISOString();
            updates.updated_date = new Date().toISOString();
            updates.updated_by = user.email; // Explicitly track who updated

            // Permission Check
            const isAdmin = user.role === 'admin' || user.is_admin;
            const isSpecialist = user.job_title === 'Fraud Specialist';

            try {
                // Use service role to bypass strict RLS if needed, ensuring admin can always edit
                // We default to MyCase unless explicitly told otherwise (for legacy support during transition)
                const entityName = data.entityName === 'ClientCase' ? 'MyCase' : (data.entityName || 'MyCase');
                
                let updatedCase;
                
                // Unified logic - everything should be MyCase now
                if (entityName === 'MyCase') {
                    const existing = await base44.asServiceRole.entities.MyCase.get(id).catch(() => null);
                    if (!existing) {
                        return Response.json({ error: `Case with ID ${id} not found`, code: 'NOT_FOUND' }, { status: 404 });
                    }

                    // Strict check: Admins can edit all, Users can ONLY edit their own.
                    if (!isAdmin && !isSpecialist && existing.created_by !== user.email) {
                        return Response.json({ error: "Unauthorized: You can only edit cases you created." }, { status: 403 });
                    }

                    // Status Change Logging
                    if (updates.status && existing.status !== updates.status) {
                        try {
                            await base44.asServiceRole.entities.CaseTimelineEvent.create({
                                case_id: id,
                                event_type: 'status_change',
                                description: `Status changed from ${existing.status} to ${updates.status}`,
                                performed_by: user.email,
                                previous_status: existing.status,
                                new_status: updates.status,
                                metadata: JSON.stringify({
                                    timestamp: new Date().toISOString(),
                                    admin_id: user.id,
                                    admin_email: user.email
                                })
                            });
                        } catch (logErr) {
                            console.error("Failed to log status change:", logErr);
                        }
                    }

                    updatedCase = await base44.asServiceRole.entities.MyCase.update(id, updates);
                } else if (entityName === 'InvestigationCase') {
                    // Keeping purely for admin-specific detailed investigation logs if they are separate
                    if (!isAdmin && !isSpecialist) {
                        return Response.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
                    }
                    updatedCase = await base44.asServiceRole.entities.InvestigationCase.update(id, updates);
                } else {
                     return Response.json({ error: `Entity ${entityName} is deprecated. Migration required.` }, { status: 400 });
                }

                console.log(`[CaseUpdate] Success:`, updatedCase.id);
                return Response.json({ success: true, case: updatedCase, message: "Case updated successfully." });
            } catch (err) {
                console.error(`[CaseUpdate] Error:`, err);
                // Handle not found error from SDK if it wasn't caught above
                if (err.message && err.message.includes('not found')) {
                     return Response.json({ error: err.message, code: 'NOT_FOUND' }, { status: 404 });
                }
                return Response.json({ error: "Update failed — backend blocked the request.", details: err.message }, { status: 500 });
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

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});