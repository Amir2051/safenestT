import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// AES-256-GCM Encryption Utilities
async function encrypt(plaintext, key) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generate random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedBase64, key) {
  // Decode base64
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  
  // Extract IV and ciphertext
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// HMAC signature verification
async function verifyWebhookSignature(payload, signature, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const expectedSignature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const expectedHex = Array.from(new Uint8Array(expectedSignature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedHex === signature;
}

// FCRA Consent Text (v1.0)
const FCRA_CONSENT_TEXT = `
FCRA AUTHORIZATION FOR CONSUMER REPORT

By checking the box below, I authorize SafeNest to obtain my consumer credit report(s) from one or more consumer reporting agencies for the purpose of credit monitoring and account review. I understand that:

1. This is a "soft pull" inquiry that will NOT affect my credit score
2. My information will be encrypted using AES-256-GCM encryption
3. Reports are retained for 7 years as required by FCRA
4. I can revoke this consent at any time
5. I will receive notifications of significant score changes (20+ points)
6. Credit reports can be requested once every 30 days
7. This authorization expires in 1 year unless renewed

PERMISSIBLE PURPOSE: Credit monitoring and account review under FCRA Section 604(a)(3)(A).

PRIVACY: All personally identifiable information (PII) is encrypted before storage. Encryption keys are never stored with the data.

DISPUTE RIGHTS: If you believe information in your credit report is inaccurate, you have the right to dispute it with the credit bureau.

For questions, contact: compliance@safenest.app
`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse request
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { endpoint, ...params } = body;
    
    if (!endpoint) {
      return Response.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }
    
    console.log('Credit service request:', { endpoint, user: params.user_email });
    
    // Get encryption key
    const encryptionKeyBase64 = Deno.env.get('CREDIT_ENCRYPTION_KEY');
    if (!encryptionKeyBase64) {
      return Response.json({ error: 'CREDIT_ENCRYPTION_KEY not configured' }, { status: 500 });
    }
    const encryptionKey = Uint8Array.from(atob(encryptionKeyBase64), c => c.charCodeAt(0));
    
    // POST /credit/consent - Get or create consent
    if (endpoint === 'consent') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Check existing consent
        const existingConsents = await base44.entities.CreditConsent.filter({
          user_email: user.email,
          revoked: false
        });
        
        // Check if valid consent exists
        const validConsent = existingConsents.find(c => 
          new Date(c.expires_at) > new Date()
        );
        
        if (validConsent) {
          return Response.json({
            has_consent: true,
            consent_id: validConsent.consent_id,
            expires_at: validConsent.expires_at,
            consent_text: FCRA_CONSENT_TEXT
          });
        }
        
        return Response.json({
          has_consent: false,
          consent_text: FCRA_CONSENT_TEXT
        });
      } catch (error) {
        console.error('Consent check error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // POST /credit/give-consent - User gives consent
    if (endpoint === 'give-consent') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { explicit_consent, disclosure_acknowledged } = params;
        
        if (!explicit_consent || !disclosure_acknowledged) {
          return Response.json({ 
            error: 'Consent and disclosure acknowledgment required' 
          }, { status: 400 });
        }
        
        const consentId = `CONSENT_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year
        
        const consent = await base44.entities.CreditConsent.create({
          consent_id: consentId,
          user_email: user.email,
          consent_date: new Date().toISOString(),
          consent_text: FCRA_CONSENT_TEXT,
          consent_version: 'v1.0',
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
          permissible_purpose: 'credit_monitoring',
          explicit_consent_given: true,
          disclosure_acknowledged: true,
          expires_at: expiresAt.toISOString()
        });
        
        // Audit log
        await base44.entities.CreditAuditLog.create({
          audit_id: `AUDIT_${Date.now()}`,
          user_email: user.email,
          actor_email: user.email,
          action: 'consent_given',
          timestamp: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
          consent_id: consentId,
          fcra_compliance: {
            permissible_purpose: 'credit_monitoring',
            consent_verified: true,
            retention_period: '7 years'
          }
        });
        
        return Response.json({
          success: true,
          consent_id: consentId,
          expires_at: expiresAt.toISOString()
        });
      } catch (error) {
        console.error('Give consent error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // POST /credit/request-report - Request credit report
    if (endpoint === 'request-report') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { ssn, first_name, last_name, dob, address, city, state, zip, consent_id } = params;
        
        // Validate consent
        if (!consent_id) {
          return Response.json({ error: 'Consent required' }, { status: 400 });
        }
        
        const consents = await base44.entities.CreditConsent.filter({
          consent_id,
          user_email: user.email,
          revoked: false
        });
        
        if (consents.length === 0) {
          return Response.json({ error: 'Invalid or revoked consent' }, { status: 403 });
        }
        
        const consent = consents[0];
        if (new Date(consent.expires_at) < new Date()) {
          return Response.json({ error: 'Consent expired' }, { status: 403 });
        }
        
        // Rate limiting: 1 report per 30 days
        const recentReports = await base44.entities.CreditReport.filter({
          user_email: user.email,
          status: 'completed'
        }, '-completed_date', 1);
        
        if (recentReports.length > 0) {
          const lastReport = recentReports[0];
          const daysSince = (Date.now() - new Date(lastReport.completed_date)) / (1000 * 60 * 60 * 24);
          
          if (daysSince < 30) {
            const nextAllowed = new Date(lastReport.completed_date);
            nextAllowed.setDate(nextAllowed.getDate() + 30);
            
            return Response.json({
              error: 'Rate limit exceeded. You can request 1 report every 30 days.',
              next_allowed: nextAllowed.toISOString(),
              days_remaining: Math.ceil(30 - daysSince)
            }, { status: 429 });
          }
        }
        
        // Encrypt PII
        const encrypted_ssn = await encrypt(ssn, encryptionKey);
        const encrypted_first_name = await encrypt(first_name, encryptionKey);
        const encrypted_last_name = await encrypt(last_name, encryptionKey);
        const encrypted_dob = await encrypt(dob, encryptionKey);
        const encrypted_address = await encrypt(address, encryptionKey);
        const encrypted_city = await encrypt(city, encryptionKey);
        const encrypted_state = await encrypt(state, encryptionKey);
        const encrypted_zip = await encrypt(zip, encryptionKey);
        
        const reportId = `REPORT_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90); // 90 days per FCRA
        
        const nextAllowedDate = new Date();
        nextAllowedDate.setDate(nextAllowedDate.getDate() + 30);
        
        // Create report record
        const report = await base44.entities.CreditReport.create({
          report_id: reportId,
          user_email: user.email,
          request_date: new Date().toISOString(),
          status: 'pending',
          encrypted_ssn,
          encrypted_first_name,
          encrypted_last_name,
          encrypted_dob,
          encrypted_address,
          encrypted_city,
          encrypted_state,
          encrypted_zip,
          permissible_purpose: 'credit_monitoring',
          consent_id,
          expires_at: expiresAt.toISOString(),
          next_allowed_date: nextAllowedDate.toISOString()
        });
        
        // Audit log
        await base44.entities.CreditAuditLog.create({
          audit_id: `AUDIT_${Date.now()}`,
          user_email: user.email,
          actor_email: user.email,
          action: 'report_requested',
          timestamp: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
          report_id: reportId,
          consent_id,
          fcra_compliance: {
            permissible_purpose: 'credit_monitoring',
            consent_verified: true,
            retention_period: '7 years'
          }
        });
        
        // Call iSoftpull API
        const apiKey = Deno.env.get('ISOFTPULL_API_KEY');
        if (!apiKey) {
          await base44.entities.CreditReport.update(report.id, {
            status: 'failed'
          });
          return Response.json({ error: 'ISOFTPULL_API_KEY not configured' }, { status: 500 });
        }
        
        try {
          const isoftpullResponse = await fetch('https://api.isoftpull.com/v1/reports', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ssn,
              first_name,
              last_name,
              dob,
              address: {
                street: address,
                city,
                state,
                zip
              },
              report_type: 'soft_pull',
              bureau: 'equifax',
              callback_url: `${req.headers.get('origin') || 'https://app.base44.com'}/api/credit/webhook`,
              reference_id: reportId
            })
          });
          
          if (!isoftpullResponse.ok) {
            const errorText = await isoftpullResponse.text();
            console.error('iSoftpull API error:', errorText);
            
            await base44.entities.CreditReport.update(report.id, {
              status: 'failed'
            });
            
            return Response.json({ 
              error: 'Credit report request failed. Please verify your information.' 
            }, { status: 500 });
          }
          
          const isoftpullData = await isoftpullResponse.json();
          
          await base44.entities.CreditReport.update(report.id, {
            status: 'processing'
          });
          
          return Response.json({
            success: true,
            report_id: reportId,
            status: 'processing',
            message: 'Credit report requested. You will be notified when ready (typically 1-3 minutes).'
          });
        } catch (apiError) {
          console.error('iSoftpull API call failed:', apiError);
          
          await base44.entities.CreditReport.update(report.id, {
            status: 'failed'
          });
          
          return Response.json({ 
            error: 'Failed to connect to credit bureau. Please try again later.' 
          }, { status: 500 });
        }
      } catch (error) {
        console.error('Request report error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // POST /credit/webhook - iSoftpull callback
    if (endpoint === 'webhook') {
      try {
        const webhookSecret = Deno.env.get('ISOFTPULL_WEBHOOK_SECRET');
        if (!webhookSecret) {
          return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }
        
        // Verify signature
        const signature = req.headers.get('x-isoftpull-signature');
        if (!signature) {
          console.error('Missing webhook signature');
          return Response.json({ error: 'Missing signature' }, { status: 401 });
        }
        
        const payload = JSON.stringify(params);
        const isValid = await verifyWebhookSignature(payload, signature, webhookSecret);
        
        if (!isValid) {
          console.error('Invalid webhook signature');
          return Response.json({ error: 'Invalid signature' }, { status: 401 });
        }
        
        const { reference_id, status, credit_score, report_data } = params;
        
        if (!reference_id) {
          return Response.json({ error: 'Missing reference_id' }, { status: 400 });
        }
        
        // Find report
        const reports = await base44.asServiceRole.entities.CreditReport.filter({
          report_id: reference_id
        });
        
        if (reports.length === 0) {
          return Response.json({ error: 'Report not found' }, { status: 404 });
        }
        
        const report = reports[0];
        
        // Get previous score for comparison
        const previousReports = await base44.asServiceRole.entities.CreditReport.filter({
          user_email: report.user_email,
          status: 'completed'
        }, '-completed_date', 1);
        
        const previousScore = previousReports.length > 0 ? previousReports[0].credit_score : null;
        const scoreChange = previousScore ? credit_score - previousScore : 0;
        const significantChange = Math.abs(scoreChange) >= 20;
        
        // Update report
        await base44.asServiceRole.entities.CreditReport.update(report.id, {
          status: status === 'completed' ? 'completed' : 'failed',
          completed_date: new Date().toISOString(),
          credit_score,
          previous_score: previousScore,
          score_change: scoreChange,
          significant_change: significantChange,
          report_data: report_data || {}
        });
        
        // Send notification if significant change
        if (significantChange && status === 'completed') {
          const direction = scoreChange > 0 ? 'increased' : 'decreased';
          const emoji = scoreChange > 0 ? '📈' : '📉';
          
          await base44.integrations.Core.SendEmail({
            to: report.user_email,
            subject: `${emoji} Credit Score Alert: ${Math.abs(scoreChange)} Point Change`,
            body: `
              <h2>Credit Score Update</h2>
              <p>Your credit score has ${direction} by <strong>${Math.abs(scoreChange)} points</strong>.</p>
              <ul>
                <li>Previous Score: ${previousScore}</li>
                <li>New Score: ${credit_score}</li>
                <li>Change: ${scoreChange > 0 ? '+' : ''}${scoreChange}</li>
              </ul>
              <p>Log in to SafeNest to view your full credit report and recommendations.</p>
            `
          });
          
          await base44.asServiceRole.entities.CreditReport.update(report.id, {
            notification_sent: true
          });
        }
        
        // Audit log
        await base44.asServiceRole.entities.CreditAuditLog.create({
          audit_id: `AUDIT_${Date.now()}`,
          user_email: report.user_email,
          actor_email: 'system@safenest.app',
          action: 'report_viewed',
          timestamp: new Date().toISOString(),
          report_id: reference_id,
          metadata: {
            score_before: previousScore,
            score_after: credit_score
          }
        });
        
        return Response.json({ success: true });
      } catch (error) {
        console.error('Webhook error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // GET /credit/reports - List user's reports
    if (endpoint === 'reports') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const reports = await base44.entities.CreditReport.filter({
          user_email: user.email
        }, '-completed_date', 10);
        
        // Return reports without encrypted PII
        const sanitizedReports = reports.map(r => ({
          id: r.id,
          report_id: r.report_id,
          request_date: r.request_date,
          completed_date: r.completed_date,
          status: r.status,
          credit_score: r.credit_score,
          score_change: r.score_change,
          previous_score: r.previous_score,
          significant_change: r.significant_change,
          bureau: r.bureau,
          expires_at: r.expires_at,
          next_allowed_date: r.next_allowed_date
        }));
        
        return Response.json({ reports: sanitizedReports });
      } catch (error) {
        console.error('List reports error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // POST /credit/revoke-consent - Revoke consent
    if (endpoint === 'revoke-consent') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { consent_id } = params;
        
        const consents = await base44.entities.CreditConsent.filter({
          consent_id,
          user_email: user.email
        });
        
        if (consents.length === 0) {
          return Response.json({ error: 'Consent not found' }, { status: 404 });
        }
        
        await base44.entities.CreditConsent.update(consents[0].id, {
          revoked: true,
          revoked_date: new Date().toISOString()
        });
        
        // Audit log
        await base44.entities.CreditAuditLog.create({
          audit_id: `AUDIT_${Date.now()}`,
          user_email: user.email,
          actor_email: user.email,
          action: 'consent_revoked',
          timestamp: new Date().toISOString(),
          consent_id
        });
        
        return Response.json({ success: true });
      } catch (error) {
        console.error('Revoke consent error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    return Response.json({ error: 'Unknown endpoint: ' + endpoint }, { status: 404 });
    
  } catch (error) {
    console.error('Credit service error:', error);
    return Response.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
});