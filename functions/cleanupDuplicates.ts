import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Fetch all cases
        // 5000 limit might be enough, if not we need pagination but let's assume it fits for now or use multiple requests
        // Optimization: We could just list and process in memory if dataset isn't huge (e.g. < 10k records)
        const cases = await base44.asServiceRole.entities.MyCase.list(null, 5000);
        
        const duplicates = [];
        const seen = new Map();
        
        for (const c of cases) {
            // Create a unique key for identifying duplicates
            // Key: email|issue_type|scammer_wallet|amount_lost
            const email = (c.created_by || c.client_email || 'unknown').toLowerCase().trim();
            const wallet = (c.scammer_wallet || 'none').toLowerCase().trim();
            const amount = c.amount_lost || 0;
            const issue = c.issue_type || 'unknown';
            
            const key = `${email}|${issue}|${wallet}|${amount}`;
            
            if (seen.has(key)) {
                // Potential duplicate found
                const existing = seen.get(key);
                
                // Check time difference (if within 24 hours, treat as duplicate)
                const date1 = new Date(existing.created_date);
                const date2 = new Date(c.created_date);
                const diffMs = Math.abs(date2 - date1);
                const diffHours = diffMs / (1000 * 60 * 60);
                
                if (diffHours < 24) {
                    // It is a duplicate. We keep the older one (usually existing is older if we iterate chronologically, but list returns sorted by created_date desc usually? defaults vary)
                    // If list returns DESC, then 'c' is older or newer?
                    // Let's explicitly compare dates to keep the oldest
                    if (date1 < date2) {
                        duplicates.push(c); // c is newer, delete c
                    } else {
                        // existing is newer, delete existing and update map to point to c (older)
                        duplicates.push(existing);
                        seen.set(key, c);
                    }
                }
            } else {
                seen.set(key, c);
            }
        }
        
        // Perform deletion
        const deletedIds = [];
        for (const d of duplicates) {
            await base44.asServiceRole.entities.MyCase.delete(d.id);
            deletedIds.push(d.id);
        }
        
        return Response.json({
            success: true,
            total_scanned: cases.length,
            duplicates_found: duplicates.length,
            deleted_ids: deletedIds
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});