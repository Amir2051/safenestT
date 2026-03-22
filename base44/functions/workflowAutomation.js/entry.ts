import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { trigger_type, trigger_data } = await req.json();

    let result = { success: false, message: 'Unknown trigger' };

    // Workflow 1: Critical Alert → Auto-generate Dispute Notice
    if (trigger_type === 'critical_alert_detected') {
      const { alert_id, property_id, property_owner } = trigger_data;
      
      // Get alert details
      const alert = await base44.entities.TitleAlert.get(alert_id);
      
      // Generate formal dispute notice using AI
      const documentContent = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a formal legal dispute notice for a property title issue:

Property: ${alert.property_address}
Filing Type: ${alert.filing_type}
Filed By: ${alert.filing_party}
Filing Date: ${alert.filing_date}
Document ID: ${alert.document_id}

Create a professional "Formal Dispute Notice" document in markdown format that includes:
1. Property owner's assertion of rightful ownership
2. Description of the suspicious filing
3. Request for immediate investigation
4. Legal citations (NY Real Property Law)
5. Deadline for response (14 days)
6. Contact information placeholder

Make it legally sound and ready to file with NYC Department of Finance.`,
        response_json_schema: {
          type: "object",
          properties: {
            document_title: { type: "string" },
            document_content: { type: "string" },
            summary: { type: "string" }
          }
        }
      });

      // Find or create workspace
      let workspaces = await base44.asServiceRole.entities.CollaborationWorkspace.filter({
        property_id: property_id,
        status: 'active'
      });

      let workspace;
      if (workspaces.length === 0) {
        // Create workspace if none exists
        workspace = await base44.asServiceRole.entities.CollaborationWorkspace.create({
          workspace_id: `WS_${Date.now()}`,
          property_id: property_id,
          workspace_name: `${alert.property_address} - Legal Case`,
          owner_email: property_owner,
          status: 'active',
          created_date: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          participants: [{
            email: property_owner,
            name: property_owner,
            role: 'owner',
            joined_date: new Date().toISOString(),
            is_online: false
          }]
        });
      } else {
        workspace = workspaces[0];
      }

      // Create the document
      const document = await base44.asServiceRole.entities.CollaborativeDocument.create({
        workspace_id: workspace.id,
        document_name: documentContent.document_title,
        document_type: 'legal_document',
        content: documentContent.document_content,
        created_by: 'system@safenest.com',
        version: 1,
        status: 'draft'
      });

      // Send notification to user
      await base44.integrations.Core.SendEmail({
        to: property_owner,
        subject: '🚨 Critical Alert: Dispute Notice Auto-Generated',
        body: `A critical property title alert was detected for ${alert.property_address}.\n\nWe've automatically generated a Formal Dispute Notice document for you.\n\n${documentContent.summary}\n\nView and edit the document in your Legal Collaboration workspace:\n[App URL]/collaboration\n\nDocument: "${documentContent.document_title}"\n\nThis document is ready to file with NYC Department of Finance. Review and customize as needed.\n\nSafeNest Legal Automation`
      });

      // Log automation
      await base44.asServiceRole.entities.WorkflowAutomation.create({
        automation_id: `AUTO_${Date.now()}`,
        trigger_type: 'critical_alert_detected',
        action_type: 'create_document',
        trigger_entity_id: alert_id,
        trigger_entity_type: 'TitleAlert',
        result_entity_id: document.id,
        result_entity_type: 'CollaborativeDocument',
        executed_at: new Date().toISOString(),
        status: 'success',
        execution_details: {
          user_email: property_owner,
          workspace_id: workspace.id,
          document_name: documentContent.document_title,
          notification_sent: true
        }
      });

      result = {
        success: true,
        message: 'Dispute notice created and user notified',
        document_id: document.id,
        workspace_id: workspace.id
      };
    }

    // Workflow 2: Document Status → In Review → Assign Task to Attorney
    if (trigger_type === 'document_status_changed') {
      const { document_id, new_status, workspace_id } = trigger_data;

      if (new_status === 'in_review') {
        const document = await base44.asServiceRole.entities.CollaborativeDocument.get(document_id);
        const workspace = await base44.asServiceRole.entities.CollaborationWorkspace.get(workspace_id);

        if (workspace.attorney_email) {
          // Create task for attorney
          const task = await base44.asServiceRole.entities.AttorneyTask.create({
            task_id: `TASK_${Date.now()}`,
            workspace_id: workspace_id,
            document_id: document_id,
            assigned_to: workspace.attorney_email,
            assigned_by: 'system@safenest.com',
            task_type: 'document_review',
            title: `Review Document: ${document.document_name}`,
            description: `Document "${document.document_name}" has been marked as "In Review" and requires your legal review.\n\nProperty: ${workspace.workspace_name}\nClient: ${workspace.owner_email}\n\nPlease review, provide feedback, and approve or request changes.`,
            priority: 'high',
            status: 'pending',
            due_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
            created_date: new Date().toISOString(),
            auto_generated: true,
            trigger_type: 'document_status_changed'
          });

          // Send email to attorney
          await base44.integrations.Core.SendEmail({
            to: workspace.attorney_email,
            subject: '📋 New Task: Document Review Required',
            body: `A new task has been automatically assigned to you:\n\nTask: Review Document - "${document.document_name}"\nPriority: HIGH\nDue: 48 hours\n\nClient: ${workspace.owner_email}\nWorkspace: ${workspace.workspace_name}\n\nThe client has marked this document as "In Review" and is awaiting your legal review.\n\nAccess workspace: [App URL]/collaboration\n\nPlease review and provide feedback within 48 hours.\n\nSafeNest Legal Automation`
          });

          // Send notification to client
          await base44.integrations.Core.SendEmail({
            to: workspace.owner_email,
            subject: '✅ Document Submitted for Attorney Review',
            body: `Your document "${document.document_name}" has been submitted for legal review.\n\nYour attorney (${workspace.attorney_email}) has been notified and will review within 48 hours.\n\nYou'll receive a notification when the review is complete.\n\nWorkspace: [App URL]/collaboration\n\nSafeNest Legal Automation`
          });

          // Log automation
          await base44.asServiceRole.entities.WorkflowAutomation.create({
            automation_id: `AUTO_${Date.now()}`,
            trigger_type: 'document_status_changed',
            action_type: 'assign_task',
            trigger_entity_id: document_id,
            trigger_entity_type: 'CollaborativeDocument',
            result_entity_id: task.id,
            result_entity_type: 'AttorneyTask',
            executed_at: new Date().toISOString(),
            status: 'success',
            execution_details: {
              user_email: workspace.attorney_email,
              workspace_id: workspace_id,
              document_name: document.document_name,
              task_id: task.id,
              notification_sent: true
            }
          });

          result = {
            success: true,
            message: 'Task assigned to attorney and notifications sent',
            task_id: task.id
          };
        } else {
          result = {
            success: false,
            message: 'No attorney assigned to workspace'
          };
        }
      }
    }

    // Workflow 3: Attorney Update → Notify User
    if (trigger_type === 'attorney_document_updated' || trigger_type === 'attorney_message_sent') {
      const { workspace_id, entity_type, entity_id, attorney_email } = trigger_data;

      const workspace = await base44.asServiceRole.entities.CollaborationWorkspace.get(workspace_id);
      
      let notificationBody = '';
      if (trigger_type === 'attorney_document_updated') {
        const document = await base44.asServiceRole.entities.CollaborativeDocument.get(entity_id);
        notificationBody = `Your attorney has updated the document: "${document.document_name}"\n\nWorkspace: ${workspace.workspace_name}\nUpdated by: ${attorney_email}\nTime: ${new Date().toLocaleString()}\n\nView changes: [App URL]/collaboration\n\nYou may want to review the updates and continue collaborating.\n\nSafeNest Real-Time Collaboration`;
      } else {
        const message = await base44.asServiceRole.entities.ChatMessage.get(entity_id);
        notificationBody = `Your attorney sent you a message in "${workspace.workspace_name}"\n\nMessage: "${message.message_content.substring(0, 200)}..."\n\nReply now: [App URL]/collaboration\n\nSafeNest Real-Time Collaboration`;
      }

      // Send email to user
      await base44.integrations.Core.SendEmail({
        to: workspace.owner_email,
        subject: trigger_type === 'attorney_document_updated' 
          ? '📝 Attorney Updated Your Document' 
          : '💬 New Message from Your Attorney',
        body: notificationBody
      });

      // Log automation
      await base44.asServiceRole.entities.WorkflowAutomation.create({
        automation_id: `AUTO_${Date.now()}`,
        trigger_type: trigger_type,
        action_type: 'send_notification',
        trigger_entity_id: entity_id,
        trigger_entity_type: entity_type,
        executed_at: new Date().toISOString(),
        status: 'success',
        execution_details: {
          user_email: workspace.owner_email,
          workspace_id: workspace_id,
          notification_sent: true
        }
      });

      result = {
        success: true,
        message: 'User notified of attorney activity'
      };
    }

    return Response.json(result);

  } catch (error) {
    console.error('Workflow automation error:', error);
    
    // Log failed automation
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.WorkflowAutomation.create({
        automation_id: `AUTO_${Date.now()}`,
        trigger_type: 'unknown',
        action_type: 'send_notification',
        executed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error.message
      });
    } catch (logError) {
      console.error('Failed to log automation error:', logError);
    }

    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});