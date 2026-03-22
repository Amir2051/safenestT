import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // AUTOMATION 4: Auto-Assign New Cases
    if (trigger_type === 'auto_assign_cases') {
        const unassignedCases = await base44.asServiceRole.entities.InvestigationCase.filter({
            $or: [{ assigned_to: null }, { assigned_to: "" }],
            status: 'new'
        }, null, 50);

        if (unassignedCases.length > 0) {
            // Get admins
            const users = await base44.asServiceRole.entities.User.list();
            const admins = users.filter(u => u.role === 'admin' || u.is_admin);
            
            if (admins.length > 0) {
                // Simple load balancing: pick random or round robin. 
                // Advanced: check open cases count. For now, random distribution.
                let assignments = 0;
                for (const c of unassignedCases) {
                    const assignee = admins[Math.floor(Math.random() * admins.length)].email;
                    
                    await base44.asServiceRole.entities.InvestigationCase.update(c.id, {
                        assigned_to: assignee,
                        status: 'investigating',
                        updated_by: 'system_automation'
                    });

                    // Notify Assignee
                    await base44.integrations.Core.SendEmail({
                        to: assignee,
                        subject: `🔍 New Case Assigned: ${c.case_number || c.case_title}`,
                        body: `You have been automatically assigned a new case.\n\nCase: ${c.case_title}\nPriority: ${c.priority}\n\nPlease review immediately.`
                    });
                    
                    assignments++;
                }
                
                result = { success: true, message: `Auto-assigned ${assignments} cases.` };
            } else {
                result = { success: false, message: 'No admins available for assignment' };
            }
        } else {
            result = { success: true, message: 'No unassigned cases found' };
        }
    }

    // AUTOMATION 5: Case Status → Law Enforcement (Auto-Generate Preliminary Report)
    if (trigger_type === 'case_status_law_enforcement') {
      const { case_id } = trigger_data;
      
      const caseData = await base44.asServiceRole.entities.MyCase.get(case_id);
      
      // Generate preliminary report using AI
      const reportContent = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a preliminary law enforcement report for the following fraud case:

Case Number: ${caseData.case_number}
Victim: ${caseData.client_name}
Fraud Type: ${caseData.issue_type}
Amount Lost: $${caseData.amount_lost}
Scammer Wallet: ${caseData.scammer_wallet}
Description: ${caseData.description}

Create a professional preliminary report that includes:
1. Case Summary
2. Victim Information
3. Suspect Information (if available)
4. Financial Impact
5. Evidence Overview
6. Recommended Next Steps for Law Enforcement

Format as markdown for official documentation.`,
        response_json_schema: {
          type: "object",
          properties: {
            report_title: { type: "string" },
            report_content: { type: "string" },
            summary: { type: "string" }
          }
        }
      });

      // Save report to case
      await base44.asServiceRole.entities.MyCase.update(case_id, {
        law_enforcement_report: reportContent.report_content,
        last_activity: new Date().toISOString()
      });

      // Create timeline event
      await base44.asServiceRole.entities.CaseTimelineEvent.create({
        case_id: case_id,
        event_type: 'report_generated',
        event_title: 'Law Enforcement Report Generated',
        event_description: 'Preliminary report auto-generated for law enforcement submission',
        severity: 'info',
        automated: true,
        visible_to_client: true
      });

      // Notify internal team
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of admins) {
        await base44.integrations.Core.SendEmail({
          to: admin.email,
          subject: `📋 Law Enforcement Report Generated: ${caseData.case_number}`,
          body: `A preliminary law enforcement report has been automatically generated for case ${caseData.case_number}.\n\nCase: ${caseData.case_title}\nStatus: Law Enforcement\n\nPlease review the report before submission.\n\nSafeNestT Workflow Automation`
        });
      }

      // Log automation
      await base44.asServiceRole.entities.WorkflowAutomation.create({
        automation_id: `AUTO_${Date.now()}`,
        trigger_type: 'case_status_law_enforcement',
        action_type: 'generate_report',
        trigger_entity_id: case_id,
        trigger_entity_type: 'MyCase',
        executed_at: new Date().toISOString(),
        status: 'success',
        execution_details: {
          report_title: reportContent.report_title,
          notifications_sent: admins.length
        }
      });

      result = {
        success: true,
        message: 'Preliminary law enforcement report generated',
        report: reportContent
      };
    }

    // AUTOMATION 6: High/Critical Priority → Auto-Create Follow-up Task
    if (trigger_type === 'priority_escalation') {
      const { case_id, priority } = trigger_data;
      
      if (priority === 'high' || priority === 'critical') {
        const caseData = await base44.asServiceRole.entities.MyCase.get(case_id);
        
        // Create urgent follow-up task
        const task = await base44.asServiceRole.entities.CaseTask.create({
          case_id: case_id,
          title: `URGENT: ${priority.toUpperCase()} Priority Case Review`,
          description: `This case has been flagged as ${priority.toUpperCase()} priority and requires immediate investigator review.\n\nCase: ${caseData.case_number}\nClient: ${caseData.client_name}\nAmount: $${caseData.amount_lost?.toLocaleString()}\n\nAction Required:\n1. Contact victim within 4 hours\n2. Verify case details\n3. Initiate investigation immediately`,
          assigned_to: caseData.assigned_to || 'admin@safenest.com',
          assigned_by: 'system_automation',
          status: 'todo',
          priority: priority,
          due_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() // Due in 4 hours
        });

        // Create timeline event
        await base44.asServiceRole.entities.CaseTimelineEvent.create({
          case_id: case_id,
          event_type: 'system_action',
          event_title: 'Urgent Task Created',
          event_description: `Auto-created urgent follow-up task due to ${priority} priority assignment`,
          severity: priority === 'critical' ? 'critical' : 'warning',
          automated: true,
          visible_to_client: false
        });

        // Notify assigned investigator
        if (caseData.assigned_to) {
          await base44.integrations.Core.SendEmail({
            to: caseData.assigned_to,
            subject: `🚨 URGENT TASK: ${priority.toUpperCase()} Priority Case ${caseData.case_number}`,
            body: `A ${priority} priority case requires your immediate attention.\n\nCase: ${caseData.case_number} - ${caseData.case_title}\nClient: ${caseData.client_name}\nAmount Lost: $${caseData.amount_lost?.toLocaleString()}\n\nDue: 4 hours\n\nPlease contact the victim and begin investigation immediately.\n\nView Case: [App URL]/investigation/${case_id}\n\nSafeNestT Priority Escalation System`
          });
        }

        // Log automation
        await base44.asServiceRole.entities.WorkflowAutomation.create({
          automation_id: `AUTO_${Date.now()}`,
          trigger_type: 'priority_escalation',
          action_type: 'create_task',
          trigger_entity_id: case_id,
          trigger_entity_type: 'MyCase',
          result_entity_id: task.id,
          result_entity_type: 'CaseTask',
          executed_at: new Date().toISOString(),
          status: 'success',
          execution_details: {
            priority,
            task_id: task.id,
            assignee: caseData.assigned_to
          }
        });

        result = {
          success: true,
          message: `Urgent task created for ${priority} priority case`,
          task_id: task.id
        };
      }
    }

    // AUTOMATION 7: Recovery Amount Updated → Notify Finance
    if (trigger_type === 'recovery_amount_updated') {
      const { case_id, old_amount, new_amount } = trigger_data;
      
      if (new_amount > (old_amount || 0)) {
        const caseData = await base44.asServiceRole.entities.MyCase.get(case_id);
        const recovered = new_amount - (old_amount || 0);
        
        // Create timeline event
        await base44.asServiceRole.entities.CaseTimelineEvent.create({
          case_id: case_id,
          event_type: 'progress_updated',
          event_title: 'Funds Recovered',
          event_description: `Recovery amount increased by $${recovered.toLocaleString()}. Total recovered: $${new_amount.toLocaleString()}`,
          severity: 'success',
          automated: true,
          visible_to_client: true
        });

        // Notify finance department
        const financeEmail = 'finance@safenest.com';
        await base44.integrations.Core.SendEmail({
          to: financeEmail,
          subject: `💰 Recovery Update: $${recovered.toLocaleString()} - Case ${caseData.case_number}`,
          body: `Recovery amount has been updated for case ${caseData.case_number}.\n\nClient: ${caseData.client_name}\nPrevious Recovery: $${(old_amount || 0).toLocaleString()}\nNew Recovery: $${new_amount.toLocaleString()}\nIncrease: $${recovered.toLocaleString()}\n\nTotal Loss: $${caseData.amount_lost?.toLocaleString()}\nRecovery Rate: ${((new_amount / (caseData.amount_lost || 1)) * 100).toFixed(1)}%\n\nPlease update financial records accordingly.\n\nSafeNestT Finance Automation`
        });

        // Notify client
        if (caseData.client_email) {
          await base44.integrations.Core.SendEmail({
            to: caseData.client_email,
            subject: `✅ Good News: Funds Recovered - ${caseData.case_number}`,
            body: `Hello ${caseData.client_name},\n\nWe have good news! We've successfully recovered $${recovered.toLocaleString()} from your case.\n\nTotal Recovered: $${new_amount.toLocaleString()}\nTotal Loss: $${caseData.amount_lost?.toLocaleString()}\nRecovery Rate: ${((new_amount / (caseData.amount_lost || 1)) * 100).toFixed(1)}%\n\nOur team will continue working to maximize recovery.\n\nView your case: [App URL]/my-cases\n\nBest regards,\nSafeNestT Recovery Team`
          });
        }

        // Log automation
        await base44.asServiceRole.entities.WorkflowAutomation.create({
          automation_id: `AUTO_${Date.now()}`,
          trigger_type: 'recovery_amount_updated',
          action_type: 'send_notification',
          trigger_entity_id: case_id,
          trigger_entity_type: 'MyCase',
          executed_at: new Date().toISOString(),
          status: 'success',
          execution_details: {
            old_amount: old_amount || 0,
            new_amount,
            recovered,
            notifications_sent: 2
          }
        });

        result = {
          success: true,
          message: 'Finance and client notified of recovery',
          recovered
        };
      }
    }

    // AUTOMATION 3: Inactivity Check -> Automated Task Creation
    if (trigger_type === 'check_case_inactivity') {
        // Fetch open cases
        const openCases = await base44.asServiceRole.entities.MyCase.filter({
            $or: [
                { status: 'Pending' },
                { status: 'In Progress' },
                { status: 'In Review' },
                { status: 'investigating' }
            ]
        }, null, 1000);

        const INACTIVITY_THRESHOLD_DAYS = 7;
        const now = new Date();
        const tasksCreated = [];

        for (const caseItem of openCases) {
            const lastActivity = caseItem.last_activity ? new Date(caseItem.last_activity) : new Date(caseItem.updated_date || caseItem.created_date);
            const diffTime = Math.abs(now - lastActivity);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > INACTIVITY_THRESHOLD_DAYS) {
                // Check if a task already exists for this (optional, skipped for simplicity/performance)
                
                const assignee = caseItem.assigned_to || 'admin@safenest.com'; // Default fallback
                
                const newTask = await base44.asServiceRole.entities.CaseTask.create({
                    case_id: caseItem.id,
                    title: `Follow-up: Inactive Case ${caseItem.case_number || ''}`,
                    description: `This case has been inactive for ${diffDays} days. Please review status and contact client if necessary.`,
                    assigned_to: assignee,
                    assigned_by: 'system@safenest.com',
                    priority: 'medium',
                    status: 'todo',
                    due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() // Due in 24h
                });

                tasksCreated.push(newTask.id);
            }
        }

        result = {
            success: true,
            message: `Inactivity check complete. Created ${tasksCreated.length} follow-up tasks.`,
            tasks_created: tasksCreated
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