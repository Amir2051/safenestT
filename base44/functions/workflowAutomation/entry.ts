import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin' && !user.is_admin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { trigger_type, trigger_data } = await req.json();

    let result = { success: false, message: 'Unknown trigger' };

    // AUTOMATION 1: Auto-Assign New Cases
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

    // AUTOMATION 2: Case Status → Law Enforcement (Auto-Generate Preliminary Report)
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

    // AUTOMATION 3: High/Critical Priority → Auto-Create Follow-up Task
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

    // AUTOMATION 4: Recovery Amount Updated → Notify Finance
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

    // AUTOMATION 5: Inactivity Check -> Automated Task Creation
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
                const assignee = caseItem.assigned_to || 'admin@safenest.com';

                const newTask = await base44.asServiceRole.entities.CaseTask.create({
                    case_id: caseItem.id,
                    title: `Follow-up: Inactive Case ${caseItem.case_number || ''}`,
                    description: `This case has been inactive for ${diffDays} days. Please review status and contact client if necessary.`,
                    assigned_to: assignee,
                    assigned_by: 'system@safenest.com',
                    priority: 'medium',
                    status: 'todo',
                    due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
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