import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

const AGENTS = [
  { id: "blockchain_analyst", name: "NEXUS", role: "Blockchain & crypto-flow analyst" },
  { id: "financial_analyst", name: "ATLAS", role: "Financial & funds-flow analyst" },
  { id: "behavioral_analyst", name: "ORION", role: "Behavioral & social-engineering analyst" },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const caseId = body?.caseId;
    if (!caseId) return Response.json({ error: "caseId is required" }, { status: 400 });

    const stored = await base44.asServiceRole.entities.MyCase.get(caseId);
    if (!stored) return Response.json({ error: "Case not found" }, { status: 404 });

    const existing = await base44.asServiceRole.entities.CaseAgentAssignment.filter({ case_id: caseId }, "-created_date", 20).catch(() => []);
    const byAgent = new Map(existing.map(a => [a.agent_id, a]));
    const assignments = [];

    for (const agent of AGENTS) {
      const current = byAgent.get(agent.id);
      if (current) {
        assignments.push(current);
        continue;
      }
      const created = await base44.asServiceRole.entities.CaseAgentAssignment.create({
        case_id: caseId,
        agent_id: agent.id,
        agent_name: agent.name,
        role: agent.role,
        status: "assigned",
        findings_count: 0,
        run_count: 0
      });
      assignments.push(created);
    }

    return Response.json({ success: true, case_id: caseId, assignments });
  } catch (error) {
    console.error("ensureCaseAgents error:", error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
