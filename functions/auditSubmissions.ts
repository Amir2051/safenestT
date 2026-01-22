import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || (user.role !== 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }
        
        console.log('🔧 AUDIT: User authenticated as admin');
        
        // Verify service role is available
        if (!base44.asServiceRole) {
            console.error('❌ Service role not available');
            return Response.json({ error: 'Service role not configured' }, { status: 500 });
        }
        
        const { action } = await req.json();
        
        if (action === 'full_audit') {
            console.log('🚨 STARTING FULL SUBMISSION AUDIT');
            
            // 1. Get ALL cases from MyCase entity (admin can see all via RLS)
            const myCases = await base44.entities.MyCase.list(null, 50000);
            console.log(`📊 MyCase entity: ${myCases.length} records`);
            
            // 2. Check other legacy entities for orphaned submissions
            const clientCases = await base44.asServiceRole.entities.ClientCase.list(null, 10000).catch(() => []);
            const fraudCases = await base44.asServiceRole.entities.FraudCase.list(null, 10000).catch(() => []);
            const investigationCases = await base44.asServiceRole.entities.InvestigationCase.list(null, 10000).catch(() => []);
            
            console.log(`📊 Legacy entities: ClientCase=${clientCases.length}, FraudCase=${fraudCases.length}, Investigation=${investigationCases.length}`);
            
            // 3. Get all users for ownership mapping
            const allUsers = await base44.asServiceRole.entities.User.list(null, 10000);
            console.log(`👥 Total users: ${allUsers.length}`);
            
            // 4. Check for ownership issues
            const orphanedCases = [];
            const missingUserCases = [];
            
            for (const c of myCases) {
                // Check if user_id exists
                if (!c.user_id) {
                    orphanedCases.push({
                        id: c.id,
                        case_number: c.case_number,
                        reason: 'Missing user_id',
                        client_email: c.client_email,
                        created_by: c.created_by
                    });
                }
                
                // Check if user still exists
                const userExists = allUsers.some(u => 
                    u.id === c.user_id ||
                    u.email?.toLowerCase() === c.client_email?.toLowerCase() ||
                    u.email?.toLowerCase() === c.created_by?.toLowerCase()
                );
                
                if (!userExists) {
                    missingUserCases.push({
                        id: c.id,
                        case_number: c.case_number,
                        user_id: c.user_id,
                        client_email: c.client_email,
                        created_by: c.created_by
                    });
                }
            }
            
            // 5. User-by-user visibility check
            const userVisibility = [];
            for (const u of allUsers.filter(u => u.role !== 'admin')) {
                const expectedCases = myCases.filter(c =>
                    c.user_id === u.id ||
                    c.client_email?.toLowerCase() === u.email?.toLowerCase() ||
                    c.created_by?.toLowerCase() === u.email?.toLowerCase() ||
                    c.created_by_email?.toLowerCase() === u.email?.toLowerCase()
                );
                
                if (expectedCases.length > 0) {
                    userVisibility.push({
                        user_email: u.email,
                        user_id: u.id,
                        expected_cases: expectedCases.length,
                        case_numbers: expectedCases.map(c => c.case_number)
                    });
                }
            }
            
            return Response.json({
                success: true,
                audit_timestamp: new Date().toISOString(),
                summary: {
                    total_cases_mycase: myCases.length,
                    total_cases_legacy: clientCases.length + fraudCases.length + investigationCases.length,
                    total_users: allUsers.length,
                    orphaned_cases: orphanedCases.length,
                    missing_user_cases: missingUserCases.length,
                    users_with_cases: userVisibility.length
                },
                details: {
                    orphaned_cases: orphanedCases,
                    missing_user_cases: missingUserCases,
                    user_visibility: userVisibility,
                    legacy_breakdown: {
                        client_cases: clientCases.length,
                        fraud_cases: fraudCases.length,
                        investigation_cases: investigationCases.length
                    }
                },
                recommendations: [
                    orphanedCases.length > 0 ? `Fix ${orphanedCases.length} cases with missing user_id` : null,
                    missingUserCases.length > 0 ? `${missingUserCases.length} cases reference deleted users` : null,
                    (clientCases.length + fraudCases.length + investigationCases.length) > 0 ? 
                        `Migrate ${clientCases.length + fraudCases.length + investigationCases.length} legacy cases to MyCase` : null
                ].filter(Boolean)
            });
        }
        
        if (action === 'import_legacy') {
            console.log('📥 IMPORTING ALL LEGACY CASES TO MyCase');
            
            const clientCases = await base44.asServiceRole.entities.ClientCase.list(null, 10000).catch(() => []);
            const fraudCases = await base44.asServiceRole.entities.FraudCase.list(null, 10000).catch(() => []);
            const investigationCases = await base44.asServiceRole.entities.InvestigationCase.list(null, 10000).catch(() => []);
            const allUsers = await base44.asServiceRole.entities.User.list(null, 10000);
            
            let imported = 0;
            
            // Import ClientCase
            for (const c of clientCases) {
                const matchUser = allUsers.find(u =>
                    u.email?.toLowerCase() === c.client_email?.toLowerCase() ||
                    u.email?.toLowerCase() === c.created_by?.toLowerCase()
                );
                
                await base44.asServiceRole.entities.MyCase.create({
                    ...c,
                    id: undefined,
                    user_id: matchUser?.id || null,
                    created_by: matchUser?.email || c.created_by,
                    client_email: matchUser?.email || c.client_email,
                    created_by_email: matchUser?.email || c.created_by_email,
                    metadata: JSON.stringify({ legacy_source: 'ClientCase', legacy_id: c.id })
                });
                
                await base44.asServiceRole.entities.ClientCase.delete(c.id);
                imported++;
            }
            
            // Import FraudCase
            for (const c of fraudCases) {
                const matchUser = allUsers.find(u =>
                    u.email?.toLowerCase() === c.victim_contact_info?.email?.toLowerCase() ||
                    u.email?.toLowerCase() === c.created_by?.toLowerCase()
                );
                
                await base44.asServiceRole.entities.MyCase.create({
                    client_name: c.victim_contact_info?.name || 'Unknown',
                    client_email: matchUser?.email || c.victim_contact_info?.email,
                    phone_number: c.victim_contact_info?.phone,
                    issue_type: c.fraud_type || 'other',
                    status: c.status === 'reported' ? 'Pending' : c.status,
                    description: c.description,
                    amount_lost: c.amount_stolen || c.amount_stolen_usd || 0,
                    scammer_wallet: c.scammer_wallet,
                    blockchain: c.blockchain,
                    user_id: matchUser?.id || null,
                    created_by: matchUser?.email || c.created_by,
                    created_by_email: matchUser?.email,
                    created_date: c.created_date || c.incident_date,
                    metadata: JSON.stringify({ legacy_source: 'FraudCase', legacy_id: c.id })
                });
                
                await base44.asServiceRole.entities.FraudCase.delete(c.id);
                imported++;
            }
            
            // Import InvestigationCase
            for (const c of investigationCases) {
                const matchUser = allUsers.find(u =>
                    u.email?.toLowerCase() === c.client_email?.toLowerCase() ||
                    u.email?.toLowerCase() === c.created_by?.toLowerCase()
                );
                
                await base44.asServiceRole.entities.MyCase.create({
                    ...c,
                    id: undefined,
                    user_id: matchUser?.id || null,
                    created_by: matchUser?.email || c.created_by,
                    client_email: matchUser?.email || c.client_email,
                    created_by_email: matchUser?.email || c.created_by_email,
                    metadata: JSON.stringify({ legacy_source: 'InvestigationCase', legacy_id: c.id })
                });
                
                await base44.asServiceRole.entities.InvestigationCase.delete(c.id);
                imported++;
            }
            
            return Response.json({
                success: true,
                message: `Successfully imported ${imported} legacy cases to MyCase`,
                imported_count: imported
            });
        }
        
        if (action === 'fix_orphaned') {
            console.log('🔧 FIXING ORPHANED CASES');
            
            const myCases = await base44.asServiceRole.entities.MyCase.list(null, 50000);
            const allUsers = await base44.asServiceRole.entities.User.list(null, 10000);
            
            let fixed = 0;
            
            for (const c of myCases) {
                if (!c.user_id || !c.client_email || !c.created_by) {
                    const matchUser = allUsers.find(u =>
                        (c.user_id && u.id === c.user_id) ||
                        (c.client_email && u.email?.toLowerCase() === c.client_email?.toLowerCase()) ||
                        (c.created_by && u.email?.toLowerCase() === c.created_by?.toLowerCase()) ||
                        (c.created_by_email && u.email?.toLowerCase() === c.created_by_email?.toLowerCase())
                    );
                    
                    if (matchUser) {
                        await base44.entities.MyCase.update(c.id, {
                            user_id: matchUser.id,
                            client_email: matchUser.email,
                            created_by: matchUser.email,
                            created_by_email: matchUser.email,
                            created_by_name: matchUser.full_name || c.created_by_name
                        });
                        fixed++;
                    }
                }
            }
            
            return Response.json({
                success: true,
                message: `Fixed ${fixed} orphaned cases`,
                fixed_count: fixed
            });
        }
        
        return Response.json({ error: 'Invalid action' }, { status: 400 });
        
    } catch (error) {
        console.error('❌ AUDIT ERROR:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});