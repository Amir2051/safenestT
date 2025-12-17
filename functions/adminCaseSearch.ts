import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);

        if (!user || (user.role !== 'admin' && !user.is_admin && user.job_title !== 'Fraud Specialist')) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { query } = await req.json();

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
             return Response.json({ cases: [] });
        }
        
        const q = query.trim();
        // Regex for case-insensitive partial match
        const regexPattern = `(?i).*${q}.*`; 

        // Construct filter
        // We use $regex if supported by the adapter, or just rely on the SDK's ability to handle string matching
        // Typically for Mongo-like syntax:
        const filter = {
            $or: [
                { case_number: { $regex: q, $options: 'i' } },
                { client_name: { $regex: q, $options: 'i' } },
                { client_email: { $regex: q, $options: 'i' } },
                { victim_name: { $regex: q, $options: 'i' } },
                { victim_email: { $regex: q, $options: 'i' } },
                { created_by_name: { $regex: q, $options: 'i' } },
                { created_by_email: { $regex: q, $options: 'i' } },
                { case_title: { $regex: q, $options: 'i' } },
                { scammer_wallet: { $regex: q, $options: 'i' } },
                { victim_wallet: { $regex: q, $options: 'i' } }
            ]
        };

        const cases = await base44.asServiceRole.entities.MyCase.filter(filter, '-created_date', 100);

        return Response.json({ cases });
    } catch (error) {
        console.error("Search failed:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});