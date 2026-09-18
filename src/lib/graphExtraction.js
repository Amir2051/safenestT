import { base44 } from "@/api/base44Client";
import { ensureTenant } from "@/lib/tenantContext";
import { logAuditEvent } from "@/lib/auditLogger";

/**
 * Graph extraction — asks the Hermes engine (via the server-side hermesProxy)
 * to extract entities + relationships ONLY from the real case context
 * (case, evidence, targets, findings). The result is persisted as tenant-
 * scoped GraphNode / GraphEdge records, then rendered from the database.
 *
 * Nothing is fabricated: if Hermes returns no extractable entities, we persist
 * nothing and report an honest empty result.
 */

const SCHEMA = {
  type: "object",
  properties: {
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          node_type: { type: "string" },
          label: { type: "string" },
          value: { type: "string" },
          confidence: { type: "string" },
          evidence_refs: { type: "array", items: { type: "string" } },
        },
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source_node: { type: "string" },
          target_node: { type: "string" },
          relationship_type: { type: "string" },
          label: { type: "string" },
          transaction_hash: { type: "string" },
          amount: { type: "number" },
          confidence: { type: "string" },
        },
      },
    },
  },
};

function safeArr(x) { return Array.isArray(x) ? x : []; }

/**
 * Execute a Hermes-powered graph extraction for a case and persist the result.
 * Returns { nodes, edges, persisted, note?, error? }.
 */
export async function extractGraph({ caseId }) {
  if (!caseId) throw new Error("caseId is required");
  const tenantId = await ensureTenant();

  const [caseItem, evidence, targets, findings] = await Promise.all([
    base44.entities.InvestigationCase.get(caseId),
    base44.entities.EvidenceItem.filter({ case_id: caseId }, "-created_date", 100).catch(() => []),
    base44.entities.InvestigationTarget.filter({ case_id: caseId }, "-created_date", 100).catch(() => []),
    base44.entities.InvestigationFinding.filter({ case_id: caseId }, "-created_date", 100).catch(() => []),
  ]);

  const ctx = {
    case: {
      title: caseItem.case_title,
      fraud_type: caseItem.fraud_type,
      victim_name: caseItem.victim_name,
      amount_stolen_usd: caseItem.amount_stolen_usd,
      description: caseItem.description,
      suspect_details: caseItem.suspect_details,
      scammer_info: caseItem.scammer_info,
      transaction_hashes: caseItem.transaction_hashes,
      monitored_wallets: caseItem.monitored_wallets,
    },
    evidence: evidence.map((e) => ({ id: e.id, filename: e.filename, type: e.evidence_type, description: e.description, tags: e.tags })),
    targets: targets.map((t) => ({ type: t.type, value: t.value, network: t.network, label: t.label })),
    findings: findings.map((f) => ({ title: f.title, category: f.category, severity: f.severity })),
  };

  const prompt =
    `You are the Hermes investigation engine. Extract a relationship graph (entities + relationships) ONLY from the real case data below.\n` +
    `Do NOT invent entities or relationships that are not supported by the evidence/targets. If the data is sparse, return fewer nodes.\n` +
    `Cite evidence ids in evidence_refs where possible. node_type must be one of: wallet, person, exchange, domain, ip, email, phone, transaction, token_contract, service, organization, other.\n` +
    `relationship_type must be one of: sends_funds, receives_funds, controls, owned_by, communicates_with, linked_to, transacted_with, other.\n` +
    `Every edge endpoint MUST appear as a node value.\n\n` +
    `CASE:\n${JSON.stringify(ctx.case, null, 2)}\n\n` +
    `EVIDENCE (${ctx.evidence.length}):\n${JSON.stringify(ctx.evidence, null, 2)}\n\n` +
    `TARGETS (${ctx.targets.length}):\n${JSON.stringify(ctx.targets, null, 2)}\n\n` +
    `FINDINGS (${ctx.findings.length}):\n${JSON.stringify(ctx.findings, null, 2)}\n\n` +
    `Return JSON { nodes:[...], edges:[...] }.`;

  let body;
  try {
    const res = await base44.functions.invoke("hermesProxy", {
      prompt,
      response_json_schema: SCHEMA,
      temperature: 0.1,
    });
    body = res?.data ?? res;
  } catch (e) {
    throw new Error(`Hermes extraction request failed: ${e?.message || e}`);
  }

  if (!body || body.ok === false || body.status === "error") {
    throw new Error(body?.error || "Hermes extraction failed");
  }
  const out = body.data ?? body;
  const rawNodes = safeArr(out?.nodes);
  const rawEdges = safeArr(out?.edges);

  // Normalize + de-duplicate nodes by canonical value.
  const nodeMap = new Map();
  for (const n of rawNodes) {
    const value = String(n.value || n.label || "").trim();
    if (!value) continue;
    if (!nodeMap.has(value)) {
      nodeMap.set(value, {
        node_type: n.node_type || "other",
        label: String(n.label || value),
        value,
        confidence: n.confidence || "medium",
        evidence_refs: safeArr(n.evidence_refs),
        hermes_raw: n,
      });
    }
  }

  // Only keep edges whose endpoints both exist as nodes.
  const edges = rawEdges
    .filter((e) => e.source_node && e.target_node && nodeMap.has(String(e.source_node).trim()) && nodeMap.has(String(e.target_node).trim()))
    .map((e) => ({
      source_node: String(e.source_node).trim(),
      target_node: String(e.target_node).trim(),
      relationship_type: e.relationship_type || "linked_to",
      label: e.label || "",
      transaction_hash: e.transaction_hash || "",
      amount: typeof e.amount === "number" ? e.amount : null,
      confidence: e.confidence || "medium",
      hermes_raw: e,
    }));

  if (nodeMap.size === 0) {
    await logAuditEvent({
      action: "graph_extracted",
      objectType: "case",
      objectId: caseId,
      caseId,
      description: "Hermes graph extraction returned no entities",
      metadata: { nodes: 0, edges: 0 },
      source: "ai_run",
    }).catch(() => {});
    return { nodes: [], edges: [], persisted: { nodes: 0, edges: 0 }, note: "Hermes returned no extractable entities from the current case context." };
  }

  const nodeRecords = Array.from(nodeMap.values()).map((n) => ({
    tenant_id: tenantId,
    case_id: caseId,
    node_type: n.node_type,
    label: n.label,
    value: n.value,
    source: "hermes_extraction",
    confidence: n.confidence,
    evidence_refs: n.evidence_refs,
    hermes_raw: n.hermes_raw,
    first_seen: new Date().toISOString(),
  }));
  const createdNodes = await base44.entities.GraphNode.bulkCreate(nodeRecords).catch((e) => {
    throw new Error(`Failed to persist graph nodes: ${e?.message || e}`);
  });

  const edgeRecords = edges.map((e) => ({
    tenant_id: tenantId,
    case_id: caseId,
    source_node: e.source_node,
    target_node: e.target_node,
    relationship_type: e.relationship_type,
    label: e.label,
    transaction_hash: e.transaction_hash,
    amount: e.amount,
    confidence: e.confidence,
    hermes_raw: e.hermes_raw,
  }));
  const createdEdges = edgeRecords.length
    ? await base44.entities.GraphEdge.bulkCreate(edgeRecords).catch((e) => {
        throw new Error(`Failed to persist graph edges: ${e?.message || e}`);
      })
    : [];

  await logAuditEvent({
    action: "graph_extracted",
    objectType: "case",
    objectId: caseId,
    caseId,
    description: `Hermes extracted ${createdNodes.length} nodes / ${createdEdges.length} edges`,
    metadata: { nodes: createdNodes.length, edges: createdEdges.length },
    source: "ai_run",
  }).catch(() => {});

  return { nodes: createdNodes, edges: createdEdges, persisted: { nodes: createdNodes.length, edges: createdEdges.length } };
}