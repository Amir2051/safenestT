import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await req.json();

    switch (action) {
      case 'generate_investigation_report':
        return await generateInvestigationReport(base44, user, data);
      case 'generate_client_summary':
        return await generateClientSummary(base44, user, data);
      case 'generate_analytics_report':
        return await generateAnalyticsReport(base44, user, data);
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Report Generation Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generateInvestigationReport(base44, user, { caseId }) {
  try {
    // Admin only
    if (user.role !== 'admin' && !user.is_admin && user.job_title !== 'Fraud Specialist') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch comprehensive case data
    const caseData = await base44.asServiceRole.entities.MyCase.get(caseId);
    if (!caseData) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // Fetch related data
    const [evidenceFiles, timeline, communications, tasks] = await Promise.all([
      base44.asServiceRole.entities.CaseEvidenceFile.filter({ case_id: caseId }),
      base44.asServiceRole.entities.CaseTimelineEvent.filter({ case_id: caseId }, '-created_date'),
      base44.asServiceRole.entities.CommunicationLog.filter({ case_id: caseId }, '-created_date'),
      base44.asServiceRole.entities.CaseTask.filter({ case_id: caseId }).catch(() => [])
    ]);

    // AI Synthesis
    const prompt = `Generate a comprehensive investigation report for case ${caseData.case_number}.

CASE DETAILS:
- Type: ${caseData.issue_type}
- Amount Lost: $${caseData.amount_lost}
- Status: ${caseData.status}
- Progress: ${caseData.investigation_progress}%
- Description: ${caseData.description}

EVIDENCE: ${evidenceFiles.length} files uploaded
TIMELINE EVENTS: ${timeline.length} events logged
COMMUNICATIONS: ${communications.length} interactions
TASKS: ${tasks.length} investigation tasks

AI ANALYSIS: ${caseData.ai_analysis || 'Not yet analyzed'}

Generate a detailed professional report with:
1. Executive Summary (2-3 paragraphs)
2. Case Overview (key facts)
3. Investigation Findings (what was discovered)
4. Evidence Analysis Summary
5. Suspect Profile (if available)
6. Recovery Assessment
7. Recommended Next Steps
8. Risk Assessment

Format as structured sections with professional language suitable for law enforcement.`;

    const reportData = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          case_overview: { type: 'string' },
          investigation_findings: { type: 'string' },
          evidence_summary: { type: 'string' },
          suspect_profile: { type: 'string' },
          recovery_assessment: { type: 'string' },
          next_steps: { type: 'array', items: { type: 'string' } },
          risk_level: { type: 'string' },
          confidence_rating: { type: 'string' }
        }
      }
    });

    // Generate PDF
    const doc = new jsPDF();
    let y = 20;

    // Header
    doc.setFontSize(20);
    doc.text('INVESTIGATION REPORT', 105, y, { align: 'center' });
    y += 15;
    
    doc.setFontSize(10);
    doc.text(`Case Number: ${caseData.case_number}`, 20, y);
    y += 6;
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
    y += 10;

    // Content sections
    const addSection = (title, content) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text(title, 20, y);
      y += 8;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(content, 170);
      doc.text(lines, 20, y);
      y += lines.length * 5 + 10;
    };

    addSection('EXECUTIVE SUMMARY', reportData.executive_summary);
    addSection('CASE OVERVIEW', reportData.case_overview);
    addSection('INVESTIGATION FINDINGS', reportData.investigation_findings);
    addSection('EVIDENCE ANALYSIS', reportData.evidence_summary);
    addSection('SUSPECT PROFILE', reportData.suspect_profile);
    addSection('RECOVERY ASSESSMENT', reportData.recovery_assessment);
    
    if (reportData.next_steps?.length > 0) {
      addSection('RECOMMENDED NEXT STEPS', reportData.next_steps.join('\n• '));
    }

    const pdfBytes = doc.output('arraybuffer');

    // Upload report
    const file = new File([pdfBytes], `Investigation_Report_${caseData.case_number}.pdf`, { type: 'application/pdf' });
    const uploadResponse = await base44.integrations.Core.UploadFile({ file });

    // Update case with report
    await base44.asServiceRole.entities.MyCase.update(caseId, {
      law_enforcement_report: uploadResponse.file_url,
      last_activity: new Date().toISOString()
    });

    // Log timeline event
    await base44.entities.CaseTimelineEvent.create({
      case_id: caseId,
      event_type: 'report_generated',
      event_title: 'Investigation Report Generated',
      event_description: 'Comprehensive investigation report created by AI',
      severity: 'success',
      automated: true,
      visible_to_client: false
    });

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Investigation_Report_${caseData.case_number}.pdf`
      }
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function generateClientSummary(base44, user, { caseId }) {
  try {
    const caseData = await base44.asServiceRole.entities.MyCase.get(caseId);
    if (!caseData) {
      return Response.json({ error: 'Case not found' }, { status: 404 });
    }

    // AI generates client-friendly summary
    const prompt = `Create a client-friendly case summary for ${caseData.case_number}.

CASE INFO:
- Type: ${caseData.issue_type}
- Amount Lost: $${caseData.amount_lost}
- Status: ${caseData.status}
- Progress: ${caseData.investigation_progress}%

Generate a compassionate, easy-to-understand summary that:
1. Acknowledges the situation
2. Explains what's been done
3. Outlines next steps
4. Provides realistic expectations
5. Offers reassurance and support

Use simple language, avoid jargon. Be professional but empathetic.`;

    const summary = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          introduction: { type: 'string' },
          what_happened: { type: 'string' },
          investigation_status: { type: 'string' },
          next_steps: { type: 'string' },
          timeline_estimate: { type: 'string' },
          support_message: { type: 'string' }
        }
      }
    });

    // Generate simple PDF
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text('Case Update Summary', 105, y, { align: 'center' });
    y += 15;

    doc.setFontSize(10);
    doc.text(`Case: ${caseData.case_number}`, 20, y);
    y += 6;
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, y);
    y += 15;

    const addText = (content, fontSize = 10) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(content, 170);
      doc.text(lines, 20, y);
      y += lines.length * (fontSize * 0.5) + 8;
    };

    addText(summary.introduction, 12);
    addText('What Happened:', 12);
    addText(summary.what_happened);
    addText('Investigation Status:', 12);
    addText(summary.investigation_status);
    addText('Next Steps:', 12);
    addText(summary.next_steps);
    addText(summary.support_message);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Case_Summary_${caseData.case_number}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function generateAnalyticsReport(base44, user, { dateRange = 'month' }) {
  try {
    if (user.role !== 'admin' && !user.is_admin) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const cases = await base44.asServiceRole.entities.MyCase.list('-created_date', 5000);
    
    // Calculate analytics
    const stats = {
      total_cases: cases.length,
      by_type: {},
      by_status: {},
      total_losses: 0,
      total_recovered: 0,
      avg_recovery_rate: 0,
      high_priority: 0,
      avg_resolution_time: 0
    };

    cases.forEach(c => {
      // By type
      const type = c.issue_type || 'unknown';
      stats.by_type[type] = (stats.by_type[type] || 0) + 1;

      // By status
      const status = c.status || 'unknown';
      stats.by_status[status] = (stats.by_status[status] || 0) + 1;

      // Financial
      stats.total_losses += (c.amount_lost || 0);
      stats.total_recovered += (c.recovery_amount || 0);

      // Priority
      if (c.priority_score >= 80 || c.urgency === 'Critical') {
        stats.high_priority++;
      }
    });

    stats.recovery_rate = stats.total_losses > 0 
      ? ((stats.total_recovered / stats.total_losses) * 100).toFixed(2) 
      : 0;

    // Generate insights with AI
    const prompt = `Analyze these fraud investigation statistics:

Total Cases: ${stats.total_cases}
Total Losses: $${stats.total_losses.toLocaleString()}
Total Recovered: $${stats.total_recovered.toLocaleString()}
Recovery Rate: ${stats.recovery_rate}%
High Priority Cases: ${stats.high_priority}

Fraud Types: ${JSON.stringify(stats.by_type)}
Case Status: ${JSON.stringify(stats.by_status)}

Provide executive insights including:
1. Key trends and patterns
2. Performance assessment
3. Risk factors to monitor
4. Strategic recommendations
5. Resource allocation suggestions`;

    const insights = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          key_trends: { type: 'array', items: { type: 'string' } },
          performance_summary: { type: 'string' },
          risk_factors: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          resource_priorities: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      statistics: stats,
      insights,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}