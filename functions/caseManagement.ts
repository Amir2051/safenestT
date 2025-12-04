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
            
            // Trigger prioritization in background (fire and forget effectively, or await)
            // We can call the existing function if needed, or just return.
            // The frontend handles the AI call separately in previous code, but we can do it here.
            // For now, let's just return the case.
            
            return Response.json({ success: true, case: newCase });
        }

        if (action === 'migrate') {
            if (user.role !== 'admin' && !user.is_admin) {
                return Response.json({ error: 'Unauthorized' }, { status: 403 });
            }

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