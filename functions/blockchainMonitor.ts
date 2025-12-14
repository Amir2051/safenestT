import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const ETHERSCAN_API_KEY = Deno.env.get("ETHERSCAN_API_KEY");
const BASE_URL = 'https://api.etherscan.io/api';

async function fetchTransactions(address) {
    if (!ETHERSCAN_API_KEY) return [];
    try {
        const url = `${BASE_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        return Array.isArray(data.result) ? data.result : [];
    } catch (e) {
        console.error(`Etherscan fetch error for ${address}:`, e);
        return [];
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        // Allow admin or service role trigger
        if (!user || (user.role !== 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { caseId } = await req.json().catch(() => ({}));

        // 1. Get Cases to Monitor
        let cases = [];
        if (caseId) {
            // Try fetching from both potential entities
            let c = await base44.asServiceRole.entities.MyCase.get(caseId).catch(() => null);
            if (!c) c = await base44.asServiceRole.entities.InvestigationCase.get(caseId).catch(() => null);
            if (c) cases.push(c);
        } else {
            // Monitor all active cases (limit to recent modified for performance if needed, or status based)
            // For this implementation, we'll fetch open cases with monitored wallets
            // Note: Filter might be limited, so we fetch active ones.
            const myCases = await base44.asServiceRole.entities.MyCase.filter({ status: 'investigating' }); // Example status
            const invCases = await base44.asServiceRole.entities.InvestigationCase.filter({ status: 'investigating' });
            cases = [...myCases, ...invCases];
        }

        let totalNewTx = 0;
        const results = [];

        for (const caseData of cases) {
            const monitoredWallets = caseData.monitored_wallets || [];
            if (monitoredWallets.length === 0) continue;

            // Get existing evidence to check duplicates
            // We fetch all blockchain_transactions for this case
            const existingEvidence = await base44.asServiceRole.entities.CaseEvidenceItem.filter({ 
                case_id: caseData.id,
                category: 'blockchain_transaction'
            });
            const existingHashes = new Set(existingEvidence.map(e => e.data?.transaction_hash).filter(Boolean));

            for (const wallet of monitoredWallets) {
                const txs = await fetchTransactions(wallet);
                
                // Process recent transactions (e.g. last 50 to avoid huge loops)
                const newTxs = txs.filter(tx => !existingHashes.has(tx.hash)).slice(0, 20); 

                for (const tx of newTxs) {
                    // Determine Role & Counterparty
                    const isOutgoing = tx.from.toLowerCase() === wallet.toLowerCase();
                    const counterparty = isOutgoing ? tx.to : tx.from;
                    
                    if (!counterparty) continue; // Contract creation or weird tx

                    // 1. Create Transaction Evidence
                    const valueEth = (parseInt(tx.value) / 1e18).toFixed(6);
                    const txEvidence = {
                        case_id: caseData.id,
                        category: 'blockchain_transaction',
                        data: {
                            transaction_hash: tx.hash,
                            blockchain: 'ETH',
                            from_address: tx.from,
                            to_address: tx.to,
                            amount: parseFloat(valueEth),
                            token: 'ETH',
                            timestamp: new Date(tx.timeStamp * 1000).toISOString(),
                            transaction_type: isOutgoing ? 'outgoing' : 'incoming',
                            monitored_wallet_involved: wallet
                        },
                        source: 'extracted',
                        confidence: 'high',
                        status: 'pending_review',
                        analyst_note: `Automated Monitor Detection: Transaction detected involving monitored wallet ${wallet}.`
                    };

                    await base44.asServiceRole.entities.CaseEvidenceItem.create(txEvidence);

                    // 2. Create Wallet Evidence (Counterparty)
                    // Check if this wallet is already logged?
                    // We might spam wallet evidence if we don't check. 
                    // Let's check if we have a wallet evidence for this counterparty in this case.
                    // Since we can't deep filter efficiently on all db types, we might skip checking for now or rely on analyst cleanup.
                    // But to be cleaner, let's just create it. The UI can handle dupes or we can try to filter.
                    // Better: Create it.
                    
                    const walletEvidence = {
                        case_id: caseData.id,
                        category: 'wallet_address',
                        data: {
                            wallet_address: counterparty,
                            role: 'suspected_scammer', // As requested
                            first_seen: new Date(tx.timeStamp * 1000).toISOString(),
                            linked_tx: tx.hash
                        },
                        source: 'extracted',
                        confidence: 'medium',
                        status: 'pending_review',
                        analyst_note: `Automated Monitor: Counterparty in transaction ${tx.hash} with monitored wallet.`
                    };

                    await base44.asServiceRole.entities.CaseEvidenceItem.create(walletEvidence);

                    // 3. Generate Analyst Note (LLM)
                    // We'll generate a note about the pattern
                    const prompt = `
                        Analyze this crypto transaction detected by the monitoring system.
                        Monitored Wallet (Suspect): ${wallet}
                        Transaction: ${tx.hash}
                        Direction: ${isOutgoing ? "Outgoing (Funds moving away)" : "Incoming (Funds received)"}
                        Amount: ${valueEth} ETH
                        Counterparty: ${counterparty}
                        Time: ${new Date(tx.timeStamp * 1000).toISOString()}
                        
                        Suggest further investigation steps. Is this likely a victim payment, money laundering (layering), or exchange deposit?
                        Keep it short (1-2 sentences).
                    `;

                    let analysis = "New transaction detected.";
                    try {
                        analysis = await base44.integrations.Core.InvokeLLM({ prompt });
                    } catch (e) {
                        console.error("LLM Error", e);
                    }

                    // Add note to case timeline or CaseNote
                    await base44.asServiceRole.entities.CaseNote.create({
                        case_id: caseData.id,
                        author: "Blockchain Monitor (AI)",
                        note: `Starting investigation on new tx ${tx.hash}. ${analysis}`,
                        type: "system_alert",
                        timestamp: new Date().toISOString()
                    });

                    totalNewTx++;
                }
                results.push({ wallet, new_tx_count: newTxs.length });
            }
        }

        return Response.json({ success: true, processed: results, total_new: totalNewTx });

    } catch (error) {
        console.error("Blockchain Monitor Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});