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
        return await trackWallet(data, base44);
      
      case 'analyze-transaction-flow':
        return await analyzeTransactionFlow(data, base44);
      
      case 'detect-exchange':
        return await detectExchange(data);
      
      case 'generate-investigation-report':
        return await generateInvestigationReport(data, base44);
      
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Investigation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function trackWallet(data, base44) {
  const { address, blockchain } = data;
  
  // Simulate blockchain API call (in production, integrate with Etherscan, Blockchain.com, etc.)
  const mockTransactions = [
    {
      txid: '0x123abc...',
      from: address,
      to: '0x456def...',
      value: '1.5',
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      blockNumber: 18500000
    },
    {
      txid: '0x789ghi...',
      from: '0xabc123...',
      to: address,
      value: '0.8',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      status: 'confirmed',
      blockNumber: 18499800
    }
  ];

  const live = await base44.asServiceRole.functions.invoke('blockchainIntelligence', {
    action: 'track-wallet',
    data: { wallet_address: address, blockchain }
  });
  const liveBody = live?.data ?? live;
  if (!liveBody?.success) return Response.json({ error: liveBody?.error || 'Blockchain intelligence unavailable' }, { status: 502 });
  return Response.json({
    success: true,
    data: {
      address,
      blockchain,
      balance: liveBody.data?.balance,
      transactions: liveBody.data?.transactions || [],
      totalIncoming: (liveBody.data?.transactions || []).filter(t => String(t.from || '').toLowerCase() !== String(address).toLowerCase()).length,
      totalOutgoing: (liveBody.data?.transactions || []).filter(t => String(t.from || '').toLowerCase() === String(address).toLowerCase()).length,
      riskScore: liveBody.data?.riskScore,
      source: 'blockchainIntelligence'
    }
  });
}

async function analyzeTransactionFlow(data, base44) {
  const { startAddress, blockchain, depth = 5, caseId } = data;
  let address = startAddress;
  let chain = blockchain;
  if (caseId) {
    const caseData = await base44.asServiceRole.entities.MyCase.get(caseId).catch(() => null);
    if (!caseData) return Response.json({ error: 'Case not found' }, { status: 404 });
    address = caseData.scammer_wallet || caseData.victim_wallet || startAddress;
    chain = caseData.blockchain || blockchain;
  }
  if (!address || !chain) return Response.json({ error: 'Case must contain a wallet address and blockchain' }, { status: 400 });

  let transactions = caseId ? await base44.asServiceRole.entities.Transaction.filter({ case_id: caseId }, '-timestamp', 500).catch(() => []) : [];
  if (!transactions.length) {
    const tracked = await base44.asServiceRole.functions.invoke('blockchainIntelligence', {
      action: 'track-wallet',
      data: { wallet_address: address, blockchain: chain, fraud_case_id: caseId, wallet_type: 'scammer' }
    }).catch(() => null);
    transactions = tracked?.data?.data?.transactions || tracked?.data?.transactions || [];
  }
  const relevant = transactions.filter(tx => {
    const from = String(tx.from_address || tx.from || '').toLowerCase();
    const to = String(tx.to_address || tx.to || '').toLowerCase();
    return from === String(address).toLowerCase() || to === String(address).toLowerCase();
  }).slice(0, 200);
  const nodes = new Map();
  nodes.set(address, { id: address, label: 'Case wallet', type: 'scammer' });
  const edges = [];
  for (const tx of relevant) {
    const from = tx.from_address || tx.from;
    const to = tx.to_address || tx.to;
    if (!from || !to) continue;
    if (!nodes.has(from)) nodes.set(from, { id: from, label: 'Transaction address', type: 'wallet' });
    if (!nodes.has(to)) nodes.set(to, { id: to, label: 'Transaction address', type: 'wallet' });
    edges.push({ from, to, value: String(tx.amount ?? tx.value ?? 0), txid: tx.tx_hash || tx.hash || 'unknown', timestamp: tx.timestamp || tx.created_date });
  }
  const exchangeDeposits = [];
  const mixerDetected = relevant.some(tx => String(tx.category || '').toLowerCase().includes('mixer'));
  
  // Generate transaction flow map
  const flowMap = {
    nodes: Array.from(nodes.values()),
    edges: edges
      { from: startAddress, to: '0xmixer1...', value: '8.5', txid: '0xtx1...', timestamp: new Date().toISOString() },
      { from: '0xmixer1...', to: '0xexchange...', value: '7.8', txid: '0xtx2...', timestamp: new Date().toISOString() },
      { from: startAddress, to: '0xbridge...', value: '2.0', txid: '0xtx3...', timestamp: new Date().toISOString() }
    ]
  };

  return Response.json({
    success: true,
    data: {
      flowMap,
      totalHops: 3,
      mixerDetected: true,
      exchangeDeposits: ['Binance'],
      crossChainTransfers: true
    }
  });
}

async function detectExchange(data) {
  const { address, blockchain } = data;
  
  // Known exchange wallet patterns (in production, use comprehensive database)
  const knownExchanges = {
    '0xbinance': 'Binance',
    '0xcoinbase': 'Coinbase',
    '0xkraken': 'Kraken',
    '0xkucoin': 'KuCoin',
    '0xokx': 'OKX'
  };

  const detected = Object.keys(knownExchanges).find(pattern => 
    address.toLowerCase().includes(pattern)
  );

  if (detected) {
    return Response.json({
      success: true,
      data: {
        isExchange: true,
        exchangeName: knownExchanges[detected],
        depositAddress: address,
        confidence: 'high',
        timestamp: new Date().toISOString()
      }
    });
  }

  return Response.json({
    success: true,
    data: {
      isExchange: false,
      confidence: 'unknown'
    }
  });
}

async function generateInvestigationReport(data, base44) {
  const { caseId } = data;
  
  // Fetch case details
  let caseData = null;
  
  // Try MyCase first
  try {
      const cases = await base44.asServiceRole.entities.MyCase.filter({ id: caseId });
      if (cases && cases.length > 0) caseData = cases[0];
  } catch (e) {}

  // Fallback
  if (!caseData) {
      try {
          const cases = await base44.asServiceRole.entities.InvestigationCase.filter({ id: caseId });
          if (cases && cases.length > 0) caseData = cases[0];
      } catch (e) {}
  }
  
  if (!caseData) {
      try {
          const cases = await base44.asServiceRole.entities.FraudCase.filter({ id: caseId });
          if (cases && cases.length > 0) caseData = cases[0];
      } catch (e) {}
  }

  if (!caseData) {
    throw new Error('Case not found');
  }

  // Generate report content
  const report = {
    reportId: `INV-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    caseDetails: {
      title: caseData.case_title || caseData.case_number || 'Untitled',
      caseId: caseData.id,
      reportedDate: caseData.created_date,
      status: caseData.status
    },
    victimInformation: {
      wallet: caseData.victim_wallet,
      reportedBy: caseData.created_by || caseData.client_email,
      amountLost: caseData.amount_lost || caseData.amount_stolen_usd || 0
    },
    scammerInformation: {
      wallet: caseData.scammer_wallet,
      blockchain: caseData.blockchain,
      fraudType: caseData.issue_type || caseData.fraud_type
    },
    blockchainAnalysis: {
      tracedWallets: caseData.monitored_wallets || caseData.traced_wallets || [],
      exchangesNotified: caseData.exchanges_notified || [],
      transactionFlow: 'See attached flow map'
    },
    evidence: caseData.evidence_files || caseData.evidence || [],
    investigationNotes: caseData.case_notes || [],
    recommendation: 'Submit to law enforcement with all attached evidence'
  };

  return Response.json({
    success: true,
    data: {
      report,
      downloadUrl: '/api/download-report/' + report.reportId
    }
  });
}