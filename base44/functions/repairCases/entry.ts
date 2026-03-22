import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Using Service Role to bypass RLS for repair
        const users = await base44.asServiceRole.entities.User.list(null, 1000);
        const allCases = await base44.asServiceRole.entities.MyCase.list(null, 1000);
        
        let updatedCount = 0;
        const updates = [];

        // 1. Repair Existing MyCase Records
        for (const c of allCases) {
            let needsUpdate = false;
            const updateData = {};

            // Find user by client_email or created_by_email
            const owner = users.find(u => 
                (c.client_email && u.email.toLowerCase() === c.client_email.toLowerCase()) ||
                (c.created_by_email && u.email.toLowerCase() === c.created_by_email.toLowerCase()) ||
                (c.created_by && u.email.toLowerCase() === c.created_by.toLowerCase())
            );

            if (owner) {
                // Fix Created By if missing or generic
                if (!c.created_by || c.created_by.startsWith('service+') || c.created_by !== owner.email) {
                    updateData.created_by = owner.email;
                    updateData.created_by_email = owner.email;
                    updateData.created_by_name = owner.full_name || c.client_name || c.created_by_name;
                    needsUpdate = true;
                }
                
                // Ensure client_email matches owner if it was missing
                if (!c.client_email) {
                    updateData.client_email = owner.email;
                    needsUpdate = true;
                }
            } else {
                // No user found, but maybe we can normalize what we have
                if (c.client_email && (!c.created_by || c.created_by.startsWith('service+'))) {
                    // Assign ownership to the client email even if user doesn't exist yet (future proofing)
                    updateData.created_by = c.client_email;
                    updateData.created_by_email = c.client_email;
                    needsUpdate = true;
                }
            }

            // Fix Status capitalization/normalization
            if (c.status && ['new', 'reported'].includes(c.status.toLowerCase())) {
                updateData.status = 'Pending';
                needsUpdate = true;
            }

            if (needsUpdate) {
                console.log(`Repairing case ${c.id} for owner ${updateData.created_by || 'unknown'}`);
                updates.push(base44.asServiceRole.entities.MyCase.update(c.id, updateData));
                updatedCount++;
            }
        }

        // 2. Import Missing Legacy Cases (Double Check)
        // Check ClientCase
        try {
            const legacyClientCases = await base44.asServiceRole.entities.ClientCase.list(null, 1000);
            var importedCount = 0;
            
            for (const lc of legacyClientCases) {
                // Check if already migrated
                const exists = allCases.find(mc => 
                    (mc.metadata && mc.metadata.includes(lc.id)) || 
                    (mc.case_number === lc.case_number && mc.case_number) ||
                    (mc.client_email === lc.client_email && mc.amount_lost === lc.amount_lost && mc.created_date === lc.created_date)
                );

                if (!exists) {
                    const matchingUser = users.find(u => 
                        u.email.toLowerCase() === lc.client_email?.toLowerCase() ||
                        u.email.toLowerCase() === lc.created_by?.toLowerCase()
                    );

                    console.log(`Importing missing ClientCase ${lc.id}`);
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

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});