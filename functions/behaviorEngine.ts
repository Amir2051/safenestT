import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { endpoint, data } = await req.json();
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && !user.is_admin)) {
      // Allow basic event tracking from users, but analysis is admin only
      if (endpoint !== 'track-event') {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // --- Endpoint: Track Event ---
    if (endpoint === 'track-event') {
      const { event_type, details, severity } = data;
      await base44.asServiceRole.entities.BehaviorEvent.create({
        actor_id: user.id,
        actor_type: user.role === 'admin' || user.is_admin ? 'admin' : 'user',
        event_type,
        details,
        severity: severity || 'info',
        is_processed: false
      });
      return Response.json({ status: 'success' });
    }

    // --- Endpoint: Analyze Case (AI Core) ---
    if (endpoint === 'analyze-case') {
      const { caseId } = data;
      const fraudCase = await base44.entities.InvestigationCase.get(caseId);
      if (!fraudCase) return Response.json({ error: 'Case not found' }, { status: 404 });

      // Fetch related data for context
      const notes = await base44.entities.CaseNote.filter({ case_id: caseId });
      const events = await base44.entities.BehaviorEvent.filter({ actor_id: fraudCase.created_by }); // Events from the reporting user

      // Construct Prompt for LLM
      const prompt = `
        Analyze this fraud case for behavioral patterns and risk.
        
        Case Details:
        Title: ${fraudCase.case_title}
        Description: ${fraudCase.description}
        Amount: ${fraudCase.amount_stolen_usd}
        Type: ${fraudCase.fraud_type}
        Suspect Info: ${JSON.stringify(fraudCase.suspect_details || {})}
        
        User Behavior Events: ${JSON.stringify(events.slice(0, 10))}
        Case Notes: ${JSON.stringify(notes.slice(0, 5))}

        Task:
        1. Calculate a risk score (0-100).
        2. Determine risk level (low, medium, high, critical).
        3. Identify specific risk factors (e.g., "Urgent payment pressure detected", "High value loss").
        4. Detect behavioral patterns (e.g., "Romance scam grooming pattern", "Technical support impersonation").
        5. Predict specific scam type if not clear.
        6. Recommend 3-5 actionable next steps for the admin.
        
        Return ONLY JSON matching this schema:
        {
          "risk_score": number,
          "risk_level": string,
          "factors": string[],
          "ai_analysis": string,
          "predicted_scam_type": string,
          "recommended_actions": string[]
        }
      `;

      const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            risk_score: { type: "number" },
            risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
            factors: { type: "array", items: { type: "string" } },
            ai_analysis: { type: "string" },
            predicted_scam_type: { type: "string" },
            recommended_actions: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Save Assessment
      const existingAssessment = await base44.entities.RiskAssessment.filter({ target_id: caseId });
      if (existingAssessment.length > 0) {
        await base44.entities.RiskAssessment.update(existingAssessment[0].id, {
          ...llmRes,
          last_analyzed: new Date().toISOString()
        });
      } else {
        await base44.entities.RiskAssessment.create({
          target_id: caseId,
          target_type: 'case',
          ...llmRes,
          last_analyzed: new Date().toISOString()
        });
      }

      return Response.json(llmRes);
    }

    // --- Endpoint: Analyze Admin Performance ---
    if (endpoint === 'analyze-admin') {
       // Mock analysis of admin logs for demo purposes
       const admins = await base44.entities.User.list();
       const adminList = admins.filter(u => u.role === 'admin' || u.is_admin);
       
       const results = [];
       for (const admin of adminList) {
          // In a real scenario, we'd query AdminAccessLog and CaseLogs here
          const score = Math.floor(Math.random() * 20) + 80; // Mock score
          results.push({
            admin_id: admin.id,
            name: admin.full_name,
            efficiency_score: score,
            workload_prediction: score > 90 ? 'Optimal' : 'High Load',
            flagged_actions: score < 85 ? ['Delayed response to critical case'] : []
          });
       }
       return Response.json({ results });
    }

    return Response.json({ error: 'Invalid endpoint' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});