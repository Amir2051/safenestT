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
    try {
        return addr ? String(addr).toLowerCase().trim() : null;
    } catch(e) { return null; }
}

function extractTransactionsStandard(content, fileType) {
    const txs = [];
    let textContent = content || "";
    
    // Simple Regex extraction for text-based content
    const hashes = [...new Set(textContent.match(TX_HASH_REGEX) || [])];
    const addresses = [...new Set(textContent.match(ADDRESS_REGEX) || [])];
    
    // Attempt to structure if CSV
    if (fileType && (fileType.includes('csv') || fileType.includes('spreadsheet'))) {
        try {
            const parsed = Papa.parse(textContent, { header: true, skipEmptyLines: true });
            if (parsed.data && parsed.data.length > 0) {
                parsed.data.forEach(row => {
                    // Try to map common headers
                    const hash = row['Transaction Hash'] || row['TxHash'] || row['hash'] || row['TXID'] || row['id'];
                    const from = row['From'] || row['from'] || row['Sender'] || row['sender'];
                    const to = row['To'] || row['to'] || row['Recipient'] || row['receiver'];
                    const amount = row['Value'] || row['Amount'] || row['amount'] || row['value'] || row['quantity'];
                    const token = row['Token'] || row['Asset'] || row['Symbol'] || row['currency'];
                    const date = row['DateTime'] || row['Date'] || row['Timestamp'] || row['time'];

                    if (hash || (from && to && amount)) {
                        txs.push({
                            hash: hash || `ext-${Math.random().toString(36).substring(7)}`,
                            from: normalizeAddress(from),
                            to: normalizeAddress(to),
                            amount: amount,
                            token: token || 'ETH',
                            timestamp: date || new Date().toISOString(),
                            status: 'Extracted'
                        });
                        
                        if (hash) hashes.push(hash);
                        if (from) addresses.push(from);
                        if (to) addresses.push(to);
                    }
                });
                // If we successfully parsed rows, return them
                if (txs.length > 0) {
                    return { transactions: txs, addresses: [...new Set(addresses)], hashes: [...new Set(hashes)] };
                }
            }
        } catch (e) {
            console.warn("CSV parsing fallback failed, using regex");
        }
    }
    
    // Fallback: Basic regex objects
    hashes.forEach(h => {
        txs.push({
            hash: h,
            from: addresses[0] || null, // Best guess if unstructured
            to: addresses[1] || null,
            amount: 0,
            token: 'ETH',
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

        // ALLOW authenticated users
        if (!user) {
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
                // Try to get case, handle various entity names
                try {
                    currentCase = await base44.asServiceRole.entities[entityName].get(caseId);
                } catch (e) {
                    if (entityName !== 'MyCase') {
                        currentCase = await base44.asServiceRole.entities.MyCase.get(caseId);
                    } else {
                        currentCase = await base44.asServiceRole.entities.InvestigationCase.get(caseId);
                    }
                }
            } catch (ex) {
                console.warn("Case retrieval failed:", ex);
                // Continue if case not found? No, needed for logic
                return Response.json({ error: 'Case not found' }, { status: 404 });
            }

            const scammerWallet = normalizeAddress(currentCase.scammer_wallet);
            // const victimWallet = normalizeAddress(currentCase.victim_wallet);
            const knownWallets = new Set([
                scammerWallet,
                ...(currentCase.scammer_info?.wallet_addresses || []).map(normalizeAddress),
                ...(currentCase.monitored_wallets || []).map(normalizeAddress)
            ].filter(Boolean));

            // 2. Extract Data (Smart Parsing)
            let extractedData = { transactions: [], addresses: [], hashes: [], text: "" };
            let processingMethod = "Standard Parsing";

            // If Image/PDF, use LLM Vision/Text Extraction
            if (fileType && (fileType.includes('image') || fileType.includes('pdf'))) {
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
                        addresses: Array.isArray(llmRes.addresses) ? llmRes.addresses : [],
                        hashes: Array.isArray(llmRes.hashes) ? llmRes.hashes : [],
                        transactions: Array.isArray(llmRes.transactions) ? llmRes.transactions : [],
                        urls: Array.isArray(llmRes.urls) ? llmRes.urls : [],
                        phones: Array.isArray(llmRes.phones) ? llmRes.phones : [],
                        platforms: Array.isArray(llmRes.platforms) ? llmRes.platforms : [],
                        text: llmRes.summary_text || ""
                    };
                } catch (e) {
                    console.error("LLM Extraction failed:", e);
                    // Fallback to empty
                }
            } 
            // If Text/CSV/JSON
            else {
                try {
                    const content = await fetchFileContent(fileUrl);
                    extractedData.text = content.substring(0, 2000); // Sample
                    
                    if (fileType && (fileType.includes('csv') || fileType.includes('spreadsheet'))) {
                        const regexRes = extractTransactionsStandard(content, fileType);
                        extractedData.addresses = regexRes.addresses || [];
                        extractedData.hashes = regexRes.hashes || [];
                        extractedData.transactions = regexRes.transactions || [];
                    } else {
                        const regexRes = extractTransactionsStandard(content, fileType);
                        extractedData = { ...extractedData, ...regexRes };
                    }
                } catch (e) {
                    console.warn("Text extraction failed:", e);
                }
            }

            // Ensure addresses is array before mapping
            if (!Array.isArray(extractedData.addresses)) extractedData.addresses = [];

            // 3. Comparison & Cross-Reference
            const extractedWallets = extractedData.addresses.map(normalizeAddress).filter(Boolean);
            const matchesReported = extractedWallets.some(w => knownWallets.has(w));
            
            // Check Global DB (Simulated "ScamDatabase" entity check)
            let suspectMatches = [];
            if (extractedWallets.length > 0) {
                try {
                    // Checking first 10 for demo performance
                    for (const w of extractedWallets.slice(0, 10)) {
                        const found = await base44.asServiceRole.entities.ScamDatabase.filter({ identifier: w });
                        if (found && found.length > 0) suspectMatches.push({ wallet: w, info: found[0] });
                    }
                } catch(e) {
                    console.warn("ScamDatabase check failed:", e);
                }
            }

            // 4. Generate Intelligence Summary
            const analysisPrompt = `
                Generate a short intelligence summary for this evidence upload.
                
                File: ${fileName}
                Extracted: ${extractedData.addresses.length} wallets, ${extractedData.transactions.length} transactions.
                Matched Reported Scammer: ${matchesReported ? "YES" : "NO"}
                Matched Global Database: ${suspectMatches.length > 0 ? "YES" : "NO"}
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
                summaryText = typeof summaryRes === 'string' ? summaryRes : JSON.stringify(summaryRes);
            } catch (e) {
                summaryText = "Automated analysis failed to generate text summary.";
            }

            // 5. Save Data & Update Entity
            
            // NEW: Create structured CaseEvidenceItems
            const evidenceItems = [];

            // Helper to determine confidence
            const getConfidence = (item) => {
                return 'medium'; 
            };

            // Process Transactions
            if (extractedData.transactions && Array.isArray(extractedData.transactions)) {
                extractedData.transactions.forEach(t => {
                    try {
                        const amountVal = parseFloat(t.amount || t.value);
                        evidenceItems.push({
                            case_id: caseId,
                            evidence_file_id: evidenceFileId,
                            category: 'blockchain_transaction',
                            data: {
                                transaction_hash: t.hash || null,
                                blockchain: 'ETH',
                                from_address: t.from || null,
                                to_address: t.to || null,
                                amount: isNaN(amountVal) ? 0 : amountVal,
                                token: t.token || 'ETH',
                                timestamp: t.date || new Date().toISOString(),
                                transaction_type: 'transfer'
                            },
                            source: 'extracted',
                            confidence: getConfidence(t),
                            analyst_note: `Extracted from ${fileName}.`,
                            status: 'pending_review'
                        });
                    } catch(e) { console.warn("Skipping tx item:", e); }
                });
            }

            // Process Wallets
            if (extractedData.addresses && Array.isArray(extractedData.addresses)) {
                extractedData.addresses.forEach(addr => {
                    evidenceItems.push({
                        case_id: caseId,
                        evidence_file_id: evidenceFileId,
                        category: 'wallet_address',
                        data: {
                            wallet_address: addr,
                            role: 'unknown',
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
            if (extractedData.transactions && Array.isArray(extractedData.transactions)) {
                const records = extractedData.transactions.map(t => {
                    const val = parseFloat(t.amount || t.value);
                    return {
                        case_id: caseId,
                        evidence_file_id: evidenceFileId,
                        tx_hash: t.hash || `gen-${Math.random()}`,
                        from_address: t.from,
                        to_address: t.to,
                        value_eth: isNaN(val) ? 0 : val,
                        token_symbol: t.token || t.asset || 'ETH',
                        timestamp: t.date || t.timestamp || new Date().toISOString(),
                        detected_role: 'EVIDENCE_EXTRACT'
                    };
                });
                // Bulk create allows array
                if (records.length > 0) {
                    await base44.asServiceRole.entities.ExtractedTransaction.bulkCreate(records).catch(e => console.warn("Tx save error", e));
                }
            }

            // Update Evidence File Record
            try {
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
            } catch(e) {
                console.error("Failed to update CaseEvidenceFile:", e);
            }

            // Update parent case evidence_log to reflect analysis (for UI consistency)
            if (currentCase) {
                try {
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
                } catch(e) { console.warn("Case update warning", e); }
            }

            // 6. Update Timeline
            try {
                await base44.asServiceRole.entities.CaseTimelineEvent.create({
                    case_id: caseId,
                    event_type: 'automated_intelligence',
                    description: `Automated Intelligence Update: Analyzed ${fileName}. ${matchesReported ? "MATCH FOUND." : "No direct match."}`,
                    performed_by: 'System (AI)',
                    metadata: JSON.stringify({ file_id: evidenceFileId, match: matchesReported }),
                    timestamp: new Date().toISOString()
                });
            } catch(e) {}

            // 7. Update Case (Last Activity & Flags)
            const caseUpdates = { last_activity: new Date().toISOString() };
            if (matchesReported) {
                try {
                    await base44.asServiceRole.entities.CaseNote.create({
                        case_id: caseId,
                        author: "System (Evidence Match)",
                        content: `ALERT: Evidence ${fileName} contains activity linked to reported scammer wallet.`,
                        type: "system_alert",
                        timestamp: new Date().toISOString()
                    });
                } catch(e){}
            }
            try {
                await base44.asServiceRole.entities.MyCase.update(caseId, caseUpdates);
            } catch(e) {}

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
        // Clean error for user
        return Response.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
});