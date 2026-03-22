import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, ...params } = await req.json();

    // Trace blockchain transactions
    if (endpoint === 'trace-stolen-funds') {
      const { case_id, scammer_wallet, blockchain, max_depth = 5 } = params;
      
      // Get fraud case
      const fraudCase = await base44.asServiceRole.entities.FraudCase.filter({ id: case_id });
      if (fraudCase.length === 0) {
        return Response.json({ error: 'Case not found' }, { status: 404 });
      }
      
      const traces = [];
      const walletsToTrace = [{ address: scammer_wallet, depth: 0 }];
      const traced = new Set();
      
      // Simplified blockchain tracing (in production, use real blockchain APIs)
      while (walletsToTrace.length > 0 && traces.length < 50) {
        const current = walletsToTrace.shift();
        if (traced.has(current.address) || current.depth > max_depth) continue;
        
        traced.add(current.address);
        
        // Mock: Generate some downstream wallets
        const mockTransactions = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < mockTransactions; i++) {
          const nextWallet = `0x${Math.random().toString(16).slice(2, 42)}`;
          const amount = Math.random() * 1000;
          
          // Check if wallet belongs to known exchange
          const exchangePatterns = {
            '0xbinance': 'Binance',
            '0xcoinbase': 'Coinbase',
            '0xkraken': 'Kraken',
            '0xhuobi': 'Huobi'
          };
          
          let exchangeName = null;
          let isExchange = false;
          
          for (const [pattern, name] of Object.entries(exchangePatterns)) {
            if (nextWallet.toLowerCase().includes(pattern)) {
              exchangeName = name;
              isExchange = true;
              break;
            }
          }
          
          // Create trace record
          const trace = await base44.asServiceRole.entities.BlockchainTrace.create({
            fraud_case_id: case_id,
            wallet_address: nextWallet,
            blockchain: blockchain,
            depth_level: current.depth + 1,
            transaction_hash: `0x${Math.random().toString(16).slice(2)}`,
            amount_received: amount,
            amount_remaining: amount * (Math.random() * 0.8 + 0.2),
            linked_to_exchange: isExchange,
            exchange_name: exchangeName,
            exchange_notified: false,
            trace_timestamp: new Date().toISOString(),
            status: 'active'
          });
          
          traces.push(trace);
          
          // Add to queue if not exchange and within depth limit
          if (!isExchange && current.depth < max_depth - 1) {
            walletsToTrace.push({ address: nextWallet, depth: current.depth + 1 });
          }
        }
      }
      
      // Update fraud case
      const tracedWallets = traces.map(t => t.wallet_address);
      await base44.asServiceRole.entities.FraudCase.update(case_id, {
        traced_wallets: tracedWallets,
        status: 'traced'
      });
      
      return Response.json({
        success: true,
        traces_found: traces.length,
        max_depth_reached: max_depth,
        exchanges_found: traces.filter(t => t.linked_to_exchange).length,
        traces: traces
      });
    }

    // Notify exchanges about fraud
    if (endpoint === 'notify-exchanges') {
      const { case_id } = params;
      
      // Get case and traces
      const fraudCase = await base44.asServiceRole.entities.FraudCase.filter({ id: case_id });
      if (fraudCase.length === 0) {
        return Response.json({ error: 'Case not found' }, { status: 404 });
      }
      
      const traces = await base44.asServiceRole.entities.BlockchainTrace.filter({
        fraud_case_id: case_id,
        linked_to_exchange: true,
        exchange_notified: false
      });
      
      const notifications = [];
      
      for (const trace of traces) {
        // Mock: Send notification to exchange
        // In production, use actual exchange APIs or KYC compliance endpoints
        
        const notification = {
          exchange: trace.exchange_name,
          wallet: trace.wallet_address,
          amount: trace.amount_remaining,
          fraud_case: case_id,
          report_url: `https://safenestt.com/fraud-reports/${case_id}`
        };
        
        notifications.push(notification);
        
        // Update trace as notified
        await base44.asServiceRole.entities.BlockchainTrace.update(trace.id, {
          exchange_notified: true
        });
        
        // Mock: Wait 100ms between notifications
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Update fraud case
      await base44.asServiceRole.entities.FraudCase.update(case_id, {
        exchanges_notified: notifications.map(n => n.exchange),
        status: 'recovering'
      });
      
      return Response.json({
        success: true,
        notifications_sent: notifications.length,
        exchanges: notifications
      });
    }

    // Generate legal report
    if (endpoint === 'generate-legal-report') {
      const { case_id } = params;
      
      const fraudCase = await base44.asServiceRole.entities.FraudCase.filter({ id: case_id });
      if (fraudCase.length === 0) {
        return Response.json({ error: 'Case not found' }, { status: 404 });
      }
      
      const theCase = fraudCase[0];
      const traces = await base44.asServiceRole.entities.BlockchainTrace.filter({
        fraud_case_id: case_id
      });
      
      // Generate report content
      const report = {
        case_id: case_id,
        generated_date: new Date().toISOString(),
        victim_info: {
          wallet: theCase.victim_wallet,
          email: user.email
        },
        incident_details: {
          date: theCase.incident_date,
          fraud_type: theCase.fraud_type,
          amount_stolen: theCase.amount_stolen,
          amount_stolen_usd: theCase.amount_stolen_usd,
          blockchain: theCase.blockchain,
          description: theCase.description
        },
        scammer_info: {
          wallet: theCase.scammer_wallet,
          traced_wallets: traces.map(t => ({
            address: t.wallet_address,
            amount: t.amount_remaining,
            exchange: t.exchange_name,
            depth: t.depth_level
          }))
        },
        exchanges_involved: traces
          .filter(t => t.linked_to_exchange)
          .map(t => t.exchange_name),
        evidence: theCase.evidence || [],
        recommendations: [
          'File FBI IC3 complaint at https://ic3.gov',
          'Contact local law enforcement',
          'Notify all identified exchanges',
          'Monitor traced wallets for movement'
        ]
      };
      
      // In production, generate PDF and upload
      const reportUrl = `https://safenestt.com/reports/${case_id}.pdf`;
      
      await base44.asServiceRole.entities.FraudCase.update(case_id, {
        law_enforcement_report: reportUrl
      });
      
      return Response.json({
        success: true,
        report: report,
        download_url: reportUrl
      });
    }

    // Update recovery progress
    if (endpoint === 'update-recovery') {
      const { case_id, amount_recovered, status, notes } = params;
      
      const fraudCase = await base44.asServiceRole.entities.FraudCase.filter({ id: case_id });
      if (fraudCase.length === 0) {
        return Response.json({ error: 'Case not found' }, { status: 404 });
      }
      
      const theCase = fraudCase[0];
      const progress = (amount_recovered / theCase.amount_stolen_usd) * 100;
      
      // Add case note
      const existingNotes = theCase.case_notes || [];
      existingNotes.push({
        timestamp: new Date().toISOString(),
        note: notes,
        author: user.email
      });
      
      await base44.asServiceRole.entities.FraudCase.update(case_id, {
        recovery_progress: Math.min(100, progress),
        status: status || theCase.status,
        case_notes: existingNotes
      });
      
      return Response.json({
        success: true,
        recovery_progress: progress,
        message: 'Recovery progress updated'
      });
    }

    return Response.json({ error: 'Unknown endpoint' }, { status: 400 });

  } catch (error) {
    console.error('Fraud recovery error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});