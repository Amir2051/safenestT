import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();
    
    if (!adminUser || (adminUser.role !== 'admin' && !adminUser.is_admin)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { endpoint, user_id, reason } = body;

    // List all users
    if (endpoint === 'list-users') {
      const users = await base44.asServiceRole.entities.User.list('-created_date');
      return Response.json({ 
        success: true, 
        users: users 
      });
    }

    // Approve user - all fields are optional except account_status
    if (endpoint === 'approve-user') {
      if (!user_id) {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }

      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (!users || users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const targetUser = users[0];

      // Update user with flexible fields - only account_status is required
      const updateData = {
        account_status: 'active',
        approved_by: adminUser.email,
        approved_at: new Date().toISOString()
      };

      await base44.asServiceRole.entities.User.update(user_id, updateData);

      // Log admin action
      await base44.asServiceRole.entities.AdminAction.create({
        action_type: 'user_approved',
        admin_email: adminUser.email,
        target_user: targetUser.email,
        target_resource: user_id,
        details: {
          reason: reason || 'No reason provided',
          previous_status: targetUser.account_status,
          new_status: 'active'
        }
      });

      // Send approval email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: targetUser.email,
          subject: '🎉 Welcome to SafeNestt - Your Account is Approved!',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #06b6d4;">Welcome to SafeNestt!</h1>
              <p>Hi ${targetUser.full_name || 'there'},</p>
              <p>Great news! Your SafeNestt account has been approved by our team.</p>
              <p>You can now access all features and start protecting your digital life.</p>
              ${reason ? `<p style="background: #f0f9ff; padding: 15px; border-left: 4px solid #06b6d4; margin: 20px 0;"><strong>Admin Note:</strong> ${reason}</p>` : ''}
              <p>Get started by:</p>
              <ul>
                <li>Setting up your password vault</li>
                <li>Running your first security scan</li>
                <li>Enabling VPN protection</li>
              </ul>
              <p>If you have any questions, our support team is here to help.</p>
              <p>Stay safe!</p>
              <p><strong>The SafeNestt Team</strong></p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }

      return Response.json({ 
        success: true, 
        message: 'User approved successfully',
        user_email: targetUser.email 
      });
    }

    // Reject user - all fields are optional
    if (endpoint === 'reject-user') {
      if (!user_id) {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }

      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (!users || users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const targetUser = users[0];

      // Update user with flexible fields - only account_status is required
      const updateData = {
        account_status: 'rejected',
        approved_by: adminUser.email,
        approved_at: new Date().toISOString()
      };

      await base44.asServiceRole.entities.User.update(user_id, updateData);

      // Log admin action
      await base44.asServiceRole.entities.AdminAction.create({
        action_type: 'user_rejected',
        admin_email: adminUser.email,
        target_user: targetUser.email,
        target_resource: user_id,
        details: {
          reason: reason || 'No reason provided',
          previous_status: targetUser.account_status,
          new_status: 'rejected'
        }
      });

      // Send rejection email
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: targetUser.email,
          subject: 'SafeNestt Account Status Update',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #ef4444;">Account Application Update</h1>
              <p>Hi ${targetUser.full_name || 'there'},</p>
              <p>Thank you for your interest in SafeNestt.</p>
              <p>Unfortunately, we're unable to approve your account at this time.</p>
              ${reason ? `<p style="background: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
              <p>If you believe this is a mistake or have questions, please contact our support team.</p>
              <p><strong>The SafeNestt Team</strong></p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }

      return Response.json({ 
        success: true, 
        message: 'User rejected',
        user_email: targetUser.email 
      });
    }

    return Response.json({ error: 'Unknown endpoint' }, { status: 400 });

  } catch (error) {
    console.error('Admin user service error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});