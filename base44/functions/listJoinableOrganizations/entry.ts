import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

/**
 * Returns the list of organizations a new user can request to join during
 * signup. Runs as the service role so a not-yet-member user can discover
 * already-verified organizations (Tenant RLS would otherwise hide them).
 * Only exposes public join info: id, name, organization_type.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenants = await base44.asServiceRole.entities.Tenant.filter({
      status: { $in: ['active', 'verified'] }
    });

    const joinable = (tenants || [])
      .filter((t) => t && t.name)
      .map((t) => ({
        id: t.id,
        name: t.name,
        organization_type: t.organization_type || null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({ organizations: joinable });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}