import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { text, fileUrl } = await req.json();

        if (!text && !fileUrl) {
            return Response.json({ error: "No text or file provided" }, { status: 400 });
        }

        let contentToAnalyze = text || "";

        // If a file URL is provided, we might want to pass it to the LLM if it supports vision/file analysis
        // Or if it's a text file, fetch it. For now, we'll assume the LLM integration handles file_urls
        // or we focus on text input first. 
        // The prompt below is designed to be used with the InvokeLLM integration.

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: `
            Extract the following case details from the provided text/report.
            Return a JSON object with these exact keys:
            - case_title (string, a brief summary title)
            - victim_name (string)
            - victim_email (string)
            - victim_phone (string)
            - fraud_type (string, one of: crypto_theft, phishing, fake_exchange, rug_pull, romance_scam, investment_scam, pig_butchering, ransomware, other)
            - amount_stolen_usd (number)
            - cryptocurrency (string, e.g. BTC, ETH)
            - blockchain (string, e.g. ethereum, bitcoin, bsc, polygon, solana, tron - try to map to these if possible)
            - incident_date (string, YYYY-MM-DD format)
            - description (string, a comprehensive summary of what happened)
            - priority (string, one of: low, medium, high, critical - infer based on amount and urgency)

            Input text:
            ${contentToAnalyze}
            `,
            file_urls: fileUrl ? [fileUrl] : undefined,
            response_json_schema: {
                type: "object",
                properties: {
                    case_title: { type: "string" },
                    victim_name: { type: "string" },
                    victim_email: { type: "string" },
                    victim_phone: { type: "string" },
                    fraud_type: { type: "string", enum: ["crypto_theft", "phishing", "fake_exchange", "rug_pull", "romance_scam", "investment_scam", "pig_butchering", "ransomware", "other"] },
                    amount_stolen_usd: { type: "number" },
                    cryptocurrency: { type: "string" },
                    blockchain: { type: "string" },
                    incident_date: { type: "string" },
                    description: { type: "string" },
                    priority: { type: "string", enum: ["low", "medium", "high", "critical"] }
                }
            }
        });

        return Response.json({ success: true, data: response });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});