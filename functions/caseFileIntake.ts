import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // Admin-only access
        if (!user || (user.role !== 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }
        
        const { action, files, extractedData, targetUserEmail } = await req.json();
        
        if (action === 'extract') {
            // Extract text from uploaded files
            const extractedFiles = [];
            
            for (const file of files) {
                try {
                    // Fetch file content
                    const response = await fetch(file.url);
                    const blob = await response.blob();
                    const text = await blob.text();
                    
                    extractedFiles.push({
                        filename: file.name,
                        url: file.url,
                        text: text.slice(0, 50000), // Limit to 50k chars per file
                        uploadedAt: new Date().toISOString()
                    });
                } catch (error) {
                    extractedFiles.push({
                        filename: file.name,
                        url: file.url,
                        text: '',
                        error: `Failed to extract: ${error.message}`,
                        uploadedAt: new Date().toISOString()
                    });
                }
            }
            
            // Combine all text
            const combinedText = extractedFiles
                .filter(f => !f.error && f.text)
                .map(f => `=== ${f.filename} ===\n${f.text}`)
                .join('\n\n');
            
            if (!combinedText) {
                return Response.json({ 
                    success: false,
                    error: 'No readable text found in uploaded files',
                    files: extractedFiles
                });
            }
            
            // Use AI to extract structured case information
            const prompt = `You are a case intake assistant. Extract structured case information from the provided documents.

DOCUMENTS:
${combinedText}

Extract the following information in JSON format:
{
  "case_title": "Brief descriptive title",
  "issue_type": "crypto_theft|phishing|investment_scam|romance_scam|rug_pull|fake_exchange|other",
  "description": "Detailed summary of the case",
  "people_involved": [
    {"name": "Full Name", "role": "victim|scammer|witness", "contact": "email or phone if available"}
  ],
  "dates": [
    {"event": "Description of event", "date": "YYYY-MM-DD"}
  ],
  "locations": ["City/Country mentioned"],
  "contact_info": {
    "victim_name": "Victim's name",
    "victim_email": "Email if found",
    "victim_phone": "Phone if found"
  },
  "financial_details": {
    "amount_lost": 0,
    "currency": "USD|BTC|ETH|etc",
    "scammer_wallet": "Wallet address if found",
    "victim_wallet": "Victim wallet if found",
    "blockchain": "ethereum|bitcoin|etc"
  },
  "evidence_references": ["List of evidence files mentioned"],
  "urgency": "low|medium|high|critical",
  "scammer_info": {
    "name": "Scammer name/alias",
    "email": "Scammer email",
    "phone": "Scammer phone",
    "social_media": ["Social profiles"],
    "wallet_addresses": ["Wallet addresses"]
  },
  "summary_notes": "Key observations or missing information"
}

Rules:
- Use "Not Provided" for missing fields
- Extract dates in YYYY-MM-DD format
- Detect urgency based on amount, timing, ongoing threats
- Be thorough - extract all available details`;

            const aiResponse = await base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        case_title: { type: "string" },
                        issue_type: { type: "string" },
                        description: { type: "string" },
                        people_involved: { 
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    role: { type: "string" },
                                    contact: { type: "string" }
                                }
                            }
                        },
                        dates: { 
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    event: { type: "string" },
                                    date: { type: "string" }
                                }
                            }
                        },
                        locations: { 
                            type: "array",
                            items: { type: "string" }
                        },
                        contact_info: { 
                            type: "object",
                            properties: {
                                victim_name: { type: "string" },
                                victim_email: { type: "string" },
                                victim_phone: { type: "string" }
                            }
                        },
                        financial_details: { 
                            type: "object",
                            properties: {
                                amount_lost: { type: "number" },
                                currency: { type: "string" },
                                scammer_wallet: { type: "string" },
                                victim_wallet: { type: "string" },
                                blockchain: { type: "string" }
                            }
                        },
                        evidence_references: { 
                            type: "array",
                            items: { type: "string" }
                        },
                        urgency: { type: "string" },
                        scammer_info: { 
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                email: { type: "string" },
                                phone: { type: "string" },
                                social_media: { 
                                    type: "array",
                                    items: { type: "string" }
                                },
                                wallet_addresses: { 
                                    type: "array",
                                    items: { type: "string" }
                                }
                            }
                        },
                        summary_notes: { type: "string" }
                    }
                }
            });
            
            return Response.json({
                success: true,
                extractedData: aiResponse,
                files: extractedFiles,
                message: `Successfully extracted case information from ${extractedFiles.length} file(s)`
            });
            
        } else if (action === 'create-case') {
            // Create case from extracted data
            const caseData = {
                client_name: extractedData.contact_info?.victim_name || 'Unknown',
                client_email: targetUserEmail || extractedData.contact_info?.victim_email || 'admin-created@safenest.com',
                phone_number: extractedData.contact_info?.victim_phone,
                issue_type: extractedData.issue_type || 'other',
                status: 'Pending',
                urgency: extractedData.urgency || 'Medium',
                description: extractedData.description || extractedData.summary_notes || '',
                amount_lost: extractedData.financial_details?.amount_lost || 0,
                cryptocurrency: extractedData.financial_details?.currency,
                blockchain: extractedData.financial_details?.blockchain,
                scammer_wallet: extractedData.financial_details?.scammer_wallet,
                victim_wallet: extractedData.financial_details?.victim_wallet,
                scammer_info: extractedData.scammer_info,
                evidence_files: files.map(f => ({
                    name: f.name,
                    url: f.url,
                    type: f.type || 'document',
                    uploaded_date: new Date().toISOString(),
                    description: 'Admin uploaded case intake file'
                })),
                timeline: extractedData.dates?.map(d => ({
                    event: d.event,
                    date: d.date,
                    details: ''
                })) || [],
                created_by_admin: true,
                admin_creator_email: user.email,
                metadata: JSON.stringify({
                    source: 'admin_file_intake',
                    extracted_at: new Date().toISOString(),
                    files_processed: files.length,
                    ai_extraction: true
                })
            };
            
            // Use caseManagement function to create case
            const response = await base44.functions.invoke('caseManagement', {
                action: targetUserEmail ? 'create_for_user' : 'create',
                data: {
                    ...caseData,
                    target_user_email: targetUserEmail,
                    target_user_name: extractedData.contact_info?.victim_name
                }
            });
            
            if (!response.data.success) {
                throw new Error(response.data.error || 'Failed to create case');
            }
            
            return Response.json({
                success: true,
                case: response.data.case,
                message: `Case ${response.data.case.case_number} created successfully`
            });
            
        } else if (action === 're-analyze') {
            // Re-run extraction with modified parameters
            return Response.json({
                success: false,
                error: 'Re-analysis not yet implemented'
            });
        }
        
        return Response.json({ error: 'Invalid action' }, { status: 400 });
        
    } catch (error) {
        console.error('Case File Intake Error:', error);
        return Response.json({ 
            error: error.message,
            success: false
        }, { status: 500 });
    }
});