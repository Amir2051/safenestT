import { base44 } from "@/api/base44Client";
import { ensureTenant, getCurrentUser } from "@/lib/tenantContext";
import { logAuditEvent } from "@/lib/auditLogger";

/**
 * Built-in Hermes test workflow.
 *
 * Creates a clearly-labeled "Hermes Test Case" seeded with the safe
 * `example.com` DOMAIN target, so the full Hermes lifecycle
 * (POST /v1/investigations → /start → poll → evidence/findings/risk/report)
 * can be exercised end-to-end against the live gateway without a real victim.
 *
 * The case and target are persisted to the normal SafeNestT entities
 * (InvestigationCase, InvestigationTarget) under the current user's tenant,
 * so the existing six-phase runner and tabs see them like any other case.
 * Nothing here is mocked — the real Hermes investigation runs and its results
 * are persisted by runHermesInvestigation().
 */

export const HERMES_TEST_TARGET = {
  type: "domain",
  value: "example.com",
  label: "Hermes built-in test target",
};

export async function createHermesTestCase() {
  const tenantId = await ensureTenant();
  const user = await getCurrentUser();
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-T:]/g, "");

  const caseTitle = `Hermes Test Case — example.com (${stamp})`;
  const testCase = await base44.entities.InvestigationCase.create({
    tenant_id: tenantId,
    case_title: caseTitle,
    case_number: `HERMES-TEST-${stamp}`,
    victim_name: "Hermes Integration Test",
    victim_email: user?.email || undefined,
    fraud_type: "phishing",
    priority: "low",
    case_priority: "low",
    amount_stolen_usd: 0,
    description:
      "Built-in Hermes integration test case. Safe target: example.com (DOMAIN). Created by the SafeNestT test workflow to validate the create → start → poll lifecycle against the live Hermes gateway. No real victim.",
    status: "new",
    investigation_progress: 0,
    workflow: { current_phase: "planning", phases: {}, provider: "hermes", model: "hermes-agent" },
  });

  const target = await base44.entities.InvestigationTarget.create({
    tenant_id: tenantId,
    case_id: testCase.id,
    type: HERMES_TEST_TARGET.type,
    value: HERMES_TEST_TARGET.value,
    label: HERMES_TEST_TARGET.label,
    description: "Safe built-in test target for the Hermes investigation workflow.",
    source: "manual",
    status: "pending",
  });

  await logAuditEvent({
    action: "hermes_test_case_created",
    objectType: "case",
    objectId: testCase.id,
    caseId: testCase.id,
    description: `Created built-in Hermes test case with target ${HERMES_TEST_TARGET.value}`,
    metadata: { target_id: target.id, target_type: HERMES_TEST_TARGET.type },
  }).catch(() => {});

  return { caseId: testCase.id, caseTitle, targetId: target.id };
}