import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);

        if (!user || (user.role !== 'admin' && !user.is_admin && user.job_title !== 'Fraud Specialist')) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { action, logData, rawNotes } = await req.json();

        if (action === 'analyze_notes') {
            const prompt = `
            You are a crypto fraud investigation assistant. Analyze the following raw notes from a client communication.
            
            Raw Notes:
            "${rawNotes}"
            
            Please extract and structure the following information if present:
            1. A concise professional summary of the conversation.
            2. Identify any specific entities mentioned: scam type, amounts lost (fiat/crypto), platforms, wallet addresses, transaction hashes.
            3. Assess the risk level based on keywords (e.g., "funds moving now", "active contact", "desperate", "suicidal").
            4. Flag missing critical evidence (e.g., "User didn't provide wallet", "No screenshots").
            
            Return ONLY a JSON object with this schema:
            {
                "summary": "string",
                "extracted_data": {
                    "scam_type": "string or null",
                    "amount_lost_fiat": number or null,
                    "amount_lost_crypto": number or null,
                    "platforms": "string or null",
                    "wallets_involved": "string or null",
                    "tx_hashes": "string or null"
                },
                "risk_assessment": {
                    "risk_level": "Low" | "Medium" | "High" | "Critical",
                    "reasoning": "string"
                },
                "missing_evidence": ["string"],
                "suggested_tags": ["string"]
            }
            `;

            const aiRes = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        summary: { type: "string" },
                        extracted_data: {
                            type: "object",
                            properties: {
                                scam_type: { type: ["string", "null"] },
                                amount_lost_fiat: { type: ["number", "null"] },
                                amount_lost_crypto: { type: ["number", "null"] },
                                platforms: { type: ["string", "null"] },
                                wallets_involved: { type: ["string", "null"] },
                                tx_hashes: { type: ["string", "null"] }
                            }
                        },
                        risk_assessment: {
                            type: "object",
                            properties: {
                                risk_level: { type: "string", enum: ["Low", "Medium", "High", "Critical"] },
                                reasoning: { type: "string" }
                            }
                        },
                        missing_evidence: { type: "array", items: { type: "string" } },
                        suggested_tags: { type: "array", items: { type: "string" } }
                    }
                }
            });

            return Response.json(aiRes);
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Communication AI Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});