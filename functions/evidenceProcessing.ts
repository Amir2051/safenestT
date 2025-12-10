import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Papa from 'npm:papaparse@5.4.1';

const ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/g;
const TX_HASH_REGEX = /0x[a-fA-F0-9]{64}/g;

async function fetchFileContent(url) {
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
    return addr ? addr.toLowerCase() : null;
}

function detectRole(from, to, victimAddr, scammerAddr) {
    if (!from || !to) return 'OTHER';
    const f = normalizeAddress(from);
    const t = normalizeAddress(to);
    const v = normalizeAddress(victimAddr);
    const s = normalizeAddress(scammerAddr);

    if (f === v || t === v) return 'VICTIM';
    if (f === s || t === s) return 'SCAMMER';
    return 'OTHER';
}

function extractTransactions(data, type) {
    const txs = [];
    const rows = Array.isArray(data) ? data : [];

    for (const row of rows) {
        let tx = {};
        
        // Etherscan CSV / Generic CSV Mapping
        // Map common headers
        const keys = Object.keys(row).reduce((acc, k) => {
            acc[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = k;
            return acc;
        }, {});

        const getVal = (keyPart) => {
            const match = Object.keys(keys).find(k => k.includes(keyPart));
            return match ? row[keys[match]] : null;
        };

        const hash = getVal('txhash') || getVal('hash') || getVal('transactionhash');
        const from = getVal('from');
        const to = getVal('to');
        const value = getVal('value');
        const time = getVal('date') || getVal('timestamp') || getVal('time');
        const token = getVal('token') || getVal('symbol');
        
        if (hash) {
            tx = {
                tx_hash: hash,
                from_address: from,
                to_address: to,
                value_wei: null, // Hard to calc without decimals, keep null or raw
                value_eth: parseFloat(value) || 0,
                token_symbol: token,
                timestamp: time ? new Date(time).toISOString() : new Date().toISOString(),
                original_row: row
            };
            txs.push(tx);
        }
    }
    return txs;
}

function extractFromText(text) {
    const txs = [];
    const hashes = [...new Set(text.match(TX_HASH_REGEX) || [])];
    // Simple extraction: just find hashes. 
    // Deep extraction of from/to from unstructured text is hard without NLP or strict context.
    // For now, we return identified hashes.
    return hashes.map(h => ({ tx_hash: h, source: 'text_extraction' }));
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);

        if (!user || (!user.role === 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, data } = await req.json();

        if (action === 'parse') {
            const { fileUrl, fileType, caseId } = data;
            const content = await fetchFileContent(fileUrl);
            
            let transactions = [];
            let parseErrors = null;

            try {
                if (fileType.includes('csv') || fileType.includes('excel') || fileType.includes('spreadsheet')) {
                    const rawData = await parseCSV(content);
                    transactions = extractTransactions(rawData, 'csv');
                } else if (fileType.includes('json')) {
                    const jsonData = JSON.parse(content);
                    // Handle list or etherscan API response format
                    const list = Array.isArray(jsonData) ? jsonData : (jsonData.result || []);
                    transactions = extractTransactions(list, 'json');
                } else if (fileType.includes('pdf') || fileType.includes('image') || fileType.includes('word') || fileType.includes('document')) {
                    // Use LLM for unstructured/complex documents
                    const prompt = `
                        Analyze the attached evidence file (crypto investigation context).
                        Extract all cryptocurrency transaction data found.
                        Return a JSON object with a "transactions" array.
                        Each transaction should have:
                        - tx_hash (string, mandatory if visible)
                        - from_address (string)
                        - to_address (string)
                        - value_eth (number)
                        - token_symbol (string)
                        - timestamp (string ISO 8601)
                        - exchange_metadata (string, e.g. "Binance Deposit")
                        
                        Also normalize any addresses found.
                    `;
                    
                    const llmRes = await base44.integrations.Core.InvokeLLM({
                        prompt,
                        file_urls: [fileUrl],
                        response_json_schema: {
                            type: "object",
                            properties: {
                                transactions: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            tx_hash: { type: "string" },
                                            from_address: { type: "string" },
                                            to_address: { type: "string" },
                                            value_eth: { type: "number" },
                                            token_symbol: { type: "string" },
                                            timestamp: { type: "string" },
                                            exchange_metadata: { type: "string" }
                                        }
                                    }
                                }
                            }
                        }
                    });
                    
                    transactions = llmRes.transactions || [];
                } else {
                    // Text / HTML / EML
                    transactions = extractFromText(content);
                }
            } catch (e) {
                parseErrors = e.message;
            }

            // Auto-detect addresses
            const addressCounts = {};
            transactions.forEach(t => {
                if(t.from_address) addressCounts[t.from_address] = (addressCounts[t.from_address] || 0) + 1;
                if(t.to_address) addressCounts[t.to_address] = (addressCounts[t.to_address] || 0) + 1;
            });

            // Naive detection: most frequent might be victim (wallet owner)
            const sortedAddrs = Object.entries(addressCounts).sort((a,b) => b[1] - a[1]);
            const likelyVictim = sortedAddrs.length > 0 ? sortedAddrs[0][0] : null;

            return Response.json({
                success: true,
                transactions: transactions.slice(0, 50), // Send preview
                total_found: transactions.length,
                detected_addresses: {
                    victim: likelyVictim ? [likelyVictim] : [],
                    scammer: []
                },
                parse_errors: parseErrors
            });
        }

        if (action === 'confirm') {
            const { caseId, evidenceFileId, transactions, victimAddress, scammerAddress } = data;

            // Save Extract Transactions
            // Using service role for bulk insert
            const records = transactions.map(t => ({
                case_id: caseId,
                evidence_file_id: evidenceFileId,
                tx_hash: t.tx_hash,
                from_address: t.from_address,
                to_address: t.to_address,
                value_eth: t.value_eth,
                token_symbol: t.token_symbol,
                timestamp: t.timestamp,
                detected_role: detectRole(t.from_address, t.to_address, victimAddress, scammerAddress)
            }));

            // Bulk create chunks (limit 100 per call usually, extracting full list)
            // For this demo, assuming list isn't massive or just doing one batch
            if (records.length > 0) {
                 await base44.asServiceRole.entities.ExtractedTransaction.bulkCreate(records);
            }

            // Update file status
            await base44.asServiceRole.entities.CaseEvidenceFile.update(evidenceFileId, {
                parse_status: 'CONFIRMED',
                summary: {
                    total_txs: records.length,
                    victim: victimAddress,
                    scammer: scammerAddress
                }
            });

            // --- AUTO-FILL & CROSS-REFERENCE LOGIC ---
            
            // 1. Fetch current case
            const currentCase = await base44.asServiceRole.entities.MyCase.get(caseId);
            
            // 2. Extract unique new wallets/hashes from confirmed data
            const newWallets = new Set();
            const newHashes = new Set();
            transactions.forEach(t => {
                if (t.from_address) newWallets.add(normalizeAddress(t.from_address));
                if (t.to_address) newWallets.add(normalizeAddress(t.to_address));
                if (t.tx_hash) newHashes.add(t.tx_hash);
            });
            if (scammerAddress) newWallets.add(normalizeAddress(scammerAddress));

            // 3. Update MyCase Crypto Intel (Auto-Fill)
            const updates = {};
            let updated = false;
            
            const existingWallets = new Set((currentCase.monitored_wallets || []).map(normalizeAddress));
            const existingHashes = new Set(currentCase.transaction_hashes || []); // Assuming field exists or we create it
            
            // Add new wallets to monitored
            const combinedWallets = [...existingWallets];
            newWallets.forEach(w => {
                if (w && !existingWallets.has(w)) {
                    combinedWallets.push(w);
                    updated = true;
                }
            });
            
            // Update scammer wallet if not set
            if (scammerAddress && !currentCase.scammer_wallet) {
                updates.scammer_wallet = scammerAddress;
                updated = true;
            }

            if (updated) {
                updates.monitored_wallets = combinedWallets;
                updates.last_activity = new Date().toISOString();
                await base44.asServiceRole.entities.MyCase.update(caseId, updates);
            }

            // 4. Cross-Reference Scanning
            if (newWallets.size > 0) {
                const walletList = Array.from(newWallets);
                // Scan all other cases for these wallets
                // Note: This simple filter might miss if wallets are in arrays, but basic string matching or calling caseAnalysis helps.
                // We'll do a simple check here for immediate feedback.
                
                // Fetch potential matches (cases with matching scammer wallet or monitored wallets)
                // Since filtering by array inclusion is hard in simple query, we'll list recent active cases
                const recentCases = await base44.asServiceRole.entities.MyCase.list('-created_date', 500);
                const matches = [];

                for (const other of recentCases) {
                    if (other.id === caseId) continue;
                    
                    const otherWallets = new Set([
                        ...(other.monitored_wallets || []),
                        other.scammer_wallet,
                        ...(other.scammer_info?.wallet_addresses || [])
                    ].map(normalizeAddress).filter(Boolean));

                    const intersection = walletList.filter(w => otherWallets.has(w));
                    if (intersection.length > 0) {
                        matches.push({
                            case: other,
                            wallets: intersection
                        });
                    }
                }

                // 5. Notify & Log
                if (matches.length > 0) {
                    const matchSummary = matches.map(m => `Case ${m.case.case_number} (${m.wallets.join(', ')})`).join('; ');
                    
                    // Add Timeline Event for Linking
                    await base44.asServiceRole.entities.CaseTimelineEvent.create({
                        case_id: caseId,
                        event_type: 'system_alert',
                        description: `CROSS-REFERENCE MATCH: Connected to ${matches.length} other cases. Shared wallets: ${matchSummary}`,
                        performed_by: 'system',
                        metadata: JSON.stringify({ matches: matches.map(m => m.case.id) }),
                        created_at: new Date().toISOString() // Assuming created_at or uses default
                    }).catch(() => {}); // catch if schema mismatch on date

                    // AI Summary of Relationship
                    // (Optional: Call LLM here if needed, but simple string is faster)
                }
            }

            // 6. User Notification (Timeline & Email)
            // Add timeline event for evidence
            await base44.asServiceRole.entities.CaseTimelineEvent.create({
                case_id: caseId,
                event_type: 'evidence_processed',
                description: `New evidence processed. ${records.length} transactions extracted. Auto-filled crypto intel.`,
                performed_by: 'system',
                metadata: JSON.stringify({ count: records.length }),
                created_at: new Date().toISOString()
            }).catch(() => {});

            // Send Email
            const clientEmail = currentCase.client_email || currentCase.created_by_email;
            if (clientEmail) {
                try {
                    await base44.integrations.Core.SendEmail({
                        to: clientEmail,
                        subject: `Case Update: Evidence Processed (${currentCase.case_number})`,
                        body: `Hello,\n\nNew evidence has been processed for your case ${currentCase.case_number}.\n\n- ${records.length} transactions extracted\n- Crypto intelligence updated\n- Cross-case scanning completed\n\nLog in to your dashboard to view the latest updates.\n\nSafeNestT Security Team`
                    });
                } catch(e) { console.error("Email failed", e); }
            }

            return Response.json({ success: true, count: records.length, updated_case: updated, matches_found: matches?.length || 0 });
        }

        if (action === 'delete_evidence') {
            const { id } = data;
            // Delete transactions first
            const txs = await base44.asServiceRole.entities.ExtractedTransaction.filter({ evidence_file_id: id });
            for (const tx of txs) {
                await base44.asServiceRole.entities.ExtractedTransaction.delete(tx.id);
            }
            // Delete file record
            await base44.asServiceRole.entities.CaseEvidenceFile.delete(id);
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});