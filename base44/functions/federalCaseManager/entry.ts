import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { endpoint, data } = await req.json();
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && !user.is_admin)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // --- Extract Case Details from File ---
    if (endpoint === 'extract-from-file') {
      const { file_url } = data;
      
      // We can't directly read the file content in the LLM integration easily if it's a PDF/Image without OCR.
      // However, the prompt implies we can. We'll use the 'add_context_from_internet' or assume the file_url is accessible.
      // For this implementation, we'll ask the LLM to "simulate" extraction or use the file_url if supported.
      // The Base44 `InvokeLLM` supports `file_urls`.
      
      const prompt = `
        Analyze the document at the provided URL. It is likely an IC3 complaint, FBI report, or victim email.
        Extract the following case details into a JSON object:
        - case_title (generate a descriptive title)
        - victim_name
        - victim_email
        - victim_phone
        - amount_stolen_usd (number)
        - fraud_type (classify as: crypto_theft, phishing, romance_scam, investment_scam, other)
        - incident_date (YYYY-MM-DD)
        - description (summary of what happened)
        - victim_wallet (string)
        - scammer_wallet (string)
        - scammer_info (object with name, email, phone, wallet_addresses array)
        - ic3_complaint_number (if present)
        
        If a field is missing, return null or empty string.
      `;

      const extraction = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            case_title: { type: "string" },
            victim_name: { type: "string" },
            victim_email: { type: "string" },
            victim_phone: { type: "string" },
            amount_stolen_usd: { type: "number" },
            fraud_type: { type: "string" },
            incident_date: { type: "string" },
            description: { type: "string" },
            ic3_complaint_number: { type: "string" },
            victim_wallet: { type: "string" },
            scammer_wallet: { type: "string" },
            scammer_info: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
                wallet_addresses: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      return Response.json({ extracted_data: extraction });
    }

    // --- Verify Case Data ---
    if (endpoint === 'verify-case') {
      const { caseData } = data;
      
      const prompt = `
        Review this case data for IC3/FBI submission readiness.
        Identify missing fields, inconsistencies, or formatting errors.
        
        Case Data: ${JSON.stringify(caseData)}
        
        Requirements:
        - Victim Name and Email are required.
        - Amount must be a positive number.
        - Description should be at least 50 words.
        - Incident date must be valid.
        
        Return a JSON object with:
        - valid (boolean)
        - issues (array of strings)
        - recommendations (array of strings)
        - completeness_score (0-100 number)
      `;

      const verification = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            valid: { type: "boolean" },
            issues: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            completeness_score: { type: "number" }
          }
        }
      });

      return Response.json(verification);
    }

    // --- Submit Follow-up ---
    if (endpoint === 'submit-follow-up') {
      const { caseId, updateType, content } = data;
      
      // Log the submission
      await base44.asServiceRole.entities.AgencySubmission.create({
        case_id: caseId,
        agency: 'IC3', // Defaulting for now
        submission_date: new Date().toISOString(),
        submission_method: 'online_portal',
        status: 'pending',
        notes: `Follow-up: ${updateType} - ${content.substring(0, 50)}...`
      });

      // Update case status or last activity
      try {
          await base44.asServiceRole.entities.MyCase.update(caseId, {
            last_activity: new Date().toISOString(),
            admin_contact_status: 'In Progress'
          });
      } catch (e) {
          try {
              // Legacy fallback
              await base44.asServiceRole.entities.InvestigationCase.update(caseId, {
                last_activity: new Date().toISOString(),
                admin_contact_status: 'In Progress'
              });
          } catch(e2) {}
      }

      return Response.json({ status: 'success', message: 'Follow-up logged and ready for transmission' });
    }

    // --- Request Info from Victim ---
    if (endpoint === 'request-victim-info') {
      const { caseId, victimEmail, missingInfo } = data;

      const subject = `Action Required: Missing Information for Case #${caseId}`;
      const body = `
        Dear Victim,

        We are reviewing your case and identified missing information required for federal filing.
        
        Please provide the following details:
        ${missingInfo}
        
        You can reply directly to this email or upload documents to your secure portal.
        
        Sincerely,
        SafeNestt Investigation Team
      `;

      await base44.integrations.Core.SendEmail({
        to: victimEmail,
        subject,
        body
      });
      
      // Log the communication
      await base44.asServiceRole.entities.CaseNote.create({
        case_id: caseId,
        author_email: user.email,
        author_name: 'System (Admin Action)',
        content: `Request sent to victim for: ${missingInfo}`,
        type: 'general'
      });

      return Response.json({ status: 'success' });
    }

    return Response.json({ error: 'Invalid endpoint' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});