import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user || (user.role !== 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }
        
        const { action, user_data, user_id } = await req.json();
        
        if (action === 'analyze_user') {
            console.log('🤖 AI USER VERIFICATION STARTED:', user_data.email);
            
            // Fetch user's submitted cases if any
            let userCases = [];
            try {
                userCases = await base44.asServiceRole.entities.MyCase.filter({
                    created_by: user_data.email
                });
            } catch (e) {
                console.log('No cases found for user');
            }
            
            // Fetch user's activity logs
            let auditLogs = [];
            try {
                auditLogs = await base44.asServiceRole.entities.AuditLog.filter({
                    created_by: user_data.email
                }, '-created_date', 10);
            } catch (e) {
                console.log('No audit logs found');
            }
            
            // Build comprehensive profile for AI analysis
            const userProfile = {
                email: user_data.email,
                full_name: user_data.full_name,
                registration_date: user_data.created_date,
                account_status: user_data.account_status,
                phone_number: user_data.phone_number,
                employee_id: user_data.employee_id,
                job_title: user_data.job_title,
                
                // Activity metrics
                total_cases_submitted: userCases.length,
                case_details: userCases.map(c => ({
                    issue_type: c.issue_type,
                    amount_lost: c.amount_lost,
                    status: c.status,
                    created_date: c.created_date,
                    has_evidence: (c.evidence_files?.length || 0) > 0,
                    has_wallet: !!c.scammer_wallet
                })),
                recent_activity_count: auditLogs.length,
                
                // Registration metadata
                days_since_registration: Math.floor(
                    (new Date() - new Date(user_data.created_date)) / (1000 * 60 * 60 * 24)
                ),
                has_referral_code: !!user_data.referral_code,
                referral_code: user_data.referral_code
            };
            
            console.log('📊 User profile compiled:', {
                email: userProfile.email,
                cases: userProfile.total_cases_submitted,
                days_registered: userProfile.days_since_registration
            });
            
            // AI Analysis using InvokeLLM
            const aiAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `You are an expert user verification AI assistant for SafeNestt, a fraud protection platform.

Analyze the following user profile and provide a comprehensive risk assessment:

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

ANALYSIS REQUIREMENTS:

1. RISK SCORE (0-100):
   - 0-30: High Risk (likely spam, fraud, or malicious)
   - 31-60: Medium Risk (suspicious patterns, needs review)
   - 61-85: Low Risk (appears legitimate, minor concerns)
   - 86-100: Very Low Risk (clearly legitimate user)

2. VERIFICATION CHECKS AUTO-FILL:
   Determine if these checks should be automatically passed (true/false):
   - email_valid: Valid email domain (not disposable, temporary, or suspicious)
   - no_spam_indicators: No spam patterns in name, email, or behavior
   - legitimate_request: User appears to be genuine (real person, valid use case)
   - reviewed_profile: Profile is complete enough for automatic approval

3. RED FLAGS:
   Identify any concerning patterns:
   - Disposable/temporary email domains (mailinator, guerrillamail, temp-mail, etc.)
   - Generic/fake-looking names ("Test User", "Asdf Asdf", random characters)
   - Suspicious activity patterns (multiple rapid submissions, no engagement)
   - Email/name mismatches
   - Known spam indicators
   - Registered but no activity in suspicious timeframe
   - Multiple cases with minimal information

4. GREEN FLAGS:
   Identify positive indicators:
   - Professional email domain (company, university, legitimate provider)
   - Complete profile information
   - Legitimate cases submitted with evidence
   - Consistent activity patterns
   - Proper case documentation
   - Reasonable time since registration

5. RECOMMENDATION:
   - APPROVE: User should be approved immediately
   - REVIEW: User needs manual admin review
   - REJECT: User should be rejected (clear fraud/spam)
   - PENDING: Insufficient data, wait for more activity

6. SUMMARY:
   Provide a 2-3 sentence explanation of your assessment for the admin.

Return ONLY valid JSON with this exact structure:
{
  "risk_score": <number 0-100>,
  "risk_level": "high" | "medium" | "low" | "very_low",
  "auto_checks": {
    "email_valid": <boolean>,
    "no_spam_indicators": <boolean>,
    "legitimate_request": <boolean>,
    "reviewed_profile": <boolean>
  },
  "red_flags": [<array of string concerns>],
  "green_flags": [<array of string positives>],
  "recommendation": "APPROVE" | "REVIEW" | "REJECT" | "PENDING",
  "confidence": <number 0-100>,
  "summary": "<brief explanation for admin>",
  "suggested_action": "<specific next step for admin>"
}`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        risk_score: { type: "number" },
                        risk_level: { type: "string" },
                        auto_checks: {
                            type: "object",
                            properties: {
                                email_valid: { type: "boolean" },
                                no_spam_indicators: { type: "boolean" },
                                legitimate_request: { type: "boolean" },
                                reviewed_profile: { type: "boolean" }
                            }
                        },
                        red_flags: {
                            type: "array",
                            items: { type: "string" }
                        },
                        green_flags: {
                            type: "array",
                            items: { type: "string" }
                        },
                        recommendation: { type: "string" },
                        confidence: { type: "number" },
                        summary: { type: "string" },
                        suggested_action: { type: "string" }
                    }
                }
            });
            
            console.log('✅ AI Analysis Complete:', {
                risk_score: aiAnalysis.risk_score,
                recommendation: aiAnalysis.recommendation,
                red_flags_count: aiAnalysis.red_flags.length,
                green_flags_count: aiAnalysis.green_flags.length
            });
            
            // Store analysis in user record for future reference
            try {
                await base44.asServiceRole.entities.User.update(user_id, {
                    ai_verification_score: aiAnalysis.risk_score,
                    ai_verification_data: JSON.stringify({
                        ...aiAnalysis,
                        analyzed_at: new Date().toISOString(),
                        analyzed_by: user.email
                    })
                });
                
                // Log the AI analysis
                await base44.asServiceRole.entities.AuditLog.create({
                    action_type: 'settings_updated',
                    action_category: 'security',
                    description: `AI verification analysis completed for ${user_data.email}. Risk Score: ${aiAnalysis.risk_score}/100, Recommendation: ${aiAnalysis.recommendation}`,
                    severity: aiAnalysis.risk_score < 40 ? 'critical' : aiAnalysis.risk_score < 70 ? 'medium' : 'low',
                    metadata: {
                        user_email: user_data.email,
                        user_id: user_id,
                        ai_analysis: aiAnalysis
                    },
                    created_by: user.email
                });
            } catch (e) {
                console.error('Failed to store AI analysis:', e);
            }
            
            return Response.json({
                success: true,
                analysis: aiAnalysis,
                user_profile: userProfile
            });
        }
        
        if (action === 'batch_analyze') {
            const { user_list } = await req.json();
            
            if (!user_list || !Array.isArray(user_list)) {
                return Response.json({ error: 'user_list array required' }, { status: 400 });
            }
            
            console.log(`🤖 BATCH AI ANALYSIS: ${user_list.length} users`);
            
            const results = [];
            
            for (const userData of user_list) {
                try {
                    // Quick analysis for batch mode (simplified)
                    const quickAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
                        prompt: `Quick user verification check for: ${userData.email}, Name: ${userData.full_name || 'Not provided'}

Registration: ${userData.created_date}
Status: ${userData.account_status}

Provide risk score (0-100) and recommendation (APPROVE/REVIEW/REJECT). Be concise.`,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                risk_score: { type: "number" },
                                recommendation: { type: "string" },
                                summary: { type: "string" }
                            }
                        }
                    });
                    
                    results.push({
                        user_id: userData.id,
                        email: userData.email,
                        ...quickAnalysis
                    });
                } catch (e) {
                    console.error(`Failed to analyze ${userData.email}:`, e);
                    results.push({
                        user_id: userData.id,
                        email: userData.email,
                        error: e.message
                    });
                }
            }
            
            return Response.json({
                success: true,
                results: results,
                analyzed_count: results.filter(r => !r.error).length
            });
        }
        
        return Response.json({ error: 'Invalid action' }, { status: 400 });
        
    } catch (error) {
        console.error('❌ USER VERIFICATION AI ERROR:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});