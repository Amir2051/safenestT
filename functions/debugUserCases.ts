import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const userId = "692275c9b66b0469565820f4";
        
        // Check Evidence
        const evidence = await base44.asServiceRole.entities.CaseEvidenceFile.filter({ uploader_id: userId });
        
        // Check Deleted Cases (manual scan)
        const allCases = await base44.asServiceRole.entities.MyCase.list('-created_date', 1000);
        const deletedMatches = allCases.filter(c => {
            const str = JSON.stringify(c).toLowerCase();
            return (str.includes("bring2help") || str.includes("dhg")) && c.is_deleted === true;
        });

        // Check for any case where user_id matches
        const userIdMatches = await base44.asServiceRole.entities.MyCase.filter({ user_id: userId });

        return Response.json({
            evidence_count: evidence.length,
            deleted_matches: deletedMatches,
            user_id_matches: userIdMatches
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});