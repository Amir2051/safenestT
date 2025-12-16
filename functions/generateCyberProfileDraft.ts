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

        // --- INTELLIGENCE CORRELATION ENGINE (ICE) ---
        const linkedCases = [];
        let totalLinkedLoss = 0;
        let earliestDate = caseData.created_date;
        let latestDate = caseData.created_date;

        // Identifiers to scan for
        const identifiers = {
            wallets: [
                caseData.scammer_wallet, 
                ...(caseData.monitored_wallets || []),
                ...(caseData.scammer_info?.wallet_addresses || [])
            ].filter(Boolean),
            emails: [
                caseData.scammer_info?.email, 
                ...(caseData.scammer_info?.known_emails || [])
            ].filter(Boolean),
            phones: [
                caseData.scammer_info?.phone
            ].filter(Boolean),
            socials: [
                 // Handle object or string
                 ...(caseData.scammer_info?.social_media || []).map(s => typeof s === 'string' ? s : s.url || s.profile)
            ].filter(Boolean)
        };

        // Scan Database (Optimized for key indexed fields if possible, otherwise list recent/all)
        // For performance, we'll fetch relevant cases using specific filters if possible, 
        // but `filter` with OR across multiple fields might be complex. 
        // We'll fetch recent cases (e.g. last 1000) or use specific field filters in parallel.
        
        const scanResults = new Map();

        const addMatch = (c, type, value, confidence) => {
            if (c.id === caseId) return; // Don't match self
            if (!scanResults.has(c.id)) {
                scanResults.set(c.id, {
                    case_id: c.id,
                    case_number: c.case_number,
                    loss_amount: c.amount_lost || 0,
                    status: c.status,
                    created_date: c.created_date,
                    matches: []
                });
            }
            const record = scanResults.get(c.id);
            // Avoid duplicate match reasons
            if (!record.matches.some(m => m.type === type && m.value === value)) {
                record.matches.push({ type, value, confidence });
            }
        };

        // 1. Wallet Matches (High Confidence)
        if (identifiers.wallets.length > 0) {
            // Can use $in if supported, or parallel queries
            // Assuming filter supports $in or we loop
             const walletCases = await base44.asServiceRole.entities.MyCase.filter({
                scammer_wallet: { $in: identifiers.wallets }
            });
            walletCases.forEach(c => addMatch(c, 'Wallet', c.scammer_wallet, 'High'));
            
            // Check monitored_wallets field (array) - might need specific query or check locally if fetching all
            // For now, relies on primary scammer_wallet match which is most common
        }

        // 2. Email Matches (High Confidence)
        if (identifiers.emails.length > 0) {
             // Basic implementation, usually emails are in a JSON blob (scammer_info), so difficult to query directly unless extracted
             // or we fetch a batch and check. 
             // If we can't query JSON fields efficiently, we rely on the scanned set from wallet or fetch recent.
             // Let's assume we can query 'scammer_info.email' if it's a top level field in JSON or just skip strict DB query for JSON
             // and rely on a broader fetch.
             // Strategy: Fetch last 500 cases to scan in-memory for complex JSON matches
             const recentCases = await base44.asServiceRole.entities.MyCase.list('-created_date', 500);
             recentCases.forEach(c => {
                 if (c.id === caseId) return;

                 // Check Emails
                 const cEmails = [c.scammer_info?.email, ...(c.scammer_info?.known_emails || [])].filter(Boolean);
                 const commonEmail = identifiers.emails.find(e => cEmails.includes(e));
                 if (commonEmail) addMatch(c, 'Email', commonEmail, 'High');

                 // Check Phones
                 const cPhone = c.scammer_info?.phone;
                 if (cPhone && identifiers.phones.includes(cPhone)) addMatch(c, 'Phone', cPhone, 'High');

                 // Check Socials
                 const cSocials = (c.scammer_info?.social_media || []).map(s => typeof s === 'string' ? s : s.url || s.profile);
                 const commonSocial = identifiers.socials.find(s => cSocials.includes(s));
                 if (commonSocial) addMatch(c, 'Social Handle', commonSocial, 'Medium');
                 
                 // Fuzzy Title/Description (Low/Medium) - Simple containment or keywords
                 // This is basic, LLM will do better analysis later
             });
        }

        // Compile Results
        const linkedCasesList = Array.from(scanResults.values()).map(r => {
            // Determine aggregate confidence
            const isHigh = r.matches.some(m => m.confidence === 'High');
            const isMedium = r.matches.some(m => m.confidence === 'Medium');
            const confidence = isHigh ? 'High' : (isMedium ? 'Medium' : 'Low');

            // Update stats
            totalLinkedLoss += (r.loss_amount || 0);
            if (new Date(r.created_date) < new Date(earliestDate)) earliestDate = r.created_date;
            if (new Date(r.created_date) > new Date(latestDate)) latestDate = r.created_date;

            return {
                case_id: r.case_id,
                case_number: r.case_number,
                loss_amount: r.loss_amount,
                match_type: r.matches.map(m => m.type).join(', '),
                match_value: r.matches.map(m => m.value).join(', '),
                confidence,
                status: r.status
            };
        });

        // Linked Intelligence Object
        const linkedIntelligence = {
            summary: {
                total_linked: linkedCasesList.length,
                total_loss: totalLinkedLoss,
                earliest_activity: earliestDate,
                latest_activity: latestDate,
                campaign_assessment: linkedCasesList.length > 2 ? "Organized Campaign Likely" : (linkedCasesList.length > 0 ? "Repeat Offender" : "Isolated Incident")
            },
            linked_cases: linkedCasesList
        };

        // --- END ICE ---

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

**Linked Cases:**
${linkedCasesList.map(c => `- ${c.case_number} (${c.match_type})`).join('\n') || "None found"}
        `.trim();

        // 3. AI Extraction
        const aiContext = {
            description: caseData.description,
            scammer_info: caseData.scammer_info,
            timeline: caseData.timeline,
            notes: (caseData.case_notes || []).map(n => n.note).join('\n'),
            issue_type: caseData.issue_type,
            linked_intelligence: linkedIntelligence // Pass Intelligence to AI
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
        - **Analyze Linked Intelligence**: Use the provided linked cases to assess if this is an organized ring. Mention linked cases in the analysis.
        
        Generate a JSON object with these keys:
        - victim_platform
        - victim_contact
        - victim_dates
        - victim_statement
        - suspect_aliases
        - suspect_location
        - suspect_socials
        - suspect_comms
        - suspect_behavior
        - suspect_scam_type
        - suspect_confidence
        - mo_contact
        - mo_escalation
        - mo_manipulation
        - mo_extraction
        - mo_timeline
        - analysis_pattern
        - analysis_organized
        - analysis_similarities: Explicitly reference linked cases and shared indicators found.
        - analysis_risk
        - analysis_attribution
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
            linked_intelligence: linkedIntelligence, // New Section
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
                action: "Auto-Generated Profile (with Intelligence Scan)"
            }]
        };

        return Response.json({ success: true, profile });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});