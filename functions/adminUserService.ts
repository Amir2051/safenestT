import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();
    
    if (!adminUser || (adminUser.role !== 'admin' && !adminUser.is_admin)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { endpoint, user_id, user_ids, reason } = body;

    // List all users
    if (endpoint === 'list-users') {
      const users = await base44.asServiceRole.entities.User.list('-created_date', 10000);
      console.log(`✅ Admin fetched ${users.length} users`);
      return Response.json({ 
        success: true, 
        users: users 
      });
    }

    // Bulk approve users
    if (endpoint === 'bulk-approve-users') {
      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return Response.json({ error: 'user_ids array is required' }, { status: 400 });
      }

      const approvedUsers = [];
      const errors = [];

      for (const userId of user_ids) {
        try {
          const users = await base44.asServiceRole.entities.User.filter({ id: userId });
          if (!users || users.length === 0) {
            errors.push({ userId, error: 'User not found' });
            continue;
          }

          const targetUser = users[0];

          // Update user status
          await base44.asServiceRole.entities.User.update(userId, {
            account_status: 'active',
            approved_by: adminUser.email,
            approved_at: new Date().toISOString()
          });

          // Log admin action
          await base44.asServiceRole.entities.AdminAction.create({
            action_type: 'user_approved',
            admin_email: adminUser.email,
            target_user: targetUser.email,
            target_resource: userId,
            details: {
              reason: reason || 'Bulk approval',
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

          approvedUsers.push(targetUser.email);
        } catch (error) {
          errors.push({ userId, error: error.message });
        }
      }

      return Response.json({ 
        success: true, 
        approved: approvedUsers.length,
        approvedUsers: approvedUsers,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // Approve user
    if (endpoint === 'approve-user') {
      if (!user_id) {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }

      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (!users || users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const targetUser = users[0];

      const updateData = {
        account_status: 'active',
        approved_by: adminUser.email,
        approved_at: new Date().toISOString()
      };

      await base44.asServiceRole.entities.User.update(user_id, updateData);

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

    // Reject user
    if (endpoint === 'reject-user') {
      if (!user_id) {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }

      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (!users || users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const targetUser = users[0];

      const updateData = {
        account_status: 'rejected',
        approved_by: adminUser.email,
        approved_at: new Date().toISOString()
      };

      await base44.asServiceRole.entities.User.update(user_id, updateData);

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

    // Suspend user
    if (endpoint === 'suspend-user') {
      if (!user_id) {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }

      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (!users || users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const targetUser = users[0];

      await base44.asServiceRole.entities.User.update(user_id, {
        account_status: 'suspended',
        suspended_by: adminUser.email,
        suspended_at: new Date().toISOString()
      });

      await base44.asServiceRole.entities.AdminAction.create({
        action_type: 'user_suspended',
        admin_email: adminUser.email,
        target_user: targetUser.email,
        target_resource: user_id,
        details: {
          reason: reason || 'Suspended by admin',
          previous_status: targetUser.account_status,
          new_status: 'suspended'
        }
      });

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: targetUser.email,
          subject: 'SafeNestt Account Suspended',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #f97316;">Account Suspended</h1>
              <p>Hi ${targetUser.full_name || 'there'},</p>
              <p>Your SafeNestt account has been temporarily suspended.</p>
              ${reason ? `<p style="background: #fff7ed; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
              <p>If you believe this is a mistake, please contact our support team.</p>
              <p><strong>The SafeNestt Team</strong></p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
      }

      return Response.json({ 
        success: true, 
        message: 'User suspended',
        user_email: targetUser.email 
      });
    }

    // Reactivate user
    if (endpoint === 'reactivate-user') {
      if (!user_id) {
        return Response.json({ error: 'user_id is required' }, { status: 400 });
      }

      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (!users || users.length === 0) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }

      const targetUser = users[0];

      await base44.asServiceRole.entities.User.update(user_id, {
        account_status: 'active',
        reactivated_by: adminUser.email,
        reactivated_at: new Date().toISOString()
      });

      await base44.asServiceRole.entities.AdminAction.create({
        action_type: 'user_reactivated',
        admin_email: adminUser.email,
        target_user: targetUser.email,
        target_resource: user_id,
        details: {
          previous_status: targetUser.account_status,
          new_status: 'active'
        }
      });

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: targetUser.email,
          subject: '🎉 SafeNestt Account Reactivated',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #22c55e;">Account Reactivated!</h1>
              <p>Hi ${targetUser.full_name || 'there'},</p>
              <p>Great news! Your SafeNestt account has been reactivated.</p>
              <p>You can now log in and access all features again.</p>
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
        message: 'User reactivated',
        user_email: targetUser.email 
      });
    }

    // Add User (Create/Invite)
    if (endpoint === 'add-user') {
      const { email, password, full_name, role } = body;
      
      if (!email || !password) {
        return Response.json({ error: 'Email and password are required' }, { status: 400 });
      }

      // 1. Create User in Auth System
      // We use the admin API to create the user with a verified email
      const { data: newUser, error: createError } = await base44.asServiceRole.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name || '',
          role: role || 'user'
        }
      });

      if (createError) {
        return Response.json({ error: createError.message }, { status: 400 });
      }

      // 2. The User entity should be auto-created by triggers in many base44 setups, 
      // but if not, we might need to wait or it might be handled.
      // However, we can try to update it or ensure it exists if we have access.
      // For now, we assume auth creation is enough.

      // 3. Log Action
      await base44.asServiceRole.entities.AdminAction.create({
        action_type: 'user_created',
        admin_email: adminUser.email,
        target_user: email,
        target_resource: newUser.user.id,
        details: {
          role: role || 'user',
          full_name: full_name
        }
      });

      return Response.json({ success: true, user: newUser.user });
    }

    // Reset Password
    if (endpoint === 'reset-password') {
      const { user_id, new_password } = body;

      if (!user_id || !new_password) {
        return Response.json({ error: 'User ID and new password are required' }, { status: 400 });
      }

      // 1. Get user email for logging
      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      const targetEmail = users.length > 0 ? users[0].email : 'unknown';

      // 2. Update Password
      const { data: updatedUser, error: updateError } = await base44.asServiceRole.auth.admin.updateUserById(
        user_id,
        { password: new_password }
      );

      if (updateError) {
        return Response.json({ error: updateError.message }, { status: 400 });
      }

      // 3. Log Action
      await base44.asServiceRole.entities.AdminAction.create({
        action_type: 'password_reset',
        admin_email: adminUser.email,
        target_user: targetEmail,
        target_resource: user_id,
        details: {
          method: 'admin_manual_reset'
        }
      });

      // 4. Notify User
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: targetEmail,
          subject: 'Security Alert: Your Password Was Reset',
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #06b6d4;">Password Reset Notification</h1>
              <p>Your password was recently reset by an administrator.</p>
              <p>If you did not request this change, please contact support immediately.</p>
              <p>You can now log in with your new password.</p>
              <p><strong>The SafeNestt Team</strong></p>
            </div>
          `
        });
      } catch (e) {
        console.error("Failed to send reset notification", e);
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown endpoint' }, { status: 400 });

  } catch (error) {
    console.error('Admin user service error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});