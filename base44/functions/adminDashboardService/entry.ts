import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && !user.is_admin)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (endpoint === 'get-stats') {
      const users = await base44.asServiceRole.entities.User.list();
      const invites = await base44.asServiceRole.functions.invoke('inviteService', {
        endpoint: 'list-all'
      });
      const alerts = await base44.asServiceRole.entities.Alert.filter({ severity: 'critical' });

      return Response.json({
        success: true,
        total_users: users.length,
        pending_approvals: users.filter(u => u.account_status === 'pending_approval').length,
        active_users: users.filter(u => u.account_status === 'active').length,
        active_invites: invites.data?.invitations?.filter(i => i.status === 'active').length || 0,
        critical_alerts: alerts.length,
        specialists: [],
        kpis: {}
      });
    }

    return Response.json({ error: 'Invalid endpoint' }, { status: 400 });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});