import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && !user.is_admin && user.job_title !== 'Fraud Specialist')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (endpoint === 'generate_document') {
      const { case_id, document_type, case_data } = body;

      // 1. Generate Content using LLM
      const prompt = `
        You are a professional fraud investigator and legal assistant.
        Generate a formal "${document_type.replace(/_/g, ' ').toUpperCase()}" for the following case.
        
        CASE DETAILS:
        Victim Name: ${case_data.client_name}
        Victim Bank: ${case_data.victim_bank_name || '[Bank Name]'}
        Victim Account: ${case_data.victim_account_number || '[Account Number]'}
        
        Scammer Bank: ${case_data.scammer_bank_name || '[Scammer Bank]'}
        Scammer Routing: ${case_data.scammer_routing_number || '[Routing Number]'}
        Scammer Account: ${case_data.scammer_account_number || '[Account Number]'}
        
        Transaction Date: ${case_data.transaction_date || '[Date]'}
        Amount Lost: $${case_data.amount_lost || '0.00'}
        
        Description: ${case_data.description || ''}
        Notes: ${case_data.notes || ''}

        INSTRUCTIONS:
        - If Routing Number is provided, try to identify the bank location if you know it, otherwise use placeholders.
        - Use formal, legal/banking language.
        - Include placeholders like [Date], [Signature] where appropriate.
        - Output ONLY the body of the document (no markdown code blocks if possible, just the text).
      `;

      const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true // helpful for bank address lookup from routing number
      });

      const generatedContent = llmRes; // The LLM returns string

      // 2. Create PDF
      const doc = new jsPDF();
      const splitText = doc.splitTextToSize(generatedContent, 180);
      doc.setFontSize(12);
      doc.text(splitText, 15, 20);
      const pdfBytes = doc.output('arraybuffer');
      
      // 3. Upload PDF (We need to convert arraybuffer to string/blob for upload? 
      // The UploadFile integration takes a File object or similar in frontend, 
      // but here we are backend. We might need to just store content for now or use a different method.
      // For simplicity in this step, we will return the content and let frontend handle PDF blob download 
      // OR we can use UploadPrivateFile if supported backend-side directly with bytes. 
      // Current UploadFile integration schema takes 'file' as string (path? or base64?). 
      // Let's just return the content and let the frontend generate the PDF for download/saving 
      // OR save the text content to the entity.
      // We will save the TEXT content to the entity.
      
      // 4. Save to GeneratedDocument
      const newDoc = await base44.asServiceRole.entities.GeneratedDocument.create({
        case_id: case_id,
        document_type: document_type,
        title: `${document_type.replace(/_/g, ' ')} - ${new Date().toLocaleDateString()}`,
        content: generatedContent,
        version: 1, // Simplification: could query max version + 1
        generated_by: user.email
      });

      // 5. Add Timeline Event
      await base44.asServiceRole.entities.CaseTimelineEvent.create({
        case_id: case_id,
        event_type: 'document_generated',
        description: `Generated ${document_type.replace(/_/g, ' ')}`,
        performed_by: user.email
      });

      return Response.json({ success: true, document: newDoc });
    }

    if (endpoint === 'send_email') {
      const { to, subject, body, attachment_content, attachment_name } = body;
      
      // Basic email sending. 
      // Note: The Core.SendEmail integration currently supports simple body. 
      // It might not support attachments directly in the current definition provided in system prompt.
      // We will send the text content in the body or a link if we had a file url.
      
      await base44.integrations.Core.SendEmail({
        to: to,
        subject: subject,
        body: body
      });

      // Log event
      if (body.case_id) {
         await base44.asServiceRole.entities.CaseTimelineEvent.create({
          case_id: body.case_id,
          event_type: 'email_sent',
          description: `Sent email to ${to} regarding ${attachment_name || 'case document'}`,
          performed_by: user.email
        });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown endpoint' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});