import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { action, targetIds } = await req.json();

        // 1. FETCH ALL DATA
        // We do this for both scan and recover to ensure fresh data
        const cases = await base44.asServiceRole.entities.MyCase.list(null, 5000);
        const users = await base44.asServiceRole.entities.User.list(null, 5000);
        
        const userMap = {};
        users.forEach(u => {
            if (u.email) userMap[u.email.toLowerCase().trim()] = u;
        });

        const issues = [];
        const stats = { 
            total_cases: cases.length, 
            orphaned: 0, 
            date_errors: 0, 
            mismatch: 0, 
            recoverable: 0 
        };

        // 2. ANALYZE CASES
        for (const c of cases) {
            let issueTypes = [];
            let proposedFix = {};
            let needsFix = false;

            // A. Date Integrity
            if (!c.created_date || c.created_date === 'Invalid Date' || c.created_date.startsWith('0000')) {
                issueTypes.push('Missing/Invalid Date');
                let date = new Date().toISOString();
                // Try to recover from Case ID (SN-YYYY-XXXXX)
                if (c.case_number && c.case_number.startsWith('SN-')) {
                    const parts = c.case_number.split('-');
                    if (parts[1] && !isNaN(parts[1]) && parts[1].length === 4) {
                        date = new Date(`${parts[1]}-01-01T12:00:00Z`).toISOString();
                    }
                } else if (c.updated_date) {
                    date = c.updated_date;
                }
                proposedFix.created_date = date;
                needsFix = true;
                stats.date_errors++;
            }

            // B. User Linking & Visibility
            // Normalized lookups
            const createdBy = c.created_by ? c.created_by.toString().toLowerCase().trim() : '';
            const clientEmail = c.client_email ? c.client_email.toString().toLowerCase().trim() : '';
            const createdByEmail = c.created_by_email ? c.created_by_email.toString().toLowerCase().trim() : '';

            // Find the true user
            let matchedUser = userMap[createdBy] || userMap[clientEmail] || userMap[createdByEmail];

            if (matchedUser) {
                const targetEmail = matchedUser.email; // The exact email from User entity
                
                // Check if current fields exactly match the User entity email (RLS often requires exact match)
                if (c.created_by !== targetEmail || 
                    c.client_email !== targetEmail || 
                    c.created_by_email !== targetEmail) {
                    
                    issueTypes.push('Visibility Mismatch (RLS)');
                    proposedFix.created_by = targetEmail;
                    proposedFix.client_email = targetEmail;
                    proposedFix.created_by_email = targetEmail;
                    proposedFix.created_by_name = matchedUser.full_name || matchedUser.first_name || c.created_by_name;
                    needsFix = true;
                    stats.mismatch++;
                }
            } else {
                // Orphaned Case - No matching User entity found
                issueTypes.push('Orphaned (No User)');
                stats.orphaned++;
                
                // Best effort normalization if it looks like an email
                if (c.created_by && c.created_by.includes('@')) {
                    if (c.created_by !== c.created_by.toLowerCase().trim()) {
                        proposedFix.created_by = c.created_by.toLowerCase().trim();
                        needsFix = true;
                    }
                }
            }

            // C. Status Integrity
            if (!c.status) {
                issueTypes.push('Missing Status');
                proposedFix.status = 'Pending';
                needsFix = true;
            }

            if (needsFix) {
                stats.recoverable++;
                issues.push({
                    id: c.id,
                    case_number: c.case_number,
                    case_title: c.case_title || c.issue_type,
                    current_owner: c.created_by,
                    matched_user: matchedUser ? matchedUser.email : null,
                    issues: issueTypes,
                    proposed_fix: proposedFix
                });
            }
        }

        // 3. HANDLE ACTIONS
        if (action === 'scan') {
            return Response.json({ success: true, stats, issues });
        }

        if (action === 'recover') {
            const casesToRecover = targetIds 
                ? issues.filter(i => targetIds.includes(i.id))
                : issues; // If no IDs, recover all found

            const results = { recovered: 0, failed: 0 };

            for (const item of casesToRecover) {
                try {
                    await base44.asServiceRole.entities.MyCase.update(item.id, item.proposed_fix);
                    results.recovered++;
                    
                    // Log Audit
                    await base44.asServiceRole.entities.AuditLog.create({
                        action_type: 'settings_updated',
                        action_category: 'security',
                        description: `Case ${item.case_number} recovered by admin`,
                        metadata: JSON.stringify({ 
                            case_id: item.id, 
                            issues: item.issues,
                            fix: item.proposed_fix 
                        }),
                        created_by: user.email,
                        severity: 'high'
                    });

                } catch (e) {
                    console.error(`Failed to recover case ${item.id}`, e);
                    results.failed++;
                }
            }

            return Response.json({ success: true, results, stats_before: stats });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});