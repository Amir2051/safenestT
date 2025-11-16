import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

    const body = await req.json();
    const { endpoint, user_id, reason } = body;

    if (endpoint === 'list-users') {
      const users = await base44.asServiceRole.entities.User.list('-created_date');
      return Response.json({ 
        success: true,
        users: users 
      });
    }

    if (endpoint === 'approve-user') {
      if (!user_id) {
        return Response.json({ error: 'user_id required' }, { status: 400 });
      }

      const targetUser = await base44.asServiceRole.entities.User.get(user_id);
      
      await base44.asServiceRole.entities.User.update(user_id, {
        account_status: 'active',
        approved_by: user.email,
        approved_at: new Date().toISOString()
      });

      // Log admin action
      await base44.asServiceRole.entities.AdminAction.create({
        action_type: 'user_approved',
        admin_email: user.email,
        target_user: targetUser.email,
        target_resource: user_id,
        reason: reason || 'Manual approval by admin',
        details: {
          user_email: targetUser.email,
          approved_at: new Date().toISOString()
        }
      });

      // Create notification
      await base44.asServiceRole.entities.Alert.create({
        alert_type: 'permission',
        severity: 'low',
        title: '🎉 Account Approved!',
        message: 'Your SafeNestt account has been approved. Welcome aboard!',
        status: 'active',
        created_by: targetUser.email
      });

      return Response.json({ 
        success: true, 
        message: 'User approved',
        user_email: targetUser.email
      });
    }

    if (endpoint === 'reject-user') {
      if (!user_id) {
        return Response.json({ error: 'user_id required' }, { status: 400 });
      }

      const targetUser = await base44.asServiceRole.entities.User.get(user_id);
      
      await base44.asServiceRole.entities.User.update(user_id, {
        account_status: 'rejected',
        approved_by: user.email,
        approved_at: new Date().toISOString()
      });

      // Log admin action
      await base44.asServiceRole.entities.AdminAction.create({
        action_type: 'user_rejected',
        admin_email: user.email,
        target_user: targetUser.email,
        target_resource: user_id,
        reason: reason || 'Rejected by admin',
        details: {
          user_email: targetUser.email,
          rejected_at: new Date().toISOString(),
          reason: reason
        }
      });

      return Response.json({ 
        success: true, 
        message: 'User rejected',
        user_email: targetUser.email
      });
    }

    return Response.json({ error: 'Invalid endpoint' }, { status: 400 });

  } catch (error) {
    console.error('Admin user service error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});