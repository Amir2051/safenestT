import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ── Client Authorization Service ────────────────────────────────────────────
// Server-side enforcement for SafeNestT "act on behalf of client" capability.
// Every action verifies: authenticated caller, caller role/permissions, target
// case, target client, ACTIVE authorization, requested action within scope,
// and tenant/organization isolation. The frontend is NEVER the security boundary.

const STAFF_TENANT_ROLES = ['owner', 'admin', 'investigator'];
const ALL_SCOPES = ['VIEW_CASE', 'INVESTIGATE', 'COMMUNICATE', 'FILE_REPORT', 'FILE_LAW_ENFORCEMENT_REPORT', 'SUBMIT_TO_REGULATOR', 'SUBMIT_TO_PLATFORM', 'OTHER'];
const FILING_SCOPES = ['FILE_REPORT', 'FILE_LAW_ENFORCEMENT_REPORT', 'SUBMIT_TO_REGULATOR', 'SUBMIT_TO_PLATFORM'];

function isStaffUser(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const tr = user.data?.tenant_role || user.tenant_role;
  return STAFF_TENANT_ROLES.includes(tr);
}

function userTenantId(user) {
  return user.data?.tenant_id || user.tenant_id || '';
}

function nowIso() { return new Date().toISOString(); }

function isExpired(auth) {
  if (!auth.expires_at) return false;
  return new Date(auth.expires_at).getTime() < Date.now();
}

async function expireStale(base44, auths) {
  for (const a of auths) {
    if (a.status === 'ACTIVE' && isExpired(a)) {
      try {
        await base44.asServiceRole.entities.ClientAuthorization.update(a.id, { status: 'EXPIRED' });
      } catch (e) { /* best effort */ }
    }
  }
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ── GRANT (client grants authorization for their case; admin intake) ──
    if (action === 'grant') {
      const { case_id, scopes, expires_at, authorization_document_url, scope_other_description, notes } = body;
      if (!case_id || !Array.isArray(scopes) || scopes.length === 0) {
        return Response.json({ error: 'case_id and scopes are required' }, { status: 400 });
      }
      const invalid = scopes.filter((s) => !ALL_SCOPES.includes(s));
      if (invalid.length) return Response.json({ error: 'Invalid scope(s): ' + invalid.join(', ') }, { status: 400 });

      const isAdmin = user.role === 'admin';
      let clientUserId = user.id;
      let clientEmail = user.email;
      let clientName = user.full_name || user.email;
      if (isAdmin && body.client_user_id) {
        clientUserId = body.client_user_id;
        clientEmail = body.client_email || '';
        clientName = body.client_name || '';
      }

      // Verify the case exists. Non-admin uses user-scoped read (RLS enforces ownership).
      let caseRecord = null;
      try {
        caseRecord = isAdmin
          ? await base44.asServiceRole.entities.MyCase.get(case_id)
          : await base44.entities.MyCase.get(case_id);
      } catch (e) { /* not found / not authorized */ }
      if (!caseRecord) {
        return Response.json({ error: 'Case not found or not accessible' }, { status: 404 });
      }
      if (!isAdmin) {
        const ownerMatch = caseRecord.user_id === user.id || caseRecord.created_by_id === user.id;
        if (!ownerMatch) {
          return Response.json({ error: 'You can only authorize for your own case' }, { status: 403 });
        }
      }

      const auth = await base44.entities.ClientAuthorization.create({
        tenant_id: caseRecord.tenant_id || userTenantId(user) || '',
        client_user_id: clientUserId,
        client_email: clientEmail,
        client_name: clientName,
        case_id,
        case_title: caseRecord.case_number || caseRecord.client_name || case_id,
        case_number: caseRecord.case_number || '',
        status: 'PENDING',
        scopes,
        scope_other_description: scope_other_description || '',
        granted_at: nowIso(),
        expires_at: expires_at || null,
        authorization_document_url: authorization_document_url || '',
        client_ip: (req.headers.get('x-forwarded-for') || '').split(',')[0] || '',
        client_user_agent: req.headers.get('user-agent') || '',
        notes: notes || '',
      });

      await base44.asServiceRole.entities.AuditEvent.create({
        tenant_id: auth.tenant_id,
        actor: user.email,
        actor_name: user.full_name || user.email,
        timestamp: nowIso(),
        action: 'client_authorization_granted',
        object_type: 'client_authorization',
        object_id: auth.id,
        case_id,
        description: `Authorization requested by ${user.email} for case ${case_id} (scopes: ${scopes.join(', ')})`,
        metadata: { scopes, expires_at: expires_at || null },
        source: 'user',
      });

      return Response.json({ success: true, authorization: auth });
    }

    // ── VERIFY (staff activate a PENDING authorization) ──
    if (action === 'verify') {
      if (!isStaffUser(user)) {
        return Response.json({ error: 'Forbidden: SafeNestT staff only' }, { status: 403 });
      }
      const { authorization_id } = body;
      if (!authorization_id) return Response.json({ error: 'authorization_id required' }, { status: 400 });
      const auth = await base44.asServiceRole.entities.ClientAuthorization.get(authorization_id);
      if (!auth) return Response.json({ error: 'Authorization not found' }, { status: 404 });
      if (auth.status !== 'PENDING') {
        return Response.json({ error: `Authorization is ${auth.status}, cannot verify` }, { status: 409 });
      }

      const tenantId = userTenantId(user) || auth.tenant_id || 'safenestt';
      const updated = await base44.asServiceRole.entities.ClientAuthorization.update(authorization_id, {
        status: 'ACTIVE',
        verified_at: nowIso(),
        verified_by: user.id,
        verified_by_email: user.email,
        tenant_id: tenantId,
      });

      await base44.asServiceRole.entities.AuditEvent.create({
        tenant_id: tenantId,
        actor: user.email,
        actor_name: user.full_name || user.email,
        timestamp: nowIso(),
        action: 'client_authorization_verified',
        object_type: 'client_authorization',
        object_id: authorization_id,
        case_id: auth.case_id,
        description: `Authorization ${authorization_id} activated by ${user.email}`,
        metadata: { client_user_id: auth.client_user_id },
        source: 'user',
      });

      return Response.json({ success: true, authorization: updated });
    }

    // ── REVOKE (client or admin revokes) ──
    if (action === 'revoke') {
      const { authorization_id } = body;
      if (!authorization_id) return Response.json({ error: 'authorization_id required' }, { status: 400 });
      const auth = await base44.asServiceRole.entities.ClientAuthorization.get(authorization_id);
      if (!auth) return Response.json({ error: 'Authorization not found' }, { status: 404 });
      const isAdmin = user.role === 'admin';
      const isOwner = auth.client_user_id === user.id;
      if (!isAdmin && !isOwner) {
        return Response.json({ error: 'Forbidden: only the client or an admin may revoke' }, { status: 403 });
      }
      if (auth.status === 'REVOKED') {
        return Response.json({ error: 'Authorization already revoked' }, { status: 409 });
      }

      const updated = await base44.asServiceRole.entities.ClientAuthorization.update(authorization_id, {
        status: 'REVOKED',
        revoked_at: nowIso(),
        revoked_by: user.id,
        revoked_by_email: user.email,
      });

      await base44.asServiceRole.entities.AuditEvent.create({
        tenant_id: auth.tenant_id,
        actor: user.email,
        actor_name: user.full_name || user.email,
        timestamp: nowIso(),
        action: 'client_authorization_revoked',
        object_type: 'client_authorization',
        object_id: authorization_id,
        case_id: auth.case_id,
        description: `Authorization ${authorization_id} revoked by ${user.email}`,
        metadata: { client_user_id: auth.client_user_id },
        source: 'user',
      });

      return Response.json({ success: true, authorization: updated });
    }

    // ── CHECK (server-side authorization verification) ──
    if (action === 'check') {
      const { case_id, client_user_id, scope } = body;
      if (!case_id || !scope) return Response.json({ error: 'case_id and scope required' }, { status: 400 });
      const filter = { case_id, status: 'ACTIVE' };
      if (client_user_id) filter.client_user_id = client_user_id;
      const auths = await base44.asServiceRole.entities.ClientAuthorization.filter(filter);
      await expireStale(base44, auths);
      const active = auths.find((a) => a.scopes.includes(scope) && !isExpired(a));
      return Response.json({
        authorized: !!active,
        authorization: active || null,
        reason: active ? 'ACTIVE' : (auths.length ? 'scope_not_included_or_expired' : 'no_active_authorization'),
      });
    }

    // ── FILE ON BEHALF (staff file for an authorized client) ──
    if (action === 'file_on_behalf') {
      if (!isStaffUser(user)) {
        return Response.json({ error: 'Forbidden: SafeNestT staff only' }, { status: 403 });
      }
      const { case_id, client_user_id, scope, filing_type, recipient, submission_reference, notes, document_url } = body;
      if (!case_id || !client_user_id || !scope) {
        return Response.json({ error: 'case_id, client_user_id, and scope are required' }, { status: 400 });
      }
      if (!FILING_SCOPES.includes(scope)) {
        return Response.json({ error: 'Scope does not permit a filing action: ' + scope }, { status: 400 });
      }

      // 3. target case exists
      let caseRecord = null;
      try {
        caseRecord = await base44.asServiceRole.entities.MyCase.get(case_id);
      } catch (e) { /* not found */ }
      if (!caseRecord) {
        return Response.json({ error: 'Target case not found' }, { status: 404 });
      }

      // 4 & 6. active authorization for this client + case + scope
      const auths = await base44.asServiceRole.entities.ClientAuthorization.filter({
        case_id,
        client_user_id,
        status: 'ACTIVE',
      });
      await expireStale(base44, auths);
      const active = auths.find((a) => a.scopes.includes(scope) && !isExpired(a));
      if (!active) {
        return Response.json({ error: 'No ACTIVE authorization for this client, case, and scope' }, { status: 403 });
      }

      // 7. tenant / organization isolation
      const callerTenant = userTenantId(user);
      if (user.role !== 'admin' && active.tenant_id && active.tenant_id !== callerTenant) {
        return Response.json({ error: 'Forbidden: tenant/organization isolation violated' }, { status: 403 });
      }

      // create the auditable filing record (authoritative, after full verification)
      const filing = await base44.asServiceRole.entities.ClientFiling.create({
        tenant_id: active.tenant_id,
        authorization_id: active.id,
        client_user_id,
        client_email: active.client_email,
        client_name: active.client_name,
        case_id,
        case_title: active.case_title || caseRecord.case_number || case_id,
        scope_used: scope,
        filing_type: filing_type || scope,
        recipient: recipient || '',
        submission_reference: submission_reference || '',
        status: submission_reference ? 'submitted' : 'pending',
        filed_by: user.id,
        filed_by_email: user.email,
        filed_by_name: user.full_name || user.email,
        filed_at: nowIso(),
        on_behalf_of: true,
        notes: notes || '',
        document_url: document_url || '',
      });

      // immutable audit record
      await base44.asServiceRole.entities.AuditEvent.create({
        tenant_id: active.tenant_id,
        actor: user.email,
        actor_name: user.full_name || user.email,
        timestamp: nowIso(),
        action: 'file_on_behalf_of_client',
        object_type: 'client_filing',
        object_id: filing.id,
        case_id,
        description: `${user.email} filed ${filing_type || scope} ON BEHALF OF client ${active.client_email} (recipient: ${recipient || 'N/A'}, ref: ${submission_reference || 'N/A'})`,
        metadata: {
          authorization_id: active.id,
          scope,
          client_user_id,
          recipient,
          submission_reference,
        },
        source: 'user',
      });

      return Response.json({ success: true, filing, authorized: true, authorization: active });
    }

    // ── LIST (authorizations: staff all / by case; client own) ──
    if (action === 'list') {
      const { case_id } = body;
      let auths;
      if (isStaffUser(user)) {
        if (case_id) {
          auths = await base44.asServiceRole.entities.ClientAuthorization.filter({ case_id }, '-granted_at', 200);
        } else if (user.role === 'admin') {
          auths = await base44.asServiceRole.entities.ClientAuthorization.list('-granted_at', 500);
        } else {
          // Non-admin staff: scope to their own tenant (tenant isolation).
          const tId = userTenantId(user);
          auths = tId
            ? await base44.asServiceRole.entities.ClientAuthorization.filter({ tenant_id: tId }, '-granted_at', 500)
            : [];
        }
      } else {
        auths = await base44.entities.ClientAuthorization.filter({ client_user_id: user.id }, '-granted_at', 200);
      }
      await expireStale(base44, auths);
      return Response.json({ success: true, authorizations: auths, isStaff: isStaffUser(user) });
    }

    // ── LIST FILINGS ──
    if (action === 'list_filings') {
      const { case_id } = body;
      let filings;
      if (isStaffUser(user)) {
        if (case_id) {
          filings = await base44.asServiceRole.entities.ClientFiling.filter({ case_id }, '-filed_at', 200);
        } else if (user.role === 'admin') {
          filings = await base44.asServiceRole.entities.ClientFiling.list('-filed_at', 500);
        } else {
          const tId = userTenantId(user);
          filings = tId
            ? await base44.asServiceRole.entities.ClientFiling.filter({ tenant_id: tId }, '-filed_at', 500)
            : [];
        }
      } else {
        filings = await base44.entities.ClientFiling.filter({ client_user_id: user.id }, '-filed_at', 200);
      }
      return Response.json({ success: true, filings, isStaff: isStaffUser(user) });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
}