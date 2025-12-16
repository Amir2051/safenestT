import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || (user.role !== 'admin' && !user.is_admin && user.job_title !== 'Fraud Specialist')) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { caseId } = await req.json();
        if (!caseId) return Response.json({ error: 'Case ID required' }, { status: 400 });

        // 1. Fetch Case Data
        const caseData = await base44.asServiceRole.entities.MyCase.get(caseId);
        if (!caseData) return Response.json({ error: 'Case not found' }, { status: 404 });

        // 2. Prepare Deterministic Data (Auto-Fill)
        const evidenceList = (caseData.evidence_files || []).map(f => `- ${f.name} (${f.type})`).join('\n');
        const walletList = [
            caseData.scammer_wallet, 
            ...(caseData.monitored_wallets || []),
            ...(caseData.scammer_info?.wallet_addresses || [])
        ].filter(Boolean).join(', ');

        const evidenceSummary = `
**Uploaded Evidence:**
${evidenceList || "None"}

**Identified Wallets:**
${walletList || "None"}

**Transaction Hashes:**
${(caseData.transaction_hashes || []).join('\n') || "None"}

**Linked Cases:**
${(caseData.linked_case_ids || []).join(', ') || "None"}
        `.trim();

        // 3. AI Extraction
        const aiContext = {
            description: caseData.description,
            scammer_info: caseData.scammer_info,
            timeline: caseData.timeline,
            notes: (caseData.case_notes || []).map(n => n.note).join('\n'),
            issue_type: caseData.issue_type
        };

        const prompt = `
        You are a Cyber Fraud Intelligence Analyst. 
        Extract a structured intelligence profile from the provided case data.
        
        CASE DATA:
        ${JSON.stringify(aiContext, null, 2)}
        
        REQUIREMENTS:
        - Be objective and professional.
        - Mark uncertain info as "Unknown".
        - Infer behavioral indicators and MO from the narrative.
        
        Generate a JSON object with these keys:
        - victim_platform: Platforms involved (e.g. WhatsApp, Tinder)
        - victim_contact: Initial contact method
        - victim_dates: Date range of activity
        - victim_statement: A professional summary of the victim's narrative
        - suspect_aliases: Names/Aliases used
        - suspect_location: Claimed or inferred location
        - suspect_socials: Social media handles/links
        - suspect_comms: Communication methods used
        - suspect_behavior: Psychological tactics (e.g. Love bombing, Urgency)
        - suspect_scam_type: Specific fraud classification
        - suspect_confidence: Low/Medium/High (based on detail level)
        - mo_contact: Initial contact vector description
        - mo_escalation: How the scam progressed
        - mo_manipulation: Psychological manipulation used
        - mo_extraction: Method of financial extraction
        - mo_timeline: Brief timeline summary
        - analysis_pattern: Assessment of the scam pattern
        - analysis_organized: Indicators of organized crime
        - analysis_similarities: Potential links to other scams (general)
        - analysis_risk: Risk of re-targeting
        - analysis_attribution: Preliminary attribution notes
        `;

        const llmRes = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    victim_platform: { type: "string" },
                    victim_contact: { type: "string" },
                    victim_dates: { type: "string" },
                    victim_statement: { type: "string" },
                    suspect_aliases: { type: "string" },
                    suspect_location: { type: "string" },
                    suspect_socials: { type: "string" },
                    suspect_comms: { type: "string" },
                    suspect_behavior: { type: "string" },
                    suspect_scam_type: { type: "string" },
                    suspect_confidence: { type: "string", enum: ["Low", "Medium", "High"] },
                    mo_contact: { type: "string" },
                    mo_escalation: { type: "string" },
                    mo_manipulation: { type: "string" },
                    mo_extraction: { type: "string" },
                    mo_timeline: { type: "string" },
                    analysis_pattern: { type: "string" },
                    analysis_organized: { type: "string" },
                    analysis_similarities: { type: "string" },
                    analysis_risk: { type: "string" },
                    analysis_attribution: { type: "string" }
                }
            }
        });

        const aiData = llmRes; 

        // 4. Construct Profile Object
        const profile = {
            case_id: caseData.id,
            status: "Draft",
            victim_profile: {
                identifier: caseData.client_name || "Unknown",
                contact_method: aiData.victim_contact || "Unknown",
                platforms: aiData.victim_platform || "",
                loss_amount: caseData.amount_lost || 0,
                currency: caseData.cryptocurrency || "USD",
                date_range: aiData.victim_dates || "",
                statement: aiData.victim_statement || caseData.description || ""
            },
            suspect_profile: {
                aliases: aiData.suspect_aliases || caseData.scammer_info?.name || "",
                location: aiData.suspect_location || caseData.scammer_info?.location || "",
                social_media: aiData.suspect_socials || "",
                communication_methods: aiData.suspect_comms || "",
                behavioral_indicators: aiData.suspect_behavior || "",
                scam_type: aiData.suspect_scam_type || caseData.issue_type || "",
                confidence_level: aiData.suspect_confidence || "Medium",
                wallets: walletList
            },
            modus_operandi: {
                initial_contact: aiData.mo_contact || "",
                escalation: aiData.mo_escalation || "",
                manipulation: aiData.mo_manipulation || "",
                financial_extraction: aiData.mo_extraction || "",
                timeline_summary: aiData.mo_timeline || ""
            },
            evidence_summary: evidenceSummary,
            investigator_analysis: {
                pattern_assessment: aiData.analysis_pattern || "",
                organized_fraud_indicators: aiData.analysis_organized || "",
                similarities: aiData.analysis_similarities || "",
                repeat_risk: aiData.analysis_risk || "",
                attribution_notes: aiData.analysis_attribution || ""
            },
            investigator_notes: "",
            edit_log: [{
                timestamp: new Date().toISOString(),
                user_email: user.email,
                action: "Auto-Generated Profile from Case Data"
            }]
        };

        return Response.json({ success: true, profile });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});