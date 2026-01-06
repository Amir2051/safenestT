import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const authUser = await base44.auth.me();

    if (!authUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { target_user_id, updates } = await req.json();

    if (!updates || typeof updates !== 'object') {
        return Response.json({ error: 'Missing updates object' }, { status: 400 });
    }

    let userIdToUpdate = authUser.id;

    // Admin Override Logic
    if (target_user_id && target_user_id !== authUser.id) {
        if (authUser.role !== 'admin' && !authUser.is_admin) {
            return Response.json({ error: 'Unauthorized to update other users' }, { status: 403 });
        }
        userIdToUpdate = target_user_id;
    }

    // Filter allowed fields to prevent overwriting critical system fields
    const allowedFields = [
        'full_name', 'username', 'phone', 'country', 'wallet_address', 
        'profile_image', 'monitored_emails', 'vpn_enabled', 'two_factor_enabled',
        'address', 'city', 'state', 'zip_code', 'onboarding_checklist', 'onboarding_completed',
        'employee_id', 'job_title', 'risk_score', 'last_check_in', 'check_in_streak'
    ];

    const cleanUpdates = {};
    Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
            cleanUpdates[key] = updates[key];
        }
    });

    if (Object.keys(cleanUpdates).length === 0) {
        return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // FORCE DB WRITE using Service Role
    const result = await base44.asServiceRole.entities.User.update(userIdToUpdate, cleanUpdates);

    // Logging
    console.log(`User ${userIdToUpdate} updated by ${authUser.email}. Fields: ${Object.keys(cleanUpdates).join(', ')}`);

    return Response.json({ 
        success: true, 
        user: result,
        message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});