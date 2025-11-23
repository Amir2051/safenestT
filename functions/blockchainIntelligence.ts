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

  // Create or update wallet monitor
  const monitor = await base44.asServiceRole.entities.WalletMonitor.create({
    wallet_address,
    blockchain,
    fraud_case_id,
    wallet_type: wallet_type || 'unknown',
    monitoring_status: 'active',
    alert_enabled: true,
    last_check: new Date().toISOString()
  });

  // Log action
  await base44.asServiceRole.entities.InvestigationLog.create({
    admin_email: user.email,
    action_type: 'wallet_added',
    wallet_address,
    fraud_case_id,
    description: `Started monitoring wallet on ${blockchain}`
  });

  // Fetch initial data
  const transactions = await fetchBlockchainTransactions(wallet_address, blockchain);
  const balance = await fetchWalletBalance(wallet_address, blockchain);
  const riskScore = calculateWalletRiskScore(transactions, blockchain);

  // Update monitor with initial data
  await base44.asServiceRole.entities.WalletMonitor.update(monitor.id, {
    current_balance: balance.amount,
    balance_usd: balance.usd,
    total_transactions: transactions.length,
    risk_score: riskScore.score,
    risk_indicators: riskScore.indicators,
    last_transaction_date: transactions[0]?.timestamp
  });

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
  // Simulate API call (in production, use Etherscan, Blockchain.com, etc.)
  const mockTransactions = [
    {
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      from: address,
      to: `0x${Math.random().toString(16).substr(2, 40)}`,
      value: (Math.random() * 5).toFixed(4),
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      blockNumber: Math.floor(18000000 + Math.random() * 100000),
      status: 'confirmed',
      gasUsed: Math.floor(21000 + Math.random() * 50000)
    },
    {
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      from: `0x${Math.random().toString(16).substr(2, 40)}`,
      to: address,
      value: (Math.random() * 3).toFixed(4),
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 14).toISOString(),
      blockNumber: Math.floor(17900000 + Math.random() * 100000),
      status: 'confirmed',
      gasUsed: Math.floor(21000 + Math.random() * 50000)
    }
  ];

  return mockTransactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

async function fetchWalletBalance(address, blockchain) {
  // Simulate balance fetch
  const amount = (Math.random() * 10).toFixed(4);
  const usdPrice = blockchain === 'ethereum' ? 3000 : blockchain === 'bitcoin' ? 42000 : 500;
  
  return {
    amount: parseFloat(amount),
    usd: parseFloat(amount) * usdPrice,
    currency: blockchain === 'ethereum' ? 'ETH' : blockchain === 'bitcoin' ? 'BTC' : 'BNB'
  };
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
  
  for (const monitor of monitors) {
    const transactions = await fetchBlockchainTransactions(monitor.wallet_address, monitor.blockchain);
    const latestTx = transactions[0];
    
    // Check if new transaction since last check
    if (latestTx && (!monitor.last_transaction_date || 
        new Date(latestTx.timestamp) > new Date(monitor.last_transaction_date))) {
      
      // Create alert
      const alert = await base44.asServiceRole.entities.BlockchainAlert.create({
        wallet_monitor_id: monitor.id,
        wallet_address: monitor.wallet_address,
        alert_type: 'new_transaction',
        severity: parseFloat(latestTx.value) > 1 ? 'high' : 'medium',
        title: 'New Transaction Detected',
        message: `${latestTx.value} transferred`,
        transaction_hash: latestTx.hash,
        amount: parseFloat(latestTx.value),
        from_address: latestTx.from,
        to_address: latestTx.to
      });
      
      alerts.push(alert);
      
      // Check for exchange
      const toType = detectWalletType(latestTx.to);
      if (toType === 'exchange') {
        await base44.asServiceRole.entities.BlockchainAlert.create({
          wallet_monitor_id: monitor.id,
          wallet_address: monitor.wallet_address,
          alert_type: 'exchange_deposit',
          severity: 'critical',
          title: 'Exchange Deposit Detected',
          message: `Funds moved to exchange`,
          transaction_hash: latestTx.hash,
          amount: parseFloat(latestTx.value),
          to_address: latestTx.to,
          detected_entity: 'Exchange'
        });
      }
      
      // Update monitor
      await base44.asServiceRole.entities.WalletMonitor.update(monitor.id, {
        last_transaction_date: latestTx.timestamp,
        last_check: new Date().toISOString()
      });
    }
  }
  
  return Response.json({
    success: true,
    data: {
      monitored: monitors.length,
      alerts: alerts.length
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