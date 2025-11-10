import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { endpoint, ...params } = await req.json();

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // POST /vault/setup
    if (endpoint === 'setup') {
      const { vault_salt, vault_pin_hash, biometric_enabled, session_timeout_minutes } = params;

      // Check if vault already exists
      const existing = await base44.entities.Vault.filter({ user_id: user.email });
      if (existing.length > 0) {
        return Response.json({ error: 'Vault already exists' }, { status: 400 });
      }

      // Create vault verifier (server-side hash for unlock verification)
      // In production, use Argon2 or BCrypt
      const vault_verifier_hash = vault_pin_hash; // Client sends pre-hashed PIN

      // Generate wrapped key (for server-side key recovery)
      const vault_key_wrapped = `wrapped_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const vault = await base44.entities.Vault.create({
        user_id: user.email,
        vault_salt,
        vault_key_wrapped,
        vault_verifier_hash,
        is_unlocked: false,
        failed_attempts: 0,
        is_locked_out: false,
        biometric_enabled: biometric_enabled || false,
        session_timeout_minutes: session_timeout_minutes || 5,
        setup_completed_at: new Date().toISOString()
      });

      // Log setup
      await base44.entities.VaultAudit.create({
        audit_id: `AUDIT_${Date.now()}`,
        user_id: user.email,
        action: 'vault_setup',
        actor_id: user.email,
        timestamp: new Date().toISOString(),
        summary: 'Vault setup completed',
        metadata: { biometric_enabled },
        success: true
      });

      return Response.json({
        success: true,
        message: 'Vault created successfully',
        vault_id: vault.id
      });
    }

    // POST /vault/unlock
    if (endpoint === 'unlock') {
      const { vault_pin_hash, device_biometric_token } = params;

      const vaults = await base44.entities.Vault.filter({ user_id: user.email });
      if (vaults.length === 0) {
        return Response.json({ error: 'Vault not found' }, { status: 404 });
      }

      const vault = vaults[0];

      // Check lockout
      if (vault.is_locked_out) {
        const lockoutExpired = vault.lockout_until && new Date(vault.lockout_until) < new Date();
        if (!lockoutExpired) {
          await base44.entities.VaultAudit.create({
            audit_id: `AUDIT_${Date.now()}`,
            user_id: user.email,
            action: 'unlock_failed',
            actor_id: user.email,
            timestamp: new Date().toISOString(),
            summary: 'Unlock attempt during lockout',
            success: false
          });

          return Response.json({ 
            error: 'Vault is locked. Please contact support.',
            lockout_until: vault.lockout_until
          }, { status: 403 });
        } else {
          // Clear lockout
          await base44.entities.Vault.update(vault.id, {
            is_locked_out: false,
            lockout_until: null,
            failed_attempts: 0
          });
        }
      }

      // Verify PIN
      const pinValid = vault_pin_hash === vault.vault_verifier_hash;

      if (!pinValid) {
        const newFailedAttempts = (vault.failed_attempts || 0) + 1;
        const shouldLockout = newFailedAttempts >= 5;

        await base44.entities.Vault.update(vault.id, {
          failed_attempts: newFailedAttempts,
          is_locked_out: shouldLockout,
          lockout_until: shouldLockout ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null
        });

        await base44.entities.VaultAudit.create({
          audit_id: `AUDIT_${Date.now()}`,
          user_id: user.email,
          action: shouldLockout ? 'lockout_triggered' : 'unlock_failed',
          actor_id: user.email,
          timestamp: new Date().toISOString(),
          summary: `Failed unlock attempt (${newFailedAttempts}/5)`,
          success: false
        });

        return Response.json({ 
          error: 'Invalid PIN',
          attempts_remaining: Math.max(0, 5 - newFailedAttempts)
        }, { status: 401 });
      }

      // Generate vault token (short-lived JWT)
      const vaultToken = `vault_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const expiresIn = (vault.session_timeout_minutes || 5) * 60; // seconds
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      await base44.entities.Vault.update(vault.id, {
        is_unlocked: true,
        last_unlocked_at: new Date().toISOString(),
        unlock_token: vaultToken,
        token_expires_at: expiresAt.toISOString(),
        failed_attempts: 0
      });

      // Log unlock
      await base44.entities.VaultAudit.create({
        audit_id: `AUDIT_${Date.now()}`,
        user_id: user.email,
        action: 'vault_unlock',
        actor_id: user.email,
        timestamp: new Date().toISOString(),
        summary: 'Vault unlocked successfully',
        metadata: { expires_in: expiresIn },
        success: true
      });

      return Response.json({
        user_id: user.email,
        vault_token: vaultToken,
        expires_in: expiresIn,
        unlocked_at: new Date().toISOString()
      });
    }

    // POST /vault/lock
    if (endpoint === 'lock') {
      const vaults = await base44.entities.Vault.filter({ user_id: user.email });
      if (vaults.length === 0) {
        return Response.json({ error: 'Vault not found' }, { status: 404 });
      }

      const vault = vaults[0];

      await base44.entities.Vault.update(vault.id, {
        is_unlocked: false,
        unlock_token: null,
        token_expires_at: null
      });

      await base44.entities.VaultAudit.create({
        audit_id: `AUDIT_${Date.now()}`,
        user_id: user.email,
        action: 'vault_lock',
        actor_id: user.email,
        timestamp: new Date().toISOString(),
        summary: 'Vault locked manually',
        success: true
      });

      return Response.json({
        success: true,
        message: 'Vault locked successfully'
      });
    }

    // POST /vault/force-lock (Emergency lock)
    if (endpoint === 'force-lock') {
      const { target_user_id } = params;
      const targetUserId = target_user_id || user.email;

      // Admin can force-lock any vault; users can only force-lock their own
      if (targetUserId !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const vaults = await base44.asServiceRole.entities.Vault.filter({ 
        user_id: targetUserId 
      });
      
      if (vaults.length === 0) {
        return Response.json({ error: 'Vault not found' }, { status: 404 });
      }

      const vault = vaults[0];

      await base44.asServiceRole.entities.Vault.update(vault.id, {
        is_unlocked: false,
        unlock_token: null,
        token_expires_at: null,
        is_locked_out: true,
        lockout_until: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      });

      await base44.asServiceRole.entities.VaultAudit.create({
        audit_id: `AUDIT_${Date.now()}`,
        user_id: targetUserId,
        action: 'emergency_lock',
        actor_id: user.email,
        timestamp: new Date().toISOString(),
        summary: `Emergency lock triggered by ${user.email}`,
        success: true
      });

      // Send notification email
      await base44.integrations.Core.SendEmail({
        to: targetUserId,
        subject: '🚨 Emergency Vault Lock Activated',
        body: `Your SafeNest Privacy Vault has been locked due to an emergency lock request.\n\nInitiated by: ${user.email}\nTime: ${new Date().toLocaleString()}\n\nYour vault will remain locked for 1 hour. Contact support if you did not request this.\n\nSafeNest Security Team`
      });

      return Response.json({
        success: true,
        message: 'Emergency lock activated',
        locked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      });
    }

    return Response.json({ error: 'Unknown endpoint' }, { status: 404 });

  } catch (error) {
    console.error('Vault service error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});