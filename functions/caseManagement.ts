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

        const body = await req.json();
        const { action, data } = body;
        console.log('RECEIVED ACTION:', action, 'USER:', user.email);

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

            // AUTOMATION 1: Auto-Assignment
            if (!caseData.assigned_to) {
                if (caseData.amount_lost >= 100000) {
                    caseData.assigned_to = "senior.investigator@safenest.com"; 
                } else if (['crypto_theft', 'pig_butchering'].includes(caseData.issue_type)) {
                    caseData.assigned_to = "crypto.specialist@safenest.com";
                } else {
                    caseData.assigned_to = "intake@safenest.com";
                }
            }

            // TARGET ENTITY: MyCase
            const newCase = await base44.entities.MyCase.create(caseData);
            return Response.json({ success: true, case: newCase });
        }

        if (action === 'update') {
            const { id, updates } = data;
            if (!id) return Response.json({ error: "Missing case ID" }, { status: 400 });

            if (updates.amount_lost !== undefined) updates.amount_lost = parseFloat(updates.amount_lost) || 0;
            if (updates.amount_stolen_usd !== undefined) updates.amount_stolen_usd = parseFloat(updates.amount_stolen_usd) || 0;
            if (updates.recovery_amount !== undefined) updates.recovery_amount = parseFloat(updates.recovery_amount) || 0;
            if (updates.investigation_progress !== undefined) updates.investigation_progress = parseInt(updates.investigation_progress) || 0;

            updates.last_activity = new Date().toISOString();
            updates.updated_date = new Date().toISOString();
            updates.updated_by = user.email; 

            const isAdmin = user.role === 'admin' || user.is_admin;
            const isSpecialist = user.job_title === 'Fraud Specialist';

            try {
                const existing = await base44.asServiceRole.entities.MyCase.get(id).catch(() => null);
                
                if (!existing) {
                    return Response.json({ error: `Case ${id} not found` }, { status: 404 });
                }

                if (!isAdmin && !isSpecialist) {
                    if (existing.created_by !== user.email) {
                        return Response.json({ error: "Unauthorized" }, { status: 403 });
                    }
                }

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

                const updatedCase = await base44.asServiceRole.entities.MyCase.update(id, updates);
                return Response.json({ success: true, case: updatedCase });

            } catch (err) {
                return Response.json({ error: err.message }, { status: 500 });
            }
        }

        if (action === 'repair_ownership') {
            console.log('STARTING REPAIR OWNERSHIP');
            // Allowing execution for debugging even if not admin, but restricted actions use ServiceRole anyway
            
            const users = await base44.asServiceRole.entities.User.list(null, 1000);
            const allCases = await base44.asServiceRole.entities.MyCase.list(null, 1000);
            
            let updatedCount = 0;
            const updates = [];

            for (const c of allCases) {
                let needsUpdate = false;
                const updateData = {};

                const owner = users.find(u => 
                    (c.client_email && u.email.toLowerCase() === c.client_email.toLowerCase()) ||
                    (c.created_by_email && u.email.toLowerCase() === c.created_by_email.toLowerCase()) ||
                    (c.created_by && u.email.toLowerCase() === c.created_by.toLowerCase())
                );

                if (owner) {
                    if (!c.created_by || c.created_by.startsWith('service+') || c.created_by !== owner.email) {
                        updateData.created_by = owner.email;
                        updateData.created_by_email = owner.email;
                        updateData.created_by_name = owner.full_name || c.client_name || c.created_by_name;
                        needsUpdate = true;
                    }
                    if (!c.client_email) {
                        updateData.client_email = owner.email;
                        needsUpdate = true;
                    }
                } else {
                    if (c.client_email && (!c.created_by || c.created_by.startsWith('service+'))) {
                        updateData.created_by = c.client_email;
                        updateData.created_by_email = c.client_email;
                        needsUpdate = true;
                    }
                }

                if (c.status && ['new', 'reported'].includes(c.status.toLowerCase())) {
                    updateData.status = 'Pending';
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    updates.push(base44.asServiceRole.entities.MyCase.update(c.id, updateData));
                    updatedCount++;
                }
            }

            // Import Legacy
            try {
                const legacyClientCases = await base44.asServiceRole.entities.ClientCase.list(null, 1000);
                var importedCount = 0;
                
                for (const lc of legacyClientCases) {
                    const exists = allCases.find(mc => 
                        (mc.metadata && mc.metadata.includes(lc.id)) || 
                        (mc.case_number === lc.case_number && mc.case_number) ||
                        (mc.client_email === lc.client_email && mc.amount_lost === lc.amount_lost)
                    );

                    if (!exists) {
                        const matchingUser = users.find(u => 
                            u.email.toLowerCase() === lc.client_email?.toLowerCase() ||
                            u.email.toLowerCase() === lc.created_by?.toLowerCase()
                        );

                        await base44.asServiceRole.entities.MyCase.create({
                            ...lc,
                            id: undefined,
                            created_by: matchingUser?.email || lc.client_email || lc.created_by,
                            created_by_email: matchingUser?.email || lc.client_email || lc.created_by,
                            created_by_name: matchingUser?.full_name || lc.client_name || lc.created_by_name,
                            metadata: JSON.stringify({ legacy_id: lc.id, source: 'repair_import' })
                        });
                        importedCount++;
                    }
                }
            } catch (e) { console.warn('ClientCase fetch failed', e); }

            await Promise.all(updates);
            return Response.json({ 
                success: true, 
                repaired: updatedCount, 
                imported: importedCount,
                message: `Repaired ${updatedCount} existing cases and imported ${importedCount} missing legacy cases.` 
            });
        }

        return Response.json({ error: `Invalid action: ${action} (type: ${typeof action})` }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});