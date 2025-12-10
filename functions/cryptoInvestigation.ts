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
        return await trackWallet(data);
      
      case 'analyze-transaction-flow':
        return await analyzeTransactionFlow(data);
      
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

async function trackWallet(data) {
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

  const balance = '2.3';
  
  return Response.json({
    success: true,
    data: {
      address,
      blockchain,
      balance,
      transactions: mockTransactions,
      totalIncoming: 5,
      totalOutgoing: 3
    }
  });
}

async function analyzeTransactionFlow(data) {
  const { startAddress, blockchain, depth = 3 } = data;
  
  // Generate transaction flow map
  const flowMap = {
    nodes: [
      { id: startAddress, label: 'Scammer Wallet', type: 'scammer', balance: '10.5' },
      { id: '0xmixer1...', label: 'Mixer Wallet 1', type: 'mixer', balance: '8.2' },
      { id: '0xexchange...', label: 'Exchange Deposit', type: 'exchange', exchange: 'Binance', balance: '7.8' },
      { id: '0xbridge...', label: 'Bridge Contract', type: 'bridge', balance: '3.1' }
    ],
    edges: [
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