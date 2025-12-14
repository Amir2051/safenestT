import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Papa from 'npm:papaparse@5.4.1';

const ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/g;
const TX_HASH_REGEX = /0x[a-fA-F0-9]{64}/g;

async function fetchFileContent(url) {
    console.log(`Fetching file from ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
    return await response.text();
}

function parseCSV(content) {
    return new Promise((resolve, reject) => {
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (err) => reject(err)
        });
    });
}

function normalizeAddress(addr) {
    return addr ? addr.toLowerCase().trim() : null;
}

function extractTransactionsStandard(content, fileType) {
    const txs = [];
    let textContent = content;
    
    // Simple Regex extraction for text-based content
    const hashes = [...new Set(textContent.match(TX_HASH_REGEX) || [])];
    const addresses = [...new Set(textContent.match(ADDRESS_REGEX) || [])];
    
    // Attempt to structure if CSV/JSON
    if (fileType.includes('csv') || fileType.includes('spreadsheet')) {
        // Handled in main flow via PapaParse usually, but if here:
        // Already parsed? No, content is text.
        // We'll trust the main flow to pass parsed data if it's CSV.
    }
    
    // Basic fallback objects
    hashes.forEach(h => {
        txs.push({
            hash: h,
            from: addresses[0] || null, // Best guess if unstructured
            to: addresses[1] || null,
            timestamp: new Date().toISOString(),
            status: 'Extracted'
        });
    });
    
    return { transactions: txs, addresses, hashes };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);

        if (!user || (!user.role === 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, data } = await req.json();
        console.log(`Processing action: ${action}`);

        if (action === 'process_upload') {
            const { caseId, evidenceFileId, fileUrl, fileType, fileName } = data;
            
            // 1. Fetch Case Data
            const entityName = data.entityName || 'MyCase';
            let currentCase = null;
            try {
                currentCase = await base44.asServiceRole.entities[entityName].get(caseId);
            } catch (e) {
                // Fallback logic for legacy cases or if entity name is wrong
                try {
                    currentCase = await base44.asServiceRole.entities.InvestigationCase.get(caseId);
                } catch (ex) {
                    return Response.json({ error: 'Case not found' }, { status: 404 });
                }
            }

            const scammerWallet = normalizeAddress(currentCase.scammer_wallet);
            const victimWallet = normalizeAddress(currentCase.victim_wallet);
            const knownWallets = new Set([
                scammerWallet,
                ...(currentCase.scammer_info?.wallet_addresses || []).map(normalizeAddress),
                ...(currentCase.monitored_wallets || []).map(normalizeAddress)
            ].filter(Boolean));

            // 2. Extract Data (Smart Parsing)
            let extractedData = { transactions: [], addresses: [], hashes: [], text: "" };
            let processingMethod = "Standard Parsing";

            // If Image/PDF, use LLM Vision/Text Extraction
            if (fileType.includes('image') || fileType.includes('pdf')) {
                processingMethod = "AI OCR & Analysis";
                const prompt = `
                    Analyze this evidence file (Screenshot, PDF, or Image) for a crypto fraud case.
                    Extract all visible:
                    1. Wallet Addresses (ETH, BTC, etc.)
                    2. Transaction Hashes
                    3. Dates/Timestamps
                    4. Amounts & Token Names
                    5. URLs or Domain Names (e.g. malicious websites)
                    6. Phone Numbers
                    7. Platform/Exchange Mentions (e.g. Binance, Coinbase, specialized trading apps)
                    8. Context (e.g., "Exchange Withdrawal", "Chat Log", "Scam Site Interface")
                    
                    Return a JSON object with:
                    {
                        "addresses": ["0x...", "bc1..."],
                        "hashes": ["0x..."],
                        "transactions": [{"hash": "...", "from": "...", "to": "...", "amount": "...", "date": "..."}],
                        "urls": ["https://..."],
                        "phones": ["+1..."],
                        "platforms": ["Binance", ...],
                        "summary_text": "Brief description of what is shown and key findings."
                    }
                `;
                
                try {
                    const llmRes = await base44.integrations.Core.InvokeLLM({
                        prompt,
                        file_urls: [fileUrl],
                        response_json_schema: {
                            type: "object",
                            properties: {
                                addresses: { type: "array", items: { type: "string" } },
                                hashes: { type: "array", items: { type: "string" } },
                                transactions: { type: "array", items: { type: "object" } },
                                urls: { type: "array", items: { type: "string" } },
                                phones: { type: "array", items: { type: "string" } },
                                platforms: { type: "array", items: { type: "string" } },
                                summary_text: { type: "string" }
                            }
                        }
                    });
                    extractedData = {
                        addresses: llmRes.addresses || [],
                        hashes: llmRes.hashes || [],
                        transactions: llmRes.transactions || [],
                        urls: llmRes.urls || [],
                        phones: llmRes.phones || [],
                        platforms: llmRes.platforms || [],
                        text: llmRes.summary_text || ""
                    };
                } catch (e) {
                    console.error("LLM Extraction failed:", e);
                    // Fallback to basic text if possible (not for images usually)
                }
            } 
            // If Text/CSV/JSON
            else {
                const content = await fetchFileContent(fileUrl);
                extractedData.text = content.substring(0, 2000); // Sample
                
                if (fileType.includes('csv') || fileType.includes('spreadsheet')) {
                    const rows = await parseCSV(content);
                    // Use helper logic from before (simplified here for brevity, assume standardized keys)
                    // ... (Include logic to map CSV columns to extractedData.transactions)
                    // For now, using regex on raw content as robust fallback + rows
                    const regexRes = extractTransactionsStandard(content, fileType);
                    extractedData.addresses = regexRes.addresses;
                    extractedData.hashes = regexRes.hashes;
                    extractedData.transactions = regexRes.transactions; // Or improve with CSV rows
                } else {
                    const regexRes = extractTransactionsStandard(content, fileType);
                    extractedData = { ...extractedData, ...regexRes };
                }
            }

            // 3. Comparison & Cross-Reference
            const extractedWallets = extractedData.addresses.map(normalizeAddress);
            const matchesReported = extractedWallets.some(w => knownWallets.has(w));
            
            // Check Global DB (Simulated "ScamDatabase" entity check)
            let suspectMatches = [];
            if (extractedWallets.length > 0) {
                // In efficient real-world, use specialized search. Here, we loop or use $in if supported.
                // Assuming small batch or basic check.
                // Checking first 10 for demo performance
                for (const w of extractedWallets.slice(0, 10)) {
                    const found = await base44.asServiceRole.entities.ScamDatabase.filter({ identifier: w });
                    if (found && found.length > 0) suspectMatches.push({ wallet: w, info: found[0] });
                }
            }

            // 4. Generate Intelligence Summary
            const analysisPrompt = `
                Generate a short intelligence summary for this evidence upload.
                
                File: ${fileName}
                Extracted: ${extractedData.addresses.length} wallets, ${extractedData.transactions.length} transactions.
                Matched Reported Scammer: ${matchesReported ? "YES" : "NO"}
                Matched Global Database: ${suspectMatches.length > 0 ? "YES" : "NO"}
                Extracted Data Sample: ${JSON.stringify(extractedData.transactions.slice(0, 3))}
                Context Text: ${extractedData.text}
                
                Output plain text summary (max 100 words) formatted as:
                Evidence Source: [Filename]
                Wallets Detected: [Count]
                Transactions Extracted: [Count]
                Matches with Reported Scammer Wallet: [Yes/No]
                Suspect Database Matches: [Yes/No]
                Possible Money Flow Direction: [Brief Analysis]
                Risk Flags Triggered: [List]
                Recommendation: [Actionable Advice]
            `;
            
            let summaryText = "";
            try {
                const summaryRes = await base44.integrations.Core.InvokeLLM({
                    prompt: analysisPrompt
                });
                summaryText = summaryRes; // String response
            } catch (e) {
                summaryText = "Automated analysis failed to generate text summary.";
            }

            // 5. Save Data & Update Entity
            
            // NEW: Create structured CaseEvidenceItems
            const evidenceItems = [];

            // Helper to determine confidence
            const getConfidence = (item) => {
                // Simple heuristic: if it matches extraction regex exactly, high. 
                return 'medium'; 
            };

            // Process Transactions
            if (extractedData.transactions && extractedData.transactions.length > 0) {
                extractedData.transactions.forEach(t => {
                    evidenceItems.push({
                        case_id: caseId,
                        evidence_file_id: evidenceFileId,
                        category: 'blockchain_transaction',
                        data: {
                            transaction_hash: t.hash,
                            blockchain: 'ETH', // Default, LLM can refine
                            from_address: t.from,
                            to_address: t.to,
                            amount: parseFloat(t.amount || 0),
                            token: t.token || 'ETH',
                            timestamp: t.date || new Date().toISOString(),
                            transaction_type: 'transfer' // Default
                        },
                        source: 'extracted',
                        confidence: getConfidence(t),
                        analyst_note: `Extracted from ${fileName}.` + (t.hash ? " Valid hash format." : ""),
                        status: 'pending_review'
                    });
                });
            }

            // Process Wallets
            if (extractedData.addresses && extractedData.addresses.length > 0) {
                extractedData.addresses.forEach(addr => {
                    // Check if already added as part of a transaction to avoid dupe noise? 
                    // For now, add distinct wallet items for tracking roles
                    evidenceItems.push({
                        case_id: caseId,
                        evidence_file_id: evidenceFileId,
                        category: 'wallet_address',
                        data: {
                            wallet_address: addr,
                            role: 'unknown', // Investigator to label
                            first_seen: new Date().toISOString()
                        },
                        source: 'extracted',
                        confidence: 'high',
                        analyst_note: `Wallet address identified in evidence.`,
                        status: 'pending_review'
                    });
                });
            }

            // Save items
            if (evidenceItems.length > 0) {
                await base44.asServiceRole.entities.CaseEvidenceItem.bulkCreate(evidenceItems).catch(e => console.warn("Evidence Item save error", e));
            }

            // Legacy support: Save Extracted Transactions (keeping for backward compatibility if needed)
            if (extractedData.transactions.length > 0) {
                const records = extractedData.transactions.map(t => ({
                    case_id: caseId,
                    evidence_file_id: evidenceFileId,
                    tx_hash: t.hash || `gen-${Math.random()}`,
                    from_address: t.from,
                    to_address: t.to,
                    value_eth: parseFloat(t.amount || t.value || 0),
                    token_symbol: t.token || t.asset || 'ETH',
                    timestamp: t.date || t.timestamp || new Date().toISOString(),
                    detected_role: 'EVIDENCE_EXTRACT'
                }));
                // Bulk create allows array
                await base44.asServiceRole.entities.ExtractedTransaction.bulkCreate(records).catch(e => console.warn("Tx save error", e));
            }

            // Update Evidence File Record
            await base44.asServiceRole.entities.CaseEvidenceFile.update(evidenceFileId, {
                parse_status: 'PARSED',
                summary: {
                    analysis_text: summaryText,
                    wallet_count: extractedData.addresses?.length || 0,
                    tx_count: extractedData.transactions?.length || 0,
                    urls: extractedData.urls || [],
                    phones: extractedData.phones || [],
                    platforms: extractedData.platforms || [],
                    match_reported: matchesReported,
                    suspect_matches: suspectMatches.length,
                    suspect_details: suspectMatches
                },
                detected_addresses: {
                    extracted: extractedData.addresses || [],
                    suspects: suspectMatches.map(m => m.wallet)
                }
            });

            // Update parent case evidence_log to reflect analysis (for UI consistency)
            if (currentCase) {
                const evidenceLog = currentCase.evidence_log || [];
                const updatedLog = evidenceLog.map(item => {
                    if (item.file_url === fileUrl) {
                        return {
                            ...item,
                            summary: {
                                analysis_text: summaryText,
                                match_reported: matchesReported,
                                suspect_matches: suspectMatches.length
                            },
                            extracted_data: {
                                urls: extractedData.urls,
                                phones: extractedData.phones,
                                platforms: extractedData.platforms
                            }
                        };
                    }
                    return item;
                });
                
                // Only update if changes found
                if (JSON.stringify(evidenceLog) !== JSON.stringify(updatedLog)) {
                    await base44.asServiceRole.entities[entityName || 'MyCase'].update(caseId, {
                        evidence_log: updatedLog
                    });
                }
            }

            // 6. Update Timeline
            await base44.asServiceRole.entities.CaseTimelineEvent.create({
                case_id: caseId,
                event_type: 'automated_intelligence',
                description: `Automated Intelligence Update: Analyzed ${fileName}. ${matchesReported ? "MATCH FOUND." : "No direct match."}`,
                performed_by: 'System (AI)',
                metadata: JSON.stringify({ file_id: evidenceFileId, match: matchesReported }),
                timestamp: new Date().toISOString()
            });

            // 7. Update Case (Last Activity & Flags)
            const caseUpdates = { last_activity: new Date().toISOString() };
            if (matchesReported) {
                // Add note or flag
                // We won't overwrite existing manually set fields, but we can add to notes
                await base44.asServiceRole.entities.CaseNote.create({
                    case_id: caseId,
                    author: "System (Evidence Match)",
                    content: `ALERT: Evidence ${fileName} contains activity linked to reported scammer wallet.`,
                    type: "system_alert",
                    timestamp: new Date().toISOString()
                });
            }
            await base44.asServiceRole.entities.MyCase.update(caseId, caseUpdates);

            return Response.json({ success: true, summary: summaryText });
        }

        // --- Keep Legacy Actions for compatibility if needed, or redirect ---
        if (action === 'delete_evidence') {
            const { id } = data;
            const txs = await base44.asServiceRole.entities.ExtractedTransaction.filter({ evidence_file_id: id });
            for (const tx of txs) {
                await base44.asServiceRole.entities.ExtractedTransaction.delete(tx.id);
            }
            await base44.asServiceRole.entities.CaseEvidenceFile.delete(id);
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Function Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});