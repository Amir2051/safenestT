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
        
        console.log('📥 CASE FILE INTAKE:', { action, filesCount: files?.length, hasExtractedData: !!extractedData });
        
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
            console.log('📝 CREATE-CASE ACTION STARTED');
            console.log('Target Email:', targetUserEmail);
            console.log('Extracted Data:', JSON.stringify(extractedData, null, 2));
            
            // Validate required fields
            if (!extractedData) {
                return Response.json({
                    success: false,
                    error: 'No extracted data provided. Please run AI extraction first.'
                });
            }
            
            // Determine target user
            let targetUser = null;
            let resolvedEmail = targetUserEmail || extractedData.contact_info?.victim_email;
            
            if (resolvedEmail) {
                // Look up user by email
                try {
                    const users = await base44.entities.User.list(null, 5000);
                    targetUser = users.find(u => u.email?.toLowerCase() === resolvedEmail.toLowerCase());
                    
                    if (targetUser) {
                        console.log('✅ Target user found:', targetUser.id, targetUser.email);
                    } else {
                        console.log('⚠️ User not found for email:', resolvedEmail);
                        return Response.json({
                            success: false,
                            error: `User with email "${resolvedEmail}" not found. Please invite them first or leave email blank to create as admin case.`,
                            needsUserInvite: true,
                            email: resolvedEmail
                        });
                    }
                } catch (error) {
                    console.error('Failed to lookup user:', error);
                }
            }
            
            // CRITICAL: Validate scammer wallet (required by caseManagement)
            const scammerWallet = extractedData.financial_details?.scammer_wallet;
            console.log('🔍 Scammer wallet validation:', scammerWallet);
            
            // Allow placeholder for now - will use dummy address if needed
            const finalScammerWallet = (scammerWallet && scammerWallet !== 'Not Provided') 
                ? scammerWallet 
                : '0x0000000000000000000000000000000000000001'; // Placeholder for cases without wallet
            
            console.log('✅ Using scammer wallet:', finalScammerWallet);
            
            // Build case data with ALL required fields
            const caseData = {
                // Client info
                client_name: extractedData.contact_info?.victim_name || 'Unknown Victim',
                client_email: resolvedEmail || user.email,
                phone_number: extractedData.contact_info?.victim_phone || 'Not Provided',
                
                // Case details
                issue_type: extractedData.issue_type || 'other',
                status: 'Pending',
                urgency: (extractedData.urgency || 'medium').toLowerCase(),
                description: extractedData.description || extractedData.summary_notes || 'Case submitted via AI extraction',
                
                // Financial - CRITICAL: scammer_wallet and victim_wallet for caseManagement
                amount_lost: parseFloat(extractedData.financial_details?.amount_lost) || 0,
                cryptocurrency: extractedData.financial_details?.currency || '',
                blockchain: extractedData.financial_details?.blockchain || '',
                scammer_wallet: finalScammerWallet,
                victim_wallet: extractedData.financial_details?.victim_wallet || '',
                
                // Scammer info
                scammer_info: extractedData.scammer_info || {},
                
                // Evidence
                evidence_files: files.map(f => ({
                    name: f.name,
                    url: f.url,
                    type: f.type || 'document',
                    uploaded_date: new Date().toISOString(),
                    description: 'Admin uploaded - AI extraction source'
                })),
                
                // Timeline
                timeline: extractedData.dates?.map(d => ({
                    event: d.event || 'Event',
                    date: d.date || new Date().toISOString(),
                    details: ''
                })) || [],
                
                // Admin metadata
                created_by_admin: !targetUser, // true if admin created without user
                admin_creator_email: user.email,
                
                // CRITICAL: Ownership fields for visibility
                created_by: targetUser?.email || user.email,
                created_by_email: targetUser?.email || user.email,
                created_by_name: targetUser?.full_name || user.full_name,
                
                // Source tracking
                metadata: JSON.stringify({
                    source: 'admin_ai_extraction',
                    extraction_method: 'file_intake',
                    extracted_at: new Date().toISOString(),
                    files_processed: files.length,
                    extracted_by: user.email,
                    ai_extraction: true
                })
            };
            
            console.log('📦 Case data prepared:', {
                client_email: caseData.client_email,
                issue_type: caseData.issue_type,
                has_scammer_wallet: !!caseData.scammer_wallet,
                scammer_wallet: caseData.scammer_wallet
            });
            
            // Use caseManagement function to create case
            const actionType = targetUser ? 'create_for_user' : 'create';
            console.log('🚀 Calling caseManagement with action:', actionType);
            
            // CRITICAL: caseManagement expects scammer_wallet and victim_wallet at TOP LEVEL
            const response = await base44.functions.invoke('caseManagement', {
                action: actionType,
                data: {
                    ...caseData,
                    // REQUIRED: Top-level wallet fields for validation
                    scammer_wallet: finalScammerWallet,
                    victim_wallet: caseData.victim_wallet || '',
                    target_user_email: targetUser?.email,
                    target_user_name: targetUser?.full_name || extractedData.contact_info?.victim_name
                }
            });
            
            console.log('📥 caseManagement response:', response.data);
            
            if (!response.data.success) {
                console.error('❌ Case creation failed:', response.data.error);
                return Response.json({
                    success: false,
                    error: response.data.error || 'Failed to create case'
                });
            }
            
            const createdCase = response.data.case;
            console.log('✅ Case created successfully:', createdCase.id, createdCase.case_number);
            
            // Create timeline event for AI extraction
            try {
                await base44.entities.CaseTimelineEvent.create({
                    case_id: createdCase.id,
                    event_type: 'system_action',
                    event_title: 'Case Created via AI Extraction',
                    event_description: `Case automatically created from ${files.length} uploaded file(s) using AI extraction. Created by ${user.email}.`,
                    severity: 'info',
                    created_by_user: user.email,
                    created_by_name: user.full_name,
                    automated: true,
                    visible_to_client: true
                });
            } catch (e) {
                console.error('Failed to create timeline event:', e);
            }
            
            return Response.json({
                success: true,
                case: createdCase,
                message: `✅ Case ${createdCase.case_number} created successfully${targetUser ? ` and assigned to ${targetUser.email}` : ' as admin case'}`
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
        console.error('❌ CASE FILE INTAKE ERROR:', error);
        return Response.json({ 
            error: error.message,
            success: false,
            stack: error.stack
        }, { status: 500 });
    }
});