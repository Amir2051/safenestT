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

            return Response.json({ success: true, count: records.length });
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