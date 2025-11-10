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
  
  // Child under 13
  return {
    can_view_alerts: false,
    can_access_shared_vault: false,
    can_invite_members: false,
    can_modify_settings: false,
    requires_parent_approval: true
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { endpoint, ...params } = body;
    
    if (!endpoint) {
      return Response.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }
    
    console.log('Family service request:', { endpoint });
    
    // POST /family/create-group - Create family group
    if (endpoint === 'create-group') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { group_name, max_members } = params;
        
        if (!group_name) {
          return Response.json({ error: 'Group name required' }, { status: 400 });
        }
        
        // Check if user already has a family group
        const existingGroups = await base44.entities.FamilyGroup.filter({
          primary_account_holder: user.email
        });
        
        if (existingGroups.length > 0) {
          return Response.json({ 
            error: 'You already have a family group',
            group_id: existingGroups[0].group_id
          }, { status: 400 });
        }
        
        const groupId = `FAMILY_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const trialEnds = new Date();
        trialEnds.setDate(trialEnds.getDate() + 30); // 30-day trial
        
        // Create family group
        const group = await base44.entities.FamilyGroup.create({
          group_id: groupId,
          group_name,
          primary_account_holder: user.email,
          subscription_plan: 'family_basic',
          max_members: max_members || 5,
          current_members_count: 1,
          created_date: new Date().toISOString(),
          payment_status: 'trial',
          trial_ends: trialEnds.toISOString(),
          shared_vault_enabled: true,
          parental_controls_enabled: false
        });
        
        // Add primary account holder as member
        await base44.entities.FamilyMember.create({
          group_id: groupId,
          member_email: user.email,
          member_name: user.full_name,
          member_role: 'parent',
          age_category: 'adult',
          status: 'active',
          joined_date: new Date().toISOString(),
          invited_by: user.email,
          permissions: getDefaultPermissions('parent', 'adult'),
          security_stats: {
            risk_score: user.risk_score || 100,
            alerts_count: 0,
            last_activity: new Date().toISOString()
          }
        });
        
        // Update user with family group
        await base44.auth.updateMe({
          family_group_id: groupId,
          is_family_admin: true
        });
        
        return Response.json({
          success: true,
          group_id: groupId,
          group,
          message: 'Family group created successfully!'
        });
      } catch (error) {
        console.error('Create group error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // POST /family/invite-member - Invite family member
    if (endpoint === 'invite-member') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { group_id, invitee_email, invitee_name, member_role, age_category, message } = params;
        
        if (!group_id || !invitee_email || !invitee_name || !member_role) {
          return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }
        
        // Verify user has permission to invite
        const groups = await base44.entities.FamilyGroup.filter({ group_id });
        if (groups.length === 0) {
          return Response.json({ error: 'Family group not found' }, { status: 404 });
        }
        
        const group = groups[0];
        
        // Check member limit
        if (group.current_members_count >= group.max_members) {
          return Response.json({ 
            error: `Family group limit reached (${group.max_members} members max)` 
          }, { status: 400 });
        }
        
        // Check if member already exists
        const existingMembers = await base44.entities.FamilyMember.filter({
          group_id,
          member_email: invitee_email
        });
        
        if (existingMembers.length > 0) {
          return Response.json({ error: 'Member already in family group' }, { status: 400 });
        }
        
        // Check for pending invitation
        const pendingInvitations = await base44.entities.FamilyInvitation.filter({
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
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
        
        // Create invitation
        const invitation = await base44.entities.FamilyInvitation.create({
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
        
        // Send invitation email
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
      } catch (error) {
        console.error('Invite member error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // POST /family/accept-invitation - Accept family invitation
    if (endpoint === 'accept-invitation') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { invitation_token } = params;
        
        if (!invitation_token) {
          return Response.json({ error: 'Invitation token required' }, { status: 400 });
        }
        
        // Find invitation
        const invitations = await base44.entities.FamilyInvitation.filter({
          invitation_token,
          status: 'pending'
        });
        
        if (invitations.length === 0) {
          return Response.json({ 
            error: 'Invalid or expired invitation' 
          }, { status: 404 });
        }
        
        const invitation = invitations[0];
        
        // Check if invitation expired
        if (new Date(invitation.expires_at) < new Date()) {
          await base44.entities.FamilyInvitation.update(invitation.id, {
            status: 'expired'
          });
          return Response.json({ error: 'Invitation has expired' }, { status: 400 });
        }
        
        // Check if invitee email matches
        if (invitation.invitee_email !== user.email) {
          return Response.json({ 
            error: 'This invitation is for a different email address' 
          }, { status: 403 });
        }
        
        // Check if already member of a group
        const existingMemberships = await base44.entities.FamilyMember.filter({
          member_email: user.email,
          status: 'active'
        });
        
        if (existingMemberships.length > 0) {
          return Response.json({ 
            error: 'You are already a member of another family group' 
          }, { status: 400 });
        }
        
        // Get group
        const groups = await base44.asServiceRole.entities.FamilyGroup.filter({
          group_id: invitation.group_id
        });
        
        if (groups.length === 0) {
          return Response.json({ error: 'Family group not found' }, { status: 404 });
        }
        
        const group = groups[0];
        
        // Add member to group
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
        
        // Update invitation status
        await base44.entities.FamilyInvitation.update(invitation.id, {
          status: 'accepted',
          accepted_date: new Date().toISOString()
        });
        
        // Update group member count
        await base44.asServiceRole.entities.FamilyGroup.update(group.id, {
          current_members_count: group.current_members_count + 1
        });
        
        // Update user
        await base44.auth.updateMe({
          family_group_id: invitation.group_id,
          is_family_admin: false
        });
        
        // Notify primary account holder
        try {
          await base44.integrations.Core.SendEmail({
            to: group.primary_account_holder,
            subject: `✅ ${invitation.invitee_name} accepted your family invitation!`,
            body: `
              <h2>Family Member Joined!</h2>
              <p><strong>${invitation.invitee_name}</strong> has accepted your invitation and joined <strong>${group.group_name}</strong>.</p>
              <p>They now have access to:</p>
              <ul>
                <li>Family breach alerts</li>
                <li>${invitation.permissions?.can_access_shared_vault ? 'Shared password vault' : 'Individual security monitoring'}</li>
                <li>Real-time security updates</li>
              </ul>
              <p><a href="${req.headers.get('origin') || 'https://app.base44.com'}/family">Manage Family</a></p>
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
      } catch (error) {
        console.error('Accept invitation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // GET /family/my-group - Get user's family group
    if (endpoint === 'my-group') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Check if user is member of any group
        const memberships = await base44.entities.FamilyMember.filter({
          member_email: user.email,
          status: 'active'
        });
        
        if (memberships.length === 0) {
          return Response.json({ 
            has_group: false 
          });
        }
        
        const membership = memberships[0];
        
        // Get group details
        const groups = await base44.entities.FamilyGroup.filter({
          group_id: membership.group_id
        });
        
        if (groups.length === 0) {
          return Response.json({ error: 'Group not found' }, { status: 404 });
        }
        
        const group = groups[0];
        
        // Get all members
        const members = await base44.entities.FamilyMember.filter({
          group_id: membership.group_id,
          status: 'active'
        });
        
        // Get pending invitations
        const invitations = await base44.entities.FamilyInvitation.filter({
          group_id: membership.group_id,
          status: 'pending'
        });
        
        // Get family alerts
        const alerts = await base44.entities.FamilyAlert.filter({
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
      } catch (error) {
        console.error('Get my group error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // POST /family/remove-member - Remove family member
    if (endpoint === 'remove-member') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { group_id, member_email } = params;
        
        // Verify user is admin
        const groups = await base44.entities.FamilyGroup.filter({
          group_id,
          primary_account_holder: user.email
        });
        
        if (groups.length === 0) {
          return Response.json({ error: 'Not authorized' }, { status: 403 });
        }
        
        const group = groups[0];
        
        // Cannot remove self
        if (member_email === user.email) {
          return Response.json({ error: 'Cannot remove yourself' }, { status: 400 });
        }
        
        // Find member
        const members = await base44.entities.FamilyMember.filter({
          group_id,
          member_email,
          status: 'active'
        });
        
        if (members.length === 0) {
          return Response.json({ error: 'Member not found' }, { status: 404 });
        }
        
        // Update member status
        await base44.entities.FamilyMember.update(members[0].id, {
          status: 'removed'
        });
        
        // Update group count
        await base44.entities.FamilyGroup.update(group.id, {
          current_members_count: group.current_members_count - 1
        });
        
        return Response.json({
          success: true,
          message: 'Member removed successfully'
        });
      } catch (error) {
        console.error('Remove member error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // POST /family/update-member-permissions - Update member permissions
    if (endpoint === 'update-permissions') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { group_id, member_email, permissions, monitored_settings } = params;
        
        // Verify user is admin
        const groups = await base44.entities.FamilyGroup.filter({
          group_id,
          primary_account_holder: user.email
        });
        
        if (groups.length === 0) {
          return Response.json({ error: 'Not authorized' }, { status: 403 });
        }
        
        // Find member
        const members = await base44.entities.FamilyMember.filter({
          group_id,
          member_email
        });
        
        if (members.length === 0) {
          return Response.json({ error: 'Member not found' }, { status: 404 });
        }
        
        const updateData = {};
        if (permissions) updateData.permissions = permissions;
        if (monitored_settings) updateData.monitored_settings = monitored_settings;
        
        await base44.entities.FamilyMember.update(members[0].id, updateData);
        
        return Response.json({
          success: true,
          message: 'Permissions updated successfully'
        });
      } catch (error) {
        console.error('Update permissions error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    return Response.json({ error: 'Unknown endpoint: ' + endpoint }, { status: 404 });
    
  } catch (error) {
    console.error('Family service error:', error);
    return Response.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
});