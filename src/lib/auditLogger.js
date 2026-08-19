import { base44 } from "@/api/base44Client";

/**
 * Audit Logger — creates AuditEvent records for investigator actions.
 * This NEVER fabricates events. It only logs real actions performed
 * by real users in the frontend. Hermes agent events are logged
 * separately when actually returned by Hermes.
 *
 * Failures are swallowed silently — audit logging must never break
 * the primary operation it accompanies.
 */
export async function logAuditEvent({ action, objectType = null, objectId = null, caseId = null, description = "", metadata = {} }) {
  try {
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.AuditEvent.create({
      actor: user?.email || "system",
      actor_name: user?.full_name || user?.email || "System",
      timestamp: new Date().toISOString(),
      action,
      object_type: objectType,
      object_id: objectId,
      case_id: caseId,
      description: description || action,
      metadata,
      source: "user",
    });
  } catch (e) {
    // Swallow — audit logging must not break the main operation.
    console.warn("[auditLogger] failed:", e?.message || e);
  }
}