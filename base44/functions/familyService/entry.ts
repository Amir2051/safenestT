import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Generate secure invitation token
async function generateInvitationToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Calculate default permissions based on role and age
function getDefaultPermissions(role, ageCategory) {
  if (role === 'parent' || role === 'guardian') {
    return {
      can_view_alerts: true,
      can_access_shared_vault: true,
      can_invite_members: true,
      can_modify_settings: true,
      requires_parent_approval: false
    };
  }
  
  if (role === 'teen' || ageCategory === 'teen_13_17') {
    return {
      can_view_alerts: true,
      can_access_shared_vault: false,
      can_invite_members: false,
      can_modify_settings: false,
      requires_parent_approval: true
    };
  }
  
  return {
    can_view_alerts: false,
    can_access_shared_vault: false,
    can_invite_members: false,
    can_modify_settings: false,
    requires_parent_approval: true
  };
}

Deno.serve(async (req) => {
  console.log('=== Family Service Request ===');
  
  try {
    const base44 = createClientFromRequest(req);
    
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { endpoint, ...params } = body;
    
    if (!endpoint) {
      return Response.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }
    
    console.log('Endpoint:', endpoint);
    console.log('Params:', JSON.stringify(params));
    
    // POST /family/create-group - Create family group
    if (endpoint === 'create-group') {
      console.log('=== CREATE GROUP ENDPOINT ===');
      
      const user = await base44.auth.me();
      
      if (!user) {
        console.error('Authentication failed - no user');
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      console.log('✅ User authenticated:', user.email);
      
      const { group_name, max_members } = params;
      
      if (!group_name) {
        console.error('Missing group_name');
        return Response.json({ error: 'Group name required' }, { status: 400 });
      }
      
      console.log('Step 1: Checking existing memberships...');
      
      const existingMemberships = await base44.entities.FamilyMember.filter({
        member_email: user.email,
        status: 'active'
      });
      
      console.log('Existing memberships:', existingMemberships.length);
      
      if (existingMemberships.length > 0) {
        console.error('User already has a family group');
        return Response.json({ 
          error: 'You are already a member of a family group',
          group_id: existingMemberships[0].group_id
        }, { status: 400 });
      }
      
      const groupId = `FAMILY_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + 30);
      
      console.log('Step 2: Creating family group...');
      console.log('Group ID:', groupId);
      console.log('Group Name:', group_name);
      console.log('Primary Holder:', user.email);
      
      const groupData = {
        group_id: groupId,
        group_name,
        primary_account_holder: user.email,
        subscription_plan: 'family_basic',
        max_members: max_members || 5,
        current_members_count: 1,
        payment_status: 'trial',
        trial_ends: trialEnds.toISOString(),
        shared_vault_enabled: true,
        parental_controls_enabled: false,
        require_approval_for_children: true,
        monitor_child_activity: true,
        shared_breach_alerts: true,
        allow_vault_sharing: true,
        total_alerts: 0,
        resolved_alerts: 0,
        total_threats_blocked: 0
      };
      
      console.log('Creating group with data:', JSON.stringify(groupData, null, 2));
      
      let group;
      try {
        group = await base44.entities.FamilyGroup.create(groupData);
        console.log('✅ Family group created:', group.id);
      } catch (createError) {
        console.error('❌ Failed to create FamilyGroup entity');
        console.error('Error name:', createError.name);
        console.error('Error message:', createError.message);
        console.error('Error stack:', createError.stack);
        throw new Error(`Database error: ${createError.message}`);
      }
      
      console.log('Step 3: Adding primary member...');
      
      const memberData = {
        group_id: groupId,
        member_email: user.email,
        member_name: user.full_name || 'User',
        member_role: 'parent',
        age_category: 'adult',
        status: 'active',
        joined_date: new Date().toISOString(),
        invited_by: user.email,
        permissions: getDefaultPermissions('parent', 'adult'),
        monitored_settings: {
          monitor_web_activity: false,
          monitor_app_usage: false,
          block_inappropriate_content: false,
          screen_time_limit_minutes: 0,
          bedtime_mode_enabled: false
        },
        security_stats: {
          risk_score: user.risk_score || 100,
          alerts_count: 0,
          last_activity: new Date().toISOString()
        }
      };
      
      console.log('Creating member with data:', JSON.stringify(memberData, null, 2));
      
      try {
        await base44.entities.FamilyMember.create(memberData);
        console.log('✅ Primary member added');
      } catch (memberError) {
        console.error('❌ Failed to create FamilyMember');
        console.error('Error:', memberError.message);
        
        try {
          await base44.asServiceRole.entities.FamilyGroup.delete(group.id);
          console.log('Cleaned up orphaned group');
        } catch (cleanupError) {
          console.error('Failed to cleanup group:', cleanupError);
        }
        
        throw new Error(`Failed to add member: ${memberError.message}`);
      }
      
      console.log('Step 4: Updating user profile...');
      
      try {
        await base44.auth.updateMe({
          family_group_id: groupId,
          is_family_admin: true
        });
        console.log('✅ User profile updated');
      } catch (updateError) {
        console.error('❌ Failed to update user:', updateError.message);
      }
      
      console.log('=== SUCCESS ===');
      
      return Response.json({
        success: true,
        group_id: groupId,
        group,
        message: 'Family group created successfully!'
      });
    }
    
    // GET /family/my-group - Get user's family group
    if (endpoint === 'my-group') {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const memberships = await base44.entities.FamilyMember.filter({
        member_email: user.email,
        status: 'active'
      });
      
      if (memberships.length === 0) {
        return Response.json({ has_group: false });
      }
      
      const membership = memberships[0];
      
      const groups = await base44.asServiceRole.entities.FamilyGroup.filter({
        group_id: membership.group_id
      });
      
      if (groups.length === 0) {
        return Response.json({ error: 'Group not found' }, { status: 404 });
      }
      
      const group = groups[0];
      const members = await base44.asServiceRole.entities.FamilyMember.filter({
        group_id: membership.group_id,
        status: 'active'
      });
      
      const invitations = await base44.asServiceRole.entities.FamilyInvitation.filter({
        group_id: membership.group_id,
        status: 'pending'
      });
      
      const alerts = await base44.asServiceRole.entities.FamilyAlert.filter({
        group_id: membership.group_id,
        status: 'active'
      }, '-created_date', 10);
      
      return Response.json({
        has_group: true,
        group,
        my_membership: membership,
        is_admin: group.primary_account_holder === user.email,
        members,
        pending_invitations: invitations,
        recent_alerts: alerts
      });
    }
    
    // POST /family/invite-member
    if (endpoint === 'invite-member') {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const { group_id, invitee_email, invitee_name, member_role, age_category, message } = params;
      
      if (!group_id || !invitee_email || !invitee_name || !member_role) {
        return Response.json({ error: 'Missing required fields' }, { status: 400 });
      }
      
      const groups = await base44.asServiceRole.entities.FamilyGroup.filter({ group_id });
      if (groups.length === 0) {
        return Response.json({ error: 'Family group not found' }, { status: 404 });
      }
      
      const group = groups[0];
      
      if (group.current_members_count >= group.max_members) {
        return Response.json({ 
          error: `Family group limit reached (${group.max_members} members max)` 
        }, { status: 400 });
      }
      
      const existingMembers = await base44.asServiceRole.entities.FamilyMember.filter({
        group_id,
        member_email: invitee_email
      });
      
      if (existingMembers.length > 0) {
        return Response.json({ error: 'Member already in family group' }, { status: 400 });
      }
      
      const pendingInvitations = await base44.asServiceRole.entities.FamilyInvitation.filter({
        group_id,
        invitee_email: invitee_email,
        status: 'pending'
      });
      
      if (pendingInvitations.length > 0) {
        return Response.json({ error: 'Invitation already sent' }, { status: 400 });
      }
      
      const invitationId = `INV_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const token = await generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      await base44.entities.FamilyInvitation.create({
        invitation_id: invitationId,
        group_id,
        invited_by_email: user.email,
        invited_by_name: user.full_name,
        invitee_email,
        invitee_name,
        member_role,
        age_category: age_category || 'adult',
        status: 'pending',
        created_date: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        invitation_token: token,
        permissions: getDefaultPermissions(member_role, age_category),
        message: message || ''
      });
      
      const appUrl = req.headers.get('origin') || 'https://app.base44.com';
      const invitationLink = `${appUrl}/family-invite?token=${token}`;
      
      try {
        await base44.integrations.Core.SendEmail({
          to: invitee_email,
          subject: `🏠 ${user.full_name} invited you to join their SafeNest Family!`,
          body: `
            <h2>You've Been Invited to Join SafeNest Family Protection!</h2>
            <p><strong>${user.full_name}</strong> has invited you to join their <strong>${group.group_name}</strong> family group on SafeNest.</p>
            
            <h3>What You'll Get:</h3>
            <ul>
              <li>🛡️ Shared family security monitoring</li>
              <li>🔒 Access to family password vault</li>
              <li>📊 Real-time breach alerts</li>
              <li>🤝 Collaborative protection</li>
            </ul>
            
            ${message ? `<p><strong>Personal Message:</strong><br>${message}</p>` : ''}
            
            <p><a href="${invitationLink}" style="display: inline-block; background: linear-gradient(to right, #06b6d4, #3b82f6); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Accept Invitation</a></p>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              This invitation expires on ${expiresAt.toLocaleDateString()}.<br>
              If you don't have a SafeNest account, you'll be prompted to create one.
            </p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
      }
      
      return Response.json({
        success: true,
        invitation_id: invitationId,
        invitation_link: invitationLink,
        message: 'Invitation sent successfully!'
      });
    }
    
    // POST /family/accept-invitation
    if (endpoint === 'accept-invitation') {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const { invitation_token } = params;
      
      if (!invitation_token) {
        return Response.json({ error: 'Invitation token required' }, { status: 400 });
      }
      
      const invitations = await base44.asServiceRole.entities.FamilyInvitation.filter({
        invitation_token,
        status: 'pending'
      });
      
      if (invitations.length === 0) {
        return Response.json({ error: 'Invalid or expired invitation' }, { status: 404 });
      }
      
      const invitation = invitations[0];
      
      if (new Date(invitation.expires_at) < new Date()) {
        await base44.asServiceRole.entities.FamilyInvitation.update(invitation.id, {
          status: 'expired'
        });
        return Response.json({ error: 'Invitation has expired' }, { status: 400 });
      }
      
      if (invitation.invitee_email !== user.email) {
        return Response.json({ 
          error: 'This invitation is for a different email address' 
        }, { status: 403 });
      }
      
      const existingMemberships = await base44.entities.FamilyMember.filter({
        member_email: user.email,
        status: 'active'
      });
      
      if (existingMemberships.length > 0) {
        return Response.json({ 
          error: 'You are already a member of another family group' 
        }, { status: 400 });
      }
      
      const groups = await base44.asServiceRole.entities.FamilyGroup.filter({
        group_id: invitation.group_id
      });
      
      if (groups.length === 0) {
        return Response.json({ error: 'Family group not found' }, { status: 404 });
      }
      
      const group = groups[0];
      
      await base44.entities.FamilyMember.create({
        group_id: invitation.group_id,
        member_email: user.email,
        member_name: invitation.invitee_name,
        member_role: invitation.member_role,
        age_category: invitation.age_category,
        status: 'active',
        joined_date: new Date().toISOString(),
        invited_by: invitation.invited_by_email,
        permissions: invitation.permissions || getDefaultPermissions(invitation.member_role, invitation.age_category),
        security_stats: {
          risk_score: user.risk_score || 100,
          alerts_count: 0,
          last_activity: new Date().toISOString()
        }
      });
      
      await base44.asServiceRole.entities.FamilyInvitation.update(invitation.id, {
        status: 'accepted',
        accepted_date: new Date().toISOString()
      });
      
      await base44.asServiceRole.entities.FamilyGroup.update(group.id, {
        current_members_count: group.current_members_count + 1
      });
      
      await base44.auth.updateMe({
        family_group_id: invitation.group_id,
        is_family_admin: false
      });
      
      try {
        await base44.integrations.Core.SendEmail({
          to: group.primary_account_holder,
          subject: `✅ ${invitation.invitee_name} accepted your family invitation!`,
          body: `
            <h2>Family Member Joined!</h2>
            <p><strong>${invitation.invitee_name}</strong> has accepted your invitation and joined <strong>${group.group_name}</strong>.</p>
            <p>They now have access to family security monitoring and alerts.</p>
            <p><a href="${req.headers.get('origin') || 'https://app.base44.com'}/family-protection">Manage Family</a></p>
          `
        });
      } catch (emailError) {
        console.error('Failed to send acceptance notification:', emailError);
      }
      
      return Response.json({
        success: true,
        group_id: invitation.group_id,
        group_name: group.group_name,
        role: invitation.member_role,
        message: `Welcome to ${group.group_name}!`
      });
    }
    
    // POST /family/remove-member
    if (endpoint === 'remove-member') {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const { group_id, member_email } = params;
      
      const groups = await base44.asServiceRole.entities.FamilyGroup.filter({
        group_id,
        primary_account_holder: user.email
      });
      
      if (groups.length === 0) {
        return Response.json({ error: 'Not authorized' }, { status: 403 });
      }
      
      const group = groups[0];
      
      if (member_email === user.email) {
        return Response.json({ error: 'Cannot remove yourself' }, { status: 400 });
      }
      
      const members = await base44.asServiceRole.entities.FamilyMember.filter({
        group_id,
        member_email,
        status: 'active'
      });
      
      if (members.length === 0) {
        return Response.json({ error: 'Member not found' }, { status: 404 });
      }
      
      await base44.asServiceRole.entities.FamilyMember.update(members[0].id, {
        status: 'removed'
      });
      
      await base44.asServiceRole.entities.FamilyGroup.update(group.id, {
        current_members_count: group.current_members_count - 1
      });
      
      return Response.json({
        success: true,
        message: 'Member removed successfully'
      });
    }
    
    // POST /family/update-permissions
    if (endpoint === 'update-permissions') {
      const user = await base44.auth.me();
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const { group_id, member_email, permissions, monitored_settings } = params;
      
      const groups = await base44.asServiceRole.entities.FamilyGroup.filter({
        group_id,
        primary_account_holder: user.email
      });
      
      if (groups.length === 0) {
        return Response.json({ error: 'Not authorized' }, { status: 403 });
      }
      
      const members = await base44.asServiceRole.entities.FamilyMember.filter({
        group_id,
        member_email
      });
      
      if (members.length === 0) {
        return Response.json({ error: 'Member not found' }, { status: 404 });
      }
      
      const updateData = {};
      if (permissions) updateData.permissions = permissions;
      if (monitored_settings) updateData.monitored_settings = monitored_settings;
      
      await base44.asServiceRole.entities.FamilyMember.update(members[0].id, updateData);
      
      return Response.json({
        success: true,
        message: 'Permissions updated successfully'
      });
    }
    
    return Response.json({ error: 'Unknown endpoint: ' + endpoint }, { status: 404 });
    
  } catch (error) {
    console.error('=== FAMILY SERVICE TOP-LEVEL ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return Response.json({ 
      error: error.message || 'Internal server error',
      type: error.name,
      stack: error.stack 
    }, { status: 500 });
  }
});