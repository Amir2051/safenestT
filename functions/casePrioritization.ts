import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { case_id } = await req.json();

        if (!case_id) {
            return Response.json({ error: "Case ID is required" }, { status: 400 });
        }

        // 1. Fetch the Case
        const caseData = await base44.entities.ClientCase.get(case_id);
        if (!caseData) {
             return Response.json({ error: "Case not found" }, { status: 404 });
        }

        // 2. Construct Prompt for AI Analysis
        const prompt = `
            You are an expert Fraud Analyst AI for "SafeNestT".
            Analyze the following fraud case and assign a "Priority Score" from 0 to 100 (where 100 is critical/immediate action needed).
            
            Criteria for scoring:
            - Amount Lost: >$100k is high priority, >$1M is critical. Small amounts are lower priority unless urgency is high.
            - Urgency: If user marked 'Critical' or 'High', boost the score.
            - Keywords: Look for words like "suicide", "life savings", "elderly", "threat", "blackmail", "active transfer". These indicate higher priority.
            - Completeness: If scammer wallet or bank details are provided, it's actionable -> higher priority.
            - Issue Type: "Pig Butchering", "Ransomware", and "Rug Pull" are often high impact.

            Case Details:
            - Client Name: ${caseData.client_name}
            - Issue Type: ${caseData.issue_type}
            - Reported Urgency: ${caseData.urgency}
            - Amount Lost: $${caseData.amount_lost || 0}
            - Description: "${caseData.description || 'No description provided'}"
            - Scammer Wallet: ${caseData.scammer_wallet || 'N/A'}
            - Scammer Bank: ${caseData.scammer_bank_name || 'N/A'}

            Output Format:
            Provide the response in strict JSON format:
            {
                "score": number (0-100),
                "analysis": "A concise summary (max 2 sentences) explaining why this score was given. e.g. 'High amount lost ($500k) combined with elderly victim indicators in description.'"
            }
        `;

        // 3. Call LLM
        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    score: { type: "number" },
                    analysis: { type: "string" }
                },
                required: ["score", "analysis"]
            }
        });

        // 4. Update Case with Score
        await base44.entities.ClientCase.update(case_id, {
            priority_score: response.score,
            ai_analysis: response.analysis
        });

        return Response.json({ success: true, score: response.score, analysis: response.analysis });

    } catch (error) {
        console.error("Error in case prioritization:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});