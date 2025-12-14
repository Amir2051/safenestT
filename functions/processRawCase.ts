import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { case_id, raw_input, file_urls } = await req.json();
        
        // Fetch case data if case_id provided
        let caseData = {};
        let processingFileUrls = file_urls || [];
        
        if (case_id) {
            // Try MyCase first, then InvestigationCase
            let c = await base44.entities.MyCase.get(case_id);
            if (!c) c = await base44.entities.InvestigationCase.get(case_id);
            
            if (c) {
                caseData = c;
                if (c.evidence_files) {
                    processingFileUrls = [...processingFileUrls, ...c.evidence_files.map(f => f.url)];
                }
            }
        }
        
        // Filter out empty or invalid URLs
        processingFileUrls = processingFileUrls.filter(u => u && typeof u === 'string' && u.length > 0);

        // --- PRE-FETCH LINKED CASES CANDIDATES ---
        // We scan raw_input and case data for potential entities (wallets, emails, handles) 
        // and fetch matching cases from DB to provide context to the LLM.
        
        const searchText = (raw_input + " " + JSON.stringify(caseData)).toLowerCase();
        
        // Simple regex extractors
        const potentialWallets = (searchText.match(/(0x[a-f0-9]{40}|[13][a-km-z1-9]{25,34}|bc1[a-z0-9]{39,59})/g) || []);
        const potentialEmails = (searchText.match(/[\w.-]+@[\w.-]+\.\w+/g) || []).filter(e => !e.includes('example.com'));
        const potentialHandles = (searchText.match(/@[a-z0-9_.]+/g) || []);
        
        const uniqueEntities = [...new Set([...potentialWallets, ...potentialEmails, ...potentialHandles])];
        
        let relatedCasesData = [];

        if (uniqueEntities.length > 0) {
            try {
                // We'll search in MyCase and InvestigationCase
                // Note: filtering by "contains" in JSON fields or text fields might be heavy, 
                // so we rely on exact matches or simple filters if possible. 
                // For simplicity/performance in this function, we fetch recent cases and filter in memory 
                // OR we accept that we only match exact fields if the DB supports it.
                // Given the limitations, fetching a batch of recent cases and filtering is safer for now.
                
                const [myCases, invCases] = await Promise.all([
                    base44.entities.MyCase.list('-created_date', 200),
                    base44.entities.InvestigationCase.list('-created_date', 200)
                ]);
                
                const allRecent = [...myCases, ...invCases];
                
                // Helper to check if case contains entity
                const caseContains = (c, entities) => {
                    const str = JSON.stringify(c).toLowerCase();
                    return entities.some(e => str.includes(e));
                };

                relatedCasesData = allRecent.filter(c => c.id !== case_id && caseContains(c, uniqueEntities)).map(c => ({
                    case_id: c.case_number || c.id,
                    title: c.case_title || c.client_name || 'Untitled',
                    entities_found: uniqueEntities.filter(e => JSON.stringify(c).toLowerCase().includes(e))
                }));
            } catch (err) {
                console.warn("Failed to fetch related cases", err);
            }
        }

        const systemPrompt = `
You are an AI assistant for SafeNestt, a platform that collects fraud and scam reports. Your job is to take raw case submissions and produce well-structured, standardized, and readable cases ready for AI verification and database ingestion.

Input: Raw case data, including chat logs, screenshots, transaction records, emails, wallet addresses, phone numbers, social media handles, and victim-submitted notes.

Steps:
1. Entity Extraction
   - Identify all entities in the case: Wallet addresses, Emails, Phone numbers, Social handles, IP addresses.
   - Mask personal data as required for privacy (victim info, personal identifiers).
2. Relationship Mapping
   - Identify connections between entities: Wallet → Wallet, Wallet → Case, Email → Case, etc.
3. Timeline Construction
   - Generate a chronological timeline of the case events.
4. Case Summary
   - Include: Case ID, Victim info (masked), Suspect info, Evidence list, Key events, AI confidence score.
5. Formatting
   - Output both Structured JSON and Readable human summary.
6. Error Handling / Verification
   - Flag missing fields or incomplete evidence.

Structure the JSON output exactly as requested in the schema.

IMPORTANT: Use the provided 'Potential Linked Cases' to populate the 'linked_cases' field. 
If an entity extracted from the input matches a 'Candidate Case', link it!
`;

        const userPrompt = `
Process the following case data:

Case Metadata:
${JSON.stringify({
    title: caseData.case_title || caseData.client_name || 'Untitled',
    description: raw_input || caseData.description || '',
    notes: caseData.notes || '',
    scammer_info: caseData.scammer_info || {},
    issue_type: caseData.issue_type || caseData.fraud_type
}, null, 2)}

Potential Linked Cases (Found in Database):
${JSON.stringify(relatedCasesData, null, 2)}

Existing Evidence Files: ${processingFileUrls.length} files attached.
`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: userPrompt + "\n\n" + systemPrompt,
            file_urls: processingFileUrls.length > 0 ? processingFileUrls : undefined,
            response_json_schema: {
                type: "object",
                properties: {
                    structured_data: {
                        type: "object",
                        properties: {
                            case_id: { type: "string" },
                            victim: { 
                                type: "object",
                                properties: {
                                    masked_name: { type: "string" },
                                    email: { type: "string" }
                                }
                            },
                            suspect: {
                                type: "object",
                                properties: {
                                    wallets: { type: "array", items: { type: "string" } },
                                    emails: { type: "array", items: { type: "string" } },
                                    social_handles: { type: "array", items: { type: "string" } }
                                }
                            },
                            evidence: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        file_name: { type: "string" },
                                        type: { type: "string" }
                                    }
                                }
                            },
                            timeline: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        date: { type: "string" },
                                        event: { type: "string" }
                                    }
                                }
                            },
                            relationships: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        from: { type: "string" },
                                        to: { type: "string" },
                                        type: { type: "string" }
                                    }
                                }
                            },
                            linked_cases: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        case_id: { type: "string" },
                                        entity: { type: "string" },
                                        relationship_type: { type: "string" }
                                    }
                                }
                            },
                            confidence_score: { type: "number" },
                            missing_fields: { type: "array", items: { type: "string" } },
                            notes: { type: "string" }
                        },
                        required: ["case_id", "victim", "suspect", "timeline", "confidence_score", "linked_cases"]
                    },
                    readable_summary: { type: "string" }
                },
                required: ["structured_data", "readable_summary"]
            }
        });

        // Optionally update the case if case_id was provided
        if (case_id && response.structured_data) {
             const updates = {};
             
             // Update Scammer Info if found new data
             if (response.structured_data.suspect) {
                 const s = response.structured_data.suspect;
                 const currentInfo = caseData.scammer_info || {};
                 
                 updates.scammer_info = {
                     ...currentInfo,
                     wallet_addresses: [...new Set([...(currentInfo.wallet_addresses || []), ...(s.wallets || [])])],
                     known_emails: [...new Set([...(currentInfo.known_emails || []), ...(s.emails || [])])],
                     social_media: [...new Set([...(currentInfo.social_media || []), ...(s.social_handles || [])])]
                 };
             }

             // Update timeline if empty
             if ((!caseData.timeline || caseData.timeline.length === 0) && response.structured_data.timeline) {
                 updates.timeline = response.structured_data.timeline.map(t => ({
                     date: t.date,
                     event: t.event,
                     details: "Extracted by AI"
                 }));
             }
             
             // Save AI summary to notes or a dedicated field
             if (response.readable_summary) {
                 updates.ai_analysis = response.readable_summary;
             }

             if (Object.keys(updates).length > 0) {
                 // Try updating MyCase or InvestigationCase
                 try {
                    // Check if it's MyCase
                    let isMyCase = false;
                    try {
                        const check = await base44.entities.MyCase.get(case_id);
                        if (check) isMyCase = true;
                    } catch (e) {
                        // ignore
                    }

                    if (isMyCase) {
                        await base44.entities.MyCase.update(case_id, updates);
                    } else {
                        await base44.entities.InvestigationCase.update(case_id, updates);
                    }
                 } catch (e) {
                     console.warn("Failed to auto-update case with extracted data", e);
                 }
             }
        }

        return Response.json(response);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});