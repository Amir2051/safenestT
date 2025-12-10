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
    console.log("Parsing CSV content...");
    return new Promise((resolve, reject) => {
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                console.log(`CSV Parsed. Rows: ${results.data.length}`);
                resolve(results.data);
            },
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
    console.log(`Extracting transactions from ${rows.length} rows`);

    for (const row of rows) {
        let tx = {};
        
        const keys = Object.keys(row).reduce((acc, k) => {
            acc[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = k;
            return acc;
        }, {});

        const getVal = (keyPart) => {
            const match = Object.keys(keys).find(k => k.includes(keyPart));
            return match ? row[keys[match]] : null;
        };

        const hash = getVal('txhash') || getVal('hash') || getVal('transactionhash') || getVal('txn_hash');
        const from = getVal('from') || getVal('from_address') || getVal('sender');
        const to = getVal('to') || getVal('to_address') || getVal('receiver') || getVal('recipient');
        const value = getVal('value') || getVal('amount') || getVal('quantity') || getVal('value_in(eth)') || getVal('value_out(eth)');
        const time = getVal('date') || getVal('timestamp') || getVal('time') || getVal('datetime') || getVal('date_utc');
        const token = getVal('token') || getVal('symbol') || getVal('token_symbol');
        const method = getVal('method') || getVal('function');
        
        if (hash || (from && to && value)) {
            tx = {
                hash: hash || `mock-${Date.now()}-${Math.random()}`,
                from: from,
                to: to,
                value: parseFloat(value && value.toString().replace(/,/g, '')) || 0,
                token: token || 'ETH',
                timestamp: time ? new Date(time).toISOString() : new Date().toISOString(),
                status: 'Confirmed'
            };
            txs.push(tx);
        }
    }
    console.log(`Extracted ${txs.length} valid transactions`);
    return txs;
}

function extractFromText(text) {
    console.log("Extracting from text...");
    const txs = [];
    const hashes = [...new Set(text.match(TX_HASH_REGEX) || [])];
    const addresses = [...new Set(text.match(ADDRESS_REGEX) || [])];
    
    hashes.forEach(h => {
        txs.push({
            hash: h,
            from: addresses[0] || 'unknown',
            to: addresses[1] || 'unknown',
            value: 0,
            token: 'ETH',
            timestamp: new Date().toISOString(),
            status: 'Detected'
        });
    });
    return txs;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);

        if (!user || (!user.role === 'admin' && !user.is_admin)) {
            console.log("Unauthorized access attempt");
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, data } = await req.json();
        console.log(`Processing action: ${action}`, data);

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
                    const list = Array.isArray(jsonData) ? jsonData : (jsonData.result || []);
                    transactions = extractTransactions(list, 'json');
                } else {
                    transactions = extractFromText(content);
                }
            } catch (e) {
                console.error("Parse Error:", e);
                parseErrors = e.message;
            }

            const addressCounts = {};
            transactions.forEach(t => {
                if(t.from) addressCounts[t.from] = (addressCounts[t.from] || 0) + 1;
                if(t.to) addressCounts[t.to] = (addressCounts[t.to] || 0) + 1;
            });

            const sortedAddrs = Object.entries(addressCounts).sort((a,b) => b[1] - a[1]);
            const likelyVictim = sortedAddrs.length > 0 ? sortedAddrs[0][0] : null;

            console.log(`Parse complete. Returning ${transactions.length} transactions.`);
            
            // Return flat JSON array as requested
            return Response.json({
                success: true,
                transactions: transactions,
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
            console.log(`Confirming transactions for case ${caseId}`);

            // 1. Fetch current case
            let currentCase = null;
            try {
                currentCase = await base44.asServiceRole.entities.MyCase.get(caseId);
            } catch (e) {
                try {
                    const legacy = await base44.asServiceRole.entities.InvestigationCase.filter({ id: caseId });
                    if (legacy[0]) currentCase = legacy[0];
                } catch (e2) {}
            }
            
            if (!currentCase) throw new Error("Case not found for processing");

            // 2. Save Extracted Transactions (Entity)
            const records = transactions.map(t => ({
                case_id: caseId,
                evidence_file_id: evidenceFileId,
                tx_hash: t.hash,
                from_address: t.from,
                to_address: t.to,
                value_eth: t.value,
                token_symbol: t.token,
                timestamp: t.timestamp,
                detected_role: detectRole(t.from, t.to, victimAddress, scammerAddress)
            }));

            if (records.length > 0) {
                 await base44.asServiceRole.entities.ExtractedTransaction.bulkCreate(records);
            }

            // 3. Update File Status
            if (evidenceFileId) {
                await base44.asServiceRole.entities.CaseEvidenceFile.update(evidenceFileId, {
                    parse_status: 'CONFIRMED',
                    summary: {
                        total_txs: records.length,
                        victim: victimAddress,
                        scammer: scammerAddress
                    }
                });
            }

            // 4. Update MyCase (Transactions, Evidence, Wallets)
            const updates = {};
            let updated = false;

            // Sync Transactions Array (Requested Fix 3)
            const currentTxs = currentCase.transactions || [];
            // Merge new transactions avoiding duplicates
            const newTxs = transactions.filter(nt => !currentTxs.some(ct => ct.hash === nt.hash));
            if (newTxs.length > 0) {
                updates.transactions = [...currentTxs, ...newTxs];
                updated = true;
            }

            // Sync Hashes
            const newHashes = new Set(currentCase.transaction_hashes || []);
            transactions.forEach(t => { if(t.hash) newHashes.add(t.hash) });
            updates.transaction_hashes = Array.from(newHashes);

            // Sync Wallets
            const newWallets = new Set((currentCase.monitored_wallets || []).map(normalizeAddress));
            transactions.forEach(t => {
                if (t.from) newWallets.add(normalizeAddress(t.from));
                if (t.to) newWallets.add(normalizeAddress(t.to));
            });
            if (scammerAddress) newWallets.add(normalizeAddress(scammerAddress));
            
            // Scammer Wallet
            if (scammerAddress && !currentCase.scammer_wallet) {
                updates.scammer_wallet = scammerAddress;
                updated = true;
            }
            
            updates.monitored_wallets = Array.from(newWallets).filter(Boolean);
            if (updates.monitored_wallets.length !== (currentCase.monitored_wallets?.length || 0)) updated = true;

            // Sync Evidence Files (if passed generic file info or inferred)
            if (evidenceFileId) {
                const evidenceFile = await base44.asServiceRole.entities.CaseEvidenceFile.get(evidenceFileId);
                const currentEvidence = currentCase.evidence_files || [];
                if (!currentEvidence.some(e => e.url === evidenceFile.file_url)) {
                    currentEvidence.push({
                        name: evidenceFile.filename,
                        url: evidenceFile.file_url,
                        type: evidenceFile.mime_type,
                        uploaded_date: evidenceFile.uploaded_at,
                        description: `Parsed Evidence: ${records.length} transactions`
                    });
                    updates.evidence_files = currentEvidence;
                    updated = true;
                }
            }

            if (updated) {
                updates.last_activity = new Date().toISOString();
                await base44.asServiceRole.entities.MyCase.update(caseId, updates);
            }

            // 5. Cross-Reference (Requested Fix 4)
            const walletList = Array.from(newWallets).filter(Boolean);
            const matches = [];
            if (walletList.length > 0) {
                const recentCases = await base44.asServiceRole.entities.MyCase.list('-created_date', 500);
                for (const other of recentCases) {
                    if (other.id === caseId) continue;
                    const otherWallets = new Set([
                        ...(other.monitored_wallets || []),
                        other.scammer_wallet,
                        ...(other.scammer_info?.wallet_addresses || [])
                    ].map(normalizeAddress).filter(Boolean));

                    const intersection = walletList.filter(w => otherWallets.has(w));
                    if (intersection.length > 0) {
                        matches.push({ case: other, wallets: intersection });
                    }
                }
            }

            if (matches.length > 0) {
                const matchSummary = matches.map(m => `Case ${m.case.case_number} (${m.wallets.join(', ')})`).join('; ');
                
                await base44.asServiceRole.entities.CaseNote.create({
                    case_id: caseId,
                    author: "System (Cross-Reference)",
                    content: `Linked activity detected with ${matches.length} cases. Possible related scammer.\nMatches: ${matchSummary}`,
                    type: "system_alert",
                    timestamp: new Date().toISOString()
                });
            }

            return Response.json({ success: true, count: records.length, updated_case: updated, matches: matches.length });
        }

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