import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await req.json();

    switch (action) {
      case 'analyze_case':
        return await analyzeCase(base44, data);
      case 'score_priority':
        return await scorePriority(base44, data);
      case 'check_wallet':
        return await checkWallet(base44, data);
      case 'analyze_evidence':
        return await analyzeEvidence(base44, data);
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Fraud Detection AI Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function analyzeCase(base44, { caseId, caseData }) {
  try {
    // Build comprehensive analysis prompt
    const prompt = `You are an expert fraud investigator analyzing a cybercrime case. Analyze the following case and provide detailed insights:

CASE DETAILS:
- Type: ${caseData.issue_type || caseData.fraud_type}
- Description: ${caseData.description}
- Amount Lost: $${caseData.amount_lost || caseData.amount_stolen_usd || 0}
- Blockchain: ${caseData.blockchain || 'N/A'}
- Scammer Wallet: ${caseData.scammer_wallet || 'N/A'}
- Victim Wallet: ${caseData.victim_wallet || 'N/A'}
- Transaction Hash: ${caseData.transaction_hash || 'N/A'}

Provide a JSON analysis with:
1. fraud_indicators: Array of specific red flags detected
2. pattern_match: Type of scam pattern this matches (e.g., "pig_butchering", "rug_pull", "romance_scam")
3. confidence_score: 0-100 on how certain this is fraud
4. risk_level: "low", "medium", "high", or "critical"
5. recommended_actions: Array of next steps for investigators
6. similar_patterns: Brief description of similar cases
7. recovery_likelihood: "low", "medium", or "high"
8. timeline_estimate: Estimated investigation time in days
9. red_flags: Specific suspicious elements
10. investigation_tips: Array of investigation strategies`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          fraud_indicators: { type: 'array', items: { type: 'string' } },
          pattern_match: { type: 'string' },
          confidence_score: { type: 'number' },
          risk_level: { type: 'string' },
          recommended_actions: { type: 'array', items: { type: 'string' } },
          similar_patterns: { type: 'string' },
          recovery_likelihood: { type: 'string' },
          timeline_estimate: { type: 'number' },
          red_flags: { type: 'array', items: { type: 'string' } },
          investigation_tips: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Check wallet against known scam database
    let walletFlags = [];
    if (caseData.scammer_wallet) {
      const scamCheck = await base44.entities.ScamDatabase.filter({
        identifier: caseData.scammer_wallet
      });
      if (scamCheck.length > 0) {
        walletFlags.push(`Wallet found in scam database: ${scamCheck[0].scam_description}`);
      }
    }

    // Update case with AI analysis
    if (caseId) {
      await base44.asServiceRole.entities.MyCase.update(caseId, {
        ai_analysis: JSON.stringify(analysis),
        priority_score: analysis.confidence_score,
        urgency: analysis.risk_level
      });

      // Log timeline event
      await base44.entities.CaseTimelineEvent.create({
        case_id: caseId,
        event_type: 'system_action',
        event_title: 'AI Analysis Completed',
        event_description: `AI detected ${analysis.pattern_match} pattern with ${analysis.confidence_score}% confidence`,
        severity: analysis.risk_level === 'critical' ? 'critical' : 'info',
        automated: true,
        visible_to_client: false
      });
    }

    return Response.json({
      success: true,
      analysis: {
        ...analysis,
        wallet_flags: walletFlags
      }
    });
  } catch (error) {
    console.error('Case analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function scorePriority(base44, { caseData }) {
  try {
    let score = 50; // Base score

    // Amount-based scoring
    const amount = caseData.amount_lost || caseData.amount_stolen_usd || 0;
    if (amount > 100000) score += 30;
    else if (amount > 50000) score += 20;
    else if (amount > 10000) score += 10;
    else if (amount > 1000) score += 5;

    // Urgency-based scoring
    if (caseData.urgency === 'Critical' || caseData.urgency === 'critical') score += 20;
    else if (caseData.urgency === 'High' || caseData.urgency === 'high') score += 10;

    // Type-based scoring (higher risk types)
    const highRiskTypes = ['crypto_theft', 'ransomware', 'rug_pull'];
    if (highRiskTypes.includes(caseData.issue_type || caseData.fraud_type)) {
      score += 15;
    }

    // Time-sensitive (recent cases get priority)
    const hoursSinceCreation = (Date.now() - new Date(caseData.created_date).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation < 24) score += 10;
    else if (hoursSinceCreation < 72) score += 5;

    // Evidence quality
    const evidenceCount = (caseData.evidence_files || []).length;
    if (evidenceCount > 5) score += 10;
    else if (evidenceCount > 0) score += 5;

    // Transaction data available
    if (caseData.transaction_hash) score += 5;
    if (caseData.scammer_wallet) score += 5;

    score = Math.min(100, Math.max(0, score));

    return Response.json({
      success: true,
      priority_score: score,
      priority_level: score >= 80 ? 'critical' : score >= 60 ? 'high' : score >= 40 ? 'medium' : 'low'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function checkWallet(base44, { wallet, blockchain }) {
  try {
    // Check scam database
    const scamRecords = await base44.entities.ScamDatabase.filter({
      identifier: wallet
    });

    // Check against other cases
    const relatedCases = await base44.asServiceRole.entities.MyCase.filter({
      scammer_wallet: wallet
    }, '-created_date', 10);

    // Use AI to analyze wallet risk
    const prompt = `Analyze this cryptocurrency wallet for fraud indicators:
Wallet: ${wallet}
Blockchain: ${blockchain}
Found in ${scamRecords.length} scam reports
Linked to ${relatedCases.length} other cases

Provide risk assessment:`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          risk_score: { type: 'number' },
          risk_level: { type: 'string' },
          flags: { type: 'array', items: { type: 'string' } },
          is_suspicious: { type: 'boolean' },
          recommendation: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      wallet,
      scam_reports: scamRecords.length,
      related_cases: relatedCases.length,
      analysis
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function analyzeEvidence(base44, { fileUrl, fileName, caseId }) {
  try {
    const prompt = `Analyze this evidence file for a fraud investigation:
Filename: ${fileName}
File URL: ${fileUrl}

Extract and identify:
1. Transaction hashes or wallet addresses
2. Email addresses or contact information
3. Dates and timestamps
4. Monetary amounts
5. Suspicious patterns or red flags
6. Any cryptocurrency or blockchain data
7. Communication patterns indicating fraud

Provide detailed findings:`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          extracted_wallets: { type: 'array', items: { type: 'string' } },
          extracted_emails: { type: 'array', items: { type: 'string' } },
          extracted_amounts: { type: 'array', items: { type: 'number' } },
          transaction_hashes: { type: 'array', items: { type: 'string' } },
          key_dates: { type: 'array', items: { type: 'string' } },
          red_flags: { type: 'array', items: { type: 'string' } },
          summary: { type: 'string' },
          evidence_quality: { type: 'string' }
        }
      }
    });

    // Auto-create evidence items from extracted data
    if (caseId) {
      for (const wallet of analysis.extracted_wallets || []) {
        await base44.entities.CaseEvidenceItem.create({
          case_id: caseId,
          category: 'wallet_address',
          data: { wallet_address: wallet, role: 'detected' },
          source: 'extracted',
          analyst_note: `Auto-extracted from ${fileName}`
        });
      }

      for (const hash of analysis.transaction_hashes || []) {
        await base44.entities.CaseEvidenceItem.create({
          case_id: caseId,
          category: 'blockchain_transaction',
          data: { transaction_hash: hash },
          source: 'extracted',
          analyst_note: `Auto-extracted from ${fileName}`
        });
      }
    }

    return Response.json({
      success: true,
      analysis
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}