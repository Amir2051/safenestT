import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, ...params } = await req.json();

    // Check wallet risk
    if (endpoint === 'check-wallet') {
      const { address, blockchain } = params;
      
      // Check against scam database
      const scams = await base44.entities.ScamDatabase.filter({
        identifier: address,
        scam_type: 'wallet',
        status: 'active'
      });
      
      if (scams.length > 0) {
        const scam = scams[0];
        return Response.json({
          is_scam: true,
          risk_level: scam.risk_level,
          reason: scam.scam_description,
          victim_count: scam.victim_count,
          total_stolen_usd: scam.total_stolen_usd,
          recommendation: 'DO NOT SEND FUNDS - Known scam wallet'
        });
      }
      
      // AI-based risk analysis (simplified)
      let riskScore = 0;
      const riskFactors = [];
      
      // Check transaction patterns (mock logic)
      if (address.startsWith('0x000') || address.startsWith('1111')) {
        riskScore += 30;
        riskFactors.push('Suspicious address pattern');
      }
      
      // Check for recent reports
      const recentScams = await base44.entities.ScamDatabase.filter({
        blockchain: blockchain,
        status: 'active'
      });
      
      if (recentScams.length > 10) {
        riskScore += 20;
        riskFactors.push('High scam activity on this blockchain');
      }
      
      return Response.json({
        is_scam: false,
        risk_score: riskScore,
        risk_factors: riskFactors,
        recommendation: riskScore > 50 
          ? 'CAUTION - High risk detected' 
          : riskScore > 30 
          ? 'MODERATE - Proceed with caution'
          : 'LOW RISK - Appears safe'
      });
    }

    // Check website
    if (endpoint === 'check-website') {
      const { url } = params;
      
      const scams = await base44.entities.ScamDatabase.filter({
        identifier: url,
        scam_type: 'website',
        status: 'active'
      });
      
      if (scams.length > 0) {
        return Response.json({
          is_scam: true,
          risk_level: scams[0].risk_level,
          details: scams[0].scam_description
        });
      }
      
      // AI phishing detection (simplified)
      const suspiciousPatterns = [
        'free-crypto', 'double-your', 'elon-musk', 'airdrop-claim',
        'verify-wallet', 'connect-immediately'
      ];
      
      const urlLower = url.toLowerCase();
      const matches = suspiciousPatterns.filter(p => urlLower.includes(p));
      
      return Response.json({
        is_scam: matches.length > 2,
        risk_score: matches.length * 25,
        suspicious_patterns: matches,
        recommendation: matches.length > 2 
          ? 'DANGER - Likely phishing site'
          : 'SAFE - No obvious threats detected'
      });
    }

    // Validate transaction before sending
    if (endpoint === 'validate-transaction') {
      const { from_address, to_address, amount, blockchain } = params;
      
      // Check recipient against scam database
      const recipientCheck = await base44.functions.invoke('cryptoScamDetection', {
        endpoint: 'check-wallet',
        address: to_address,
        blockchain: blockchain
      });
      
      const scamCheck = recipientCheck.data;
      
      // Create transaction record
      const transaction = await base44.entities.CryptoTransaction.create({
        from_address,
        to_address,
        amount,
        blockchain,
        transaction_type: 'send',
        risk_score: scamCheck.risk_score || 0,
        risk_factors: scamCheck.risk_factors || [],
        scam_detected: scamCheck.is_scam || false,
        status: scamCheck.is_scam ? 'blocked' : 'pending',
        blocked_reason: scamCheck.is_scam ? scamCheck.reason : null,
        timestamp: new Date().toISOString()
      });
      
      // Create alert if high risk
      if (scamCheck.risk_score > 70 || scamCheck.is_scam) {
        await base44.entities.Alert.create({
          alert_type: 'dark_web',
          severity: scamCheck.is_scam ? 'critical' : 'high',
          title: '⚠️ Crypto Scam Alert',
          message: `Attempted transaction to ${scamCheck.is_scam ? 'KNOWN SCAM' : 'HIGH RISK'} wallet blocked`,
          status: 'active',
          affected_item: to_address,
          recommendation: scamCheck.recommendation
        });
      }
      
      return Response.json({
        transaction_id: transaction.id,
        allowed: !scamCheck.is_scam,
        scam_check: scamCheck,
        action_required: scamCheck.is_scam ? 'Transaction blocked' : scamCheck.risk_score > 50 ? 'User approval needed' : 'Proceed'
      });
    }

    // Report new scam
    if (endpoint === 'report-scam') {
      const { scam_type, identifier, blockchain, description, amount_stolen } = params;
      
      const scam = await base44.entities.ScamDatabase.create({
        scam_type,
        identifier,
        blockchain: blockchain || 'n/a',
        risk_level: 'high',
        scam_description: description,
        reported_by: 'user',
        verified: false,
        victim_count: 1,
        total_stolen_usd: amount_stolen || 0,
        first_reported: new Date().toISOString(),
        status: 'active'
      });
      
      return Response.json({
        success: true,
        scam_id: scam.id,
        message: 'Scam reported successfully. Our team will review and verify.'
      });
    }

    return Response.json({ error: 'Unknown endpoint' }, { status: 400 });

  } catch (error) {
    console.error('Crypto scam detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});