import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && !user.is_admin)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action, data } = await req.json();

    switch (action) {
      case 'track-wallet':
        return await trackWallet(data, base44, user);
      
      case 'get-transactions':
        return await getTransactions(data);
      
      case 'get-balance':
        return await getBalance(data);
      
      case 'analyze-fund-flow':
        return await analyzeFundFlow(data);
      
      case 'calculate-risk-score':
        return await calculateRiskScore(data);
      
      case 'detect-exchange':
        return await detectExchange(data);
      
      case 'monitor-wallets':
        return await monitorWallets(base44);
      
      case 'generate-report':
        return await generateLawEnforcementReport(data, base44);
      
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Blockchain intelligence error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function trackWallet(data, base44, user) {
  const { wallet_address, blockchain, fraud_case_id, wallet_type } = data;

  // Fetch initial data first
  const transactions = await fetchBlockchainTransactions(wallet_address, blockchain);
  const balance = await fetchWalletBalance(wallet_address, blockchain);
  const riskScore = calculateWalletRiskScore(transactions, blockchain);

  // Store transactions in database
  if (transactions.length > 0 && fraud_case_id) {
    const txToStore = transactions.slice(0, 100).map(tx => ({
      case_id: fraud_case_id,
      tx_hash: tx.hash,
      from_address: tx.from,
      to_address: tx.to,
      amount: parseFloat(tx.value) || 0,
      blockchain: blockchain,
      asset: tx.asset || blockchain === 'ethereum' ? 'ETH' : 'BTC',
      timestamp: tx.timestamp,
      direction: tx.from.toLowerCase() === wallet_address.toLowerCase() ? 'outgoing' : 'incoming',
      status: tx.status || 'confirmed',
      block_number: tx.blockNumber,
      gas_used: tx.gasUsed,
      category: tx.category
    }));

    // Bulk create transactions
    for (const tx of txToStore) {
      try {
        await base44.asServiceRole.entities.Transaction.create(tx);
      } catch (err) {
        console.error('Transaction insert error:', err);
      }
    }
  }

  // Create or update wallet monitor
  const monitor = await base44.asServiceRole.entities.WalletMonitor.create({
    wallet_address,
    blockchain,
    fraud_case_id,
    wallet_type: wallet_type || 'unknown',
    monitoring_status: 'active',
    alert_enabled: true,
    current_balance: balance.amount,
    balance_usd: balance.usd,
    total_transactions: transactions.length,
    risk_score: riskScore.score,
    risk_indicators: riskScore.indicators,
    last_transaction_date: transactions[0]?.timestamp || new Date().toISOString(),
    last_check: new Date().toISOString()
  });

  // Log action if case is provided
  if (fraud_case_id) {
    await base44.asServiceRole.entities.InvestigationLog.create({
      admin_email: user.email,
      action_type: 'wallet_added',
      wallet_address,
      fraud_case_id,
      description: `Started monitoring wallet on ${blockchain}`
    });
  }

  // Generate alerts for high-risk wallets
  if (riskScore.score > 70) {
    await base44.asServiceRole.entities.BlockchainAlert.create({
      wallet_monitor_id: monitor.id,
      wallet_address,
      alert_type: 'high_risk_interaction',
      severity: 'high',
      title: 'High Risk Wallet Detected',
      message: `Wallet ${wallet_address} has a risk score of ${riskScore.score}`,
      metadata: {
        risk_indicators: riskScore.indicators,
        transaction_count: transactions.length
      }
    });

    // NOTIFICATION: Alert Investigators
    try {
        // Find admins to notify (simplified: notifying specific role or all admins would be better, using placeholder for now)
        // Ideally we'd list admins, but for efficiency let's just log or assume a shared inbox/dashboard view is primary.
        // If fraud_case_id exists, notify the case owner.
        if (fraud_case_id) {
            const relatedCase = await base44.asServiceRole.entities.MyCase.get(fraud_case_id).catch(() => null);
            if (relatedCase && relatedCase.assigned_to) {
                await base44.asServiceRole.entities.Notification.create({
                    user_id: relatedCase.assigned_to,
                    type: 'security',
                    title: 'CRITICAL: High Risk Wallet Linked to Case',
                    message: `High risk wallet ${wallet_address} (Score: ${riskScore.score}) linked to case ${relatedCase.case_number}.`,
                    actionUrl: `/investigation/${fraud_case_id}`
                });
            }
        }
    } catch (e) {
        console.error("Failed to create investigator notification", e);
    }
  }

  // Check for exchange interactions
  const exchangeTransactions = transactions.filter(tx => {
    const toType = detectWalletType(tx.to);
    const fromType = detectWalletType(tx.from);
    return toType === 'exchange' || fromType === 'exchange';
  });

  if (exchangeTransactions.length > 0) {
    await base44.asServiceRole.entities.BlockchainAlert.create({
      wallet_monitor_id: monitor.id,
      wallet_address,
      alert_type: 'exchange_deposit',
      severity: 'critical',
      title: 'Exchange Interaction Detected',
      message: `Wallet has ${exchangeTransactions.length} transaction(s) with exchanges`,
      metadata: {
        exchange_transactions: exchangeTransactions.slice(0, 5)
      }
    });
  }

  return Response.json({
    success: true,
    data: {
      monitor,
      transactions,
      balance,
      riskScore
    }
  });
}

async function fetchBlockchainTransactions(address, blockchain) {
  // Prioritize Etherscan for Ethereum
  if (blockchain === 'ethereum' || blockchain === 'eth') {
    const ETHERSCAN_API_KEY = Deno.env.get("ETHERSCAN_API_KEY");
    if (ETHERSCAN_API_KEY) {
      try {
        const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === "1" && data.result) {
          return data.result.map(tx => ({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: (parseFloat(tx.value) / 1e18).toString(),
            asset: 'ETH',
            timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
            blockNumber: parseInt(tx.blockNumber),
            status: tx.isError === '0' ? 'confirmed' : 'failed',
            gasUsed: parseInt(tx.gasUsed),
            category: 'external'
          }));
        }
        if (data.message === 'No transactions found') return [];
        console.error("Etherscan returned error:", data);
      } catch (e) {
        console.error("Etherscan fetch failed:", e);
      }
    }
  }

  // Fallback to Alchemy for other chains or if Etherscan fails
  const ALCHEMY_API_KEY = Deno.env.get("ALCHEMY_API_KEY");
  
  // Bitcoin Support (Public API Fallback)
  if (blockchain === 'bitcoin' || blockchain === 'btc') {
      try {
          // Using blockchain.info for basic txs
          const url = `https://blockchain.info/rawaddr/${address}?limit=50`;
          const res = await fetch(url);
          if (res.status === 200) {
              const data = await res.json();
              return data.txs.map(tx => {
                  // Find output to this address or input from this address
                  const isOutgoing = tx.inputs.some(i => i.prev_out.addr === address);
                  const value = isOutgoing 
                      ? tx.out.filter(o => o.addr !== address).reduce((sum, o) => sum + o.value, 0)
                      : tx.out.filter(o => o.addr === address).reduce((sum, o) => sum + o.value, 0);

                  return {
                      hash: tx.hash,
                      from: isOutgoing ? address : (tx.inputs[0]?.prev_out?.addr || 'unknown'),
                      to: isOutgoing ? (tx.out.find(o => o.addr !== address)?.addr || 'multiple') : address,
                      value: (value / 1e8).toString(), // Satoshis to BTC
                      asset: 'BTC',
                      timestamp: new Date(tx.time * 1000).toISOString(),
                      blockNumber: tx.block_height,
                      status: 'confirmed',
                      category: 'external'
                  };
              });
          }
      } catch (e) {
          console.error("BTC Fetch Error:", e);
      }
      return [];
  }

  // Tron Support (Public API Fallback)
  if (blockchain === 'tron' || blockchain === 'trx') {
      try {
          // Using trongrid public (often limited, might need key if high volume)
          const url = `https://api.trongrid.io/v1/accounts/${address}/transactions`;
          const res = await fetch(url);
          if (res.status === 200) {
              const data = await res.json();
              return (data.data || []).map(tx => ({
                  hash: tx.txID,
                  from: tx.raw_data.contract[0].parameter.value.owner_address, // Needs conversion to Base58 usually, keeping raw for now
                  to: tx.raw_data.contract[0].parameter.value.to_address,
                  value: (tx.raw_data.contract[0].parameter.value.amount / 1e6).toString(),
                  asset: 'TRX',
                  timestamp: new Date(tx.block_timestamp).toISOString(),
                  blockNumber: 0, // Not always available in this endpoint easily
                  status: 'confirmed',
                  category: 'external'
              }));
          }
      } catch (e) {
          console.error("TRON Fetch Error:", e);
      }
      return [];
  }

  if (!ALCHEMY_API_KEY) {
    console.warn("ALCHEMY_API_KEY not configured, returning empty transactions");
    return [];
  }

  const networks = {
    'ethereum': 'eth-mainnet',
    'polygon': 'polygon-mainnet',
    'bsc': 'bnb-mainnet',
    'solana': 'solana-mainnet'
  };

  const network = networks[blockchain] || 'eth-mainnet';
  const alchemyUrl = `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

  try {
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromBlock: '0x0',
          toBlock: 'latest',
          fromAddress: address,
          category: ['external', 'erc20', 'erc721', 'erc1155'],
          maxCount: '0x32',
          withMetadata: true
        }]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('Alchemy API error:', data.error);
      return [];
    }

    const transfers = data.result?.transfers || [];

    return transfers.map(tx => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value || '0',
      asset: tx.asset || 'ETH',
      timestamp: tx.metadata?.blockTimestamp || new Date().toISOString(),
      blockNumber: parseInt(tx.blockNum, 16),
      status: 'confirmed',
      gasUsed: 21000,
      category: tx.category
    })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Failed to fetch from Alchemy:', error);
    return [];
  }
}

async function fetchWalletBalance(address, blockchain) {
  // Prioritize Etherscan for Ethereum
  if (blockchain === 'ethereum' || blockchain === 'eth') {
    const ETHERSCAN_API_KEY = Deno.env.get("ETHERSCAN_API_KEY");
    if (ETHERSCAN_API_KEY) {
      try {
        const url = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === "1") {
          const balanceEth = parseFloat(data.result) / 1e18;
          // Get ETH Price
          let ethPrice = 3000;
          try {
             const priceRes = await fetch(`https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${ETHERSCAN_API_KEY}`);
             const priceData = await priceRes.json();
             if (priceData.status === "1") ethPrice = parseFloat(priceData.result.ethusd);
          } catch(e) {}

          return {
            amount: parseFloat(balanceEth.toFixed(4)),
            usd: balanceEth * ethPrice,
            currency: 'ETH'
          };
        }
      } catch (e) {
        console.error("Etherscan balance fetch failed:", e);
      }
    }
  }

  // Fallback to Alchemy
  const ALCHEMY_API_KEY = Deno.env.get("ALCHEMY_API_KEY");
  
  const networks = {
    'ethereum': 'eth-mainnet',
    'polygon': 'polygon-mainnet',
    'bsc': 'bnb-mainnet'
  };

  const network = networks[blockchain] || 'eth-mainnet';
  const alchemyUrl = `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

  try {
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest']
      })
    });

    const data = await response.json();
    const balanceWei = data.result ? parseInt(data.result, 16) : 0;
    const balanceEth = balanceWei / 1e18;
    
    const usdPrice = blockchain === 'ethereum' ? 3000 : blockchain === 'polygon' ? 0.5 : 500;
    
    return {
      amount: parseFloat(balanceEth.toFixed(4)),
      usd: balanceEth * usdPrice,
      currency: blockchain === 'ethereum' ? 'ETH' : blockchain === 'polygon' ? 'MATIC' : 'BNB'
    };
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    return { amount: 0, usd: 0, currency: 'ETH' };
  }
}

function calculateWalletRiskScore(transactions, blockchain) {
  let score = 0;
  const indicators = [];

  // High transaction frequency
  if (transactions.length > 50) {
    score += 15;
    indicators.push('High transaction volume');
  }

  // Quick successive transactions (potential mixer)
  const quickTxs = transactions.filter((tx, i) => {
    if (i === 0) return false;
    const prevTx = transactions[i - 1];
    const timeDiff = Math.abs(new Date(tx.timestamp) - new Date(prevTx.timestamp));
    return timeDiff < 300000; // 5 minutes
  });
  
  if (quickTxs.length > 3) {
    score += 25;
    indicators.push('Rapid sequential transactions (mixer pattern)');
  }

  // Multiple small transactions
  const smallTxs = transactions.filter(tx => parseFloat(tx.value) < 0.1);
  if (smallTxs.length > transactions.length * 0.6) {
    score += 10;
    indicators.push('Multiple small transactions');
  }

  // Random addresses (no pattern)
  const uniqueAddresses = new Set(transactions.map(tx => tx.from === transactions[0].from ? tx.to : tx.from));
  if (uniqueAddresses.size > transactions.length * 0.8) {
    score += 20;
    indicators.push('High address diversity (obfuscation attempt)');
  }

  // Contract interactions
  const contractTxs = transactions.filter(tx => tx.gasUsed > 50000);
  if (contractTxs.length > 5) {
    score += 15;
    indicators.push('Smart contract interactions');
  }

  return {
    score: Math.min(score, 100),
    indicators,
    level: score > 70 ? 'high' : score > 40 ? 'medium' : 'low'
  };
}

async function getTransactions(data) {
  const { wallet_address, blockchain, limit = 50 } = data;
  const transactions = await fetchBlockchainTransactions(wallet_address, blockchain);
  
  return Response.json({
    success: true,
    data: transactions.slice(0, limit)
  });
}

async function getBalance(data) {
  const { wallet_address, blockchain } = data;
  const balance = await fetchWalletBalance(wallet_address, blockchain);
  
  return Response.json({
    success: true,
    data: balance
  });
}

async function analyzeFundFlow(data) {
  const { wallet_address, blockchain, depth = 3 } = data;
  
  // Build transaction flow graph
  const nodes = [];
  const edges = [];
  const visited = new Set();
  
  async function traceWallet(address, level) {
    if (level > depth || visited.has(address)) return;
    visited.add(address);
    
    const txs = await fetchBlockchainTransactions(address, blockchain);
    
    nodes.push({
      id: address,
      label: `Wallet ${nodes.length + 1}`,
      level,
      balance: (Math.random() * 5).toFixed(2),
      type: level === 0 ? 'source' : detectWalletType(address)
    });
    
    for (const tx of txs.slice(0, 5)) {
      const targetAddress = tx.from === address ? tx.to : tx.from;
      
      edges.push({
        from: tx.from,
        to: tx.to,
        value: tx.value,
        hash: tx.hash,
        timestamp: tx.timestamp
      });
      
      if (level < depth) {
        await traceWallet(targetAddress, level + 1);
      }
    }
  }
  
  await traceWallet(wallet_address, 0);
  
  // Detect patterns
  const exchangeNodes = nodes.filter(n => n.type === 'exchange');
  const mixerNodes = nodes.filter(n => n.type === 'mixer');
  const bridgeNodes = nodes.filter(n => n.type === 'bridge');
  
  return Response.json({
    success: true,
    data: {
      nodes,
      edges,
      totalHops: nodes.length - 1,
      exchangeDetected: exchangeNodes.length > 0,
      exchanges: exchangeNodes.map(n => n.label),
      mixerDetected: mixerNodes.length > 0,
      bridgeUsed: bridgeNodes.length > 0,
      riskLevel: mixerNodes.length > 0 ? 'high' : exchangeNodes.length > 0 ? 'medium' : 'low'
    }
  });
}

function detectWalletType(address) {
  const patterns = {
    '0xbinance': 'exchange',
    '0xcoinbase': 'exchange',
    '0xkraken': 'exchange',
    'tornado': 'mixer',
    'bridge': 'bridge'
  };
  
  const lowerAddress = address.toLowerCase();
  for (const [pattern, type] of Object.entries(patterns)) {
    if (lowerAddress.includes(pattern)) return type;
  }
  
  return 'unknown';
}

async function calculateRiskScore(data) {
  const { wallet_address, blockchain } = data;
  const transactions = await fetchBlockchainTransactions(wallet_address, blockchain);
  const riskData = calculateWalletRiskScore(transactions, blockchain);
  
  return Response.json({
    success: true,
    data: riskData
  });
}

async function detectExchange(data) {
  const { wallet_address } = data;
  const type = detectWalletType(wallet_address);
  
  const exchangeMap = {
    '0xbinance': 'Binance',
    '0xcoinbase': 'Coinbase',
    '0xkraken': 'Kraken',
    '0xkucoin': 'KuCoin',
    '0xokx': 'OKX'
  };
  
  const detected = Object.keys(exchangeMap).find(pattern => 
    wallet_address.toLowerCase().includes(pattern)
  );
  
  return Response.json({
    success: true,
    data: {
      isExchange: type === 'exchange',
      exchangeName: detected ? exchangeMap[detected] : null,
      type,
      confidence: detected ? 'high' : 'unknown'
    }
  });
}

async function monitorWallets(base44) {
  // Fetch all active monitors
  const monitors = await base44.asServiceRole.entities.WalletMonitor.filter({
    monitoring_status: 'active'
  });

  const alerts = [];
  let totalNewTx = 0;

  for (const monitor of monitors) {
    const transactions = await fetchBlockchainTransactions(monitor.wallet_address, monitor.blockchain);
    const lastCheckDate = monitor.last_transaction_date ? new Date(monitor.last_transaction_date) : new Date(0);

    // Filter new transactions
    const newTxs = transactions.filter(tx => new Date(tx.timestamp) > lastCheckDate);

    if (newTxs.length > 0) {
      // Update Monitor immediately to prevent double processing in case of failure later
      await base44.asServiceRole.entities.WalletMonitor.update(monitor.id, {
        last_transaction_date: newTxs[0].timestamp, // Assuming sorted descending
        total_transactions: (monitor.total_transactions || 0) + newTxs.length,
        last_check: new Date().toISOString()
      });

      for (const tx of newTxs) {
          totalNewTx++;
          const isOutgoing = tx.from.toLowerCase() === monitor.wallet_address.toLowerCase();
          const direction = isOutgoing ? 'outgoing' : 'incoming';
          const counterparty = isOutgoing ? tx.to : tx.from;

          // 1. Create Transaction Record
          await base44.asServiceRole.entities.Transaction.create({
              wallet_monitor_id: monitor.id,
              case_id: monitor.fraud_case_id,
              tx_hash: tx.hash,
              from_address: tx.from,
              to_address: tx.to,
              amount: parseFloat(tx.value),
              asset: tx.asset,
              blockchain: monitor.blockchain,
              timestamp: tx.timestamp,
              direction: direction,
              category: tx.category,
              status: tx.status
          });

          // 2. Create Case Activity Entry
          if (monitor.fraud_case_id) {
              await base44.asServiceRole.entities.CaseTimelineEvent.create({
                  case_id: monitor.fraud_case_id,
                  event_type: 'new_transaction',
                  description: `New ${direction} transaction of ${tx.value} ${tx.asset} detected on monitored wallet ${monitor.wallet_address}.`,
                  timestamp: new Date().toISOString(),
                  performed_by: 'system'
              });
          }

          // 3. Risk Checks & Alerts
          const toType = detectWalletType(counterparty);
          let alertSeverity = 'medium';
          let alertTitle = 'New Transaction Detected';

          if (toType === 'exchange' || toType === 'mixer') {
              alertSeverity = 'critical';
              alertTitle = `Critical: Funds Moved to ${toType === 'exchange' ? 'Exchange' : 'Mixer'}`;
          } else if (parseFloat(tx.value) > 1000) { // Arbitrary large value threshold in native token units? careful
              alertSeverity = 'high';
              alertTitle = 'Large Value Transfer Detected';
          }

          const alert = await base44.asServiceRole.entities.BlockchainAlert.create({
              wallet_monitor_id: monitor.id,
              wallet_address: monitor.wallet_address,
              alert_type: toType === 'exchange' ? 'exchange_deposit' : 'new_transaction',
              severity: alertSeverity,
              title: alertTitle,
              message: `${direction.toUpperCase()} ${tx.value} ${tx.asset} to ${counterparty} (${toType})`,
              transaction_hash: tx.hash,
              amount: parseFloat(tx.value),
              from_address: tx.from,
              to_address: tx.to,
              detected_entity: toType !== 'unknown' ? toType : undefined
          });
          alerts.push(alert);

          // 4. Notifications
          // Find assigned admin for the case
          if (monitor.fraud_case_id) {
              const caseData = await base44.asServiceRole.entities.MyCase.get(monitor.fraud_case_id).catch(() => null);
              if (caseData && caseData.assigned_to) {
                  // Dashboard Notification
                  await base44.asServiceRole.entities.Notification.create({
                      user_id: caseData.assigned_to,
                      type: 'security',
                      title: `Wallet Alert: ${caseData.case_number}`,
                      message: `${alertTitle}: ${tx.value} ${tx.asset} on ${monitor.wallet_type} wallet.`,
                      actionUrl: `/investigation/${caseData.id}`
                  });

                  // Email Notification
                  if (alertSeverity === 'critical' || alertSeverity === 'high') {
                      try {
                          await base44.integrations.Core.SendEmail({
                              to: caseData.assigned_to,
                              subject: `URGENT: ${alertTitle} - Case ${caseData.case_number}`,
                              body: `Activity detected on monitored ${monitor.wallet_type} wallet ${monitor.wallet_address}.\n\nTransaction: ${tx.hash}\nAmount: ${tx.value} ${tx.asset}\nDirection: ${direction}\n\nPlease review immediately.`
                          });
                      } catch(e) {}
                  }
              }
          }
      }
    }
  }

  return Response.json({
    success: true,
    data: {
      monitored: monitors.length,
      alerts: alerts.length,
      new_transactions: totalNewTx
    }
  });
}

async function generateLawEnforcementReport(data, base44) {
  const { fraud_case_id } = data;
  
  const fraudCase = await base44.asServiceRole.entities.FraudCase.filter({ id: fraud_case_id });
  if (!fraudCase || fraudCase.length === 0) {
    throw new Error('Case not found');
  }
  
  const caseData = fraudCase[0];
  const monitors = await base44.asServiceRole.entities.WalletMonitor.filter({ fraud_case_id });
  const alerts = await base44.asServiceRole.entities.BlockchainAlert.list('-created_date', 100);
  
  const report = {
    reportId: `LE-${Date.now()}`,
    reportType: 'LAW_ENFORCEMENT_INVESTIGATION',
    generatedAt: new Date().toISOString(),
    caseInformation: {
      caseId: caseData.id,
      title: caseData.case_title,
      reportedDate: caseData.created_date,
      fraudType: caseData.fraud_type,
      status: caseData.status
    },
    victimDetails: {
      reportedBy: caseData.created_by,
      victimWallet: caseData.victim_wallet,
      amountLost: caseData.amount_stolen_usd,
      currency: caseData.blockchain
    },
    suspectInformation: {
      primaryWallet: caseData.scammer_wallet,
      blockchain: caseData.blockchain,
      connectedWallets: monitors.length,
      riskScore: monitors[0]?.risk_score || 0
    },
    blockchainEvidence: {
      trackedWallets: monitors.map(m => ({
        address: m.wallet_address,
        type: m.wallet_type,
        riskScore: m.risk_score,
        balance: m.balance_usd,
        lastActivity: m.last_transaction_date
      })),
      exchangeInteractions: monitors.filter(m => m.exchange_detected).map(m => ({
        exchange: m.exchange_name,
        wallet: m.wallet_address,
        detected: m.created_date
      })),
      mixerUsage: monitors.filter(m => m.mixer_detected).length,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length
    },
    evidenceAttachments: caseData.evidence || [],
    investigationTimeline: caseData.case_notes || [],
    recommendations: [
      'Contact identified exchanges immediately for account freezing',
      'Submit to FBI IC3 (Internet Crime Complaint Center)',
      'File with local law enforcement',
      'Coordinate with crypto forensics team for deeper analysis',
      'Monitor all identified wallets for additional fund movement'
    ],
    contacts: {
      fbi_ic3: 'https://www.ic3.gov',
      secret_service: 'Electronic Crimes Task Force',
      ftc: 'Federal Trade Commission',
      irs_ci: 'IRS Criminal Investigation'
    }
  };
  
  return Response.json({
    success: true,
    data: report
  });
}