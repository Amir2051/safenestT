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

            const newCase = await base44.entities.ClientCase.create(caseData);
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
                // We assume 'data.entityName' is passed, default to ClientCase
                const entityName = data.entityName || 'ClientCase';
                
                let updatedCase;
                if (entityName === 'FraudCase') {
                    const existing = await base44.asServiceRole.entities.FraudCase.get(id).catch(() => null);
                    if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
                    
                    if (!isAdmin && !isSpecialist && existing.created_by !== user.email) {
                        return Response.json({ error: "Unauthorized: You can only edit cases you created." }, { status: 403 });
                    }
                    updatedCase = await base44.asServiceRole.entities.FraudCase.update(id, updates);
                } else if (entityName === 'InvestigationCase') {
                    if (!isAdmin && !isSpecialist) {
                        return Response.json({ error: "Unauthorized: Admin access required." }, { status: 403 });
                    }
                    updatedCase = await base44.asServiceRole.entities.InvestigationCase.update(id, updates);
                } else {
                    // ClientCase
                    const existing = await base44.asServiceRole.entities.ClientCase.get(id).catch(() => null);
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
                            // Continue with update even if logging fails
                        }
                    }

                    updatedCase = await base44.asServiceRole.entities.ClientCase.update(id, updates);
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

            if (type === 'ownership_sync') {
                // SYNC OWNERSHIP: Match client_email to user records
                const cases = await base44.asServiceRole.entities.ClientCase.list(null, 1000);
                const users = await base44.asServiceRole.entities.User.list(null, 1000);
                
                const updates = [];
                let updatedCount = 0;

                for (const c of cases) {
                    // If created_by_email is missing or generic, try to fix it
                    if (!c.created_by_email || !c.created_by_name) {
                        // Try to find matching user by client_email
                        const matchingUser = users.find(u => 
                            u.email.toLowerCase() === c.client_email?.toLowerCase() || 
                            u.email.toLowerCase() === c.created_by?.toLowerCase()
                        );

                        if (matchingUser) {
                            updates.push(base44.asServiceRole.entities.ClientCase.update(c.id, {
                                created_by_email: matchingUser.email,
                                created_by_name: matchingUser.full_name
                            }));
                            updatedCount++;
                        }
                    }
                }
                await Promise.all(updates);
                return Response.json({ success: true, message: `Synced ownership for ${updatedCount} cases` });
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