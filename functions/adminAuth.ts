import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, key, newKey } = await req.json();
        
        // Default key if not set
        const DEFAULT_KEY = "Ronzoro";

        // Helper to get current key
        const getCurrentKey = async () => {
            const settings = await base44.asServiceRole.entities.SystemSetting.list();
            const keySetting = settings.find(s => s.setting_key === 'admin_master_key');
            return keySetting ? keySetting.setting_value : DEFAULT_KEY;
        };

        // Helper to log access
        const logAccess = async (actionType, status, details = "") => {
            await base44.asServiceRole.entities.AdminAccessLog.create({
                admin_email: user.email,
                timestamp: new Date().toISOString(),
                action: actionType,
                status: status,
                ip_address: req.headers.get('x-forwarded-for') || 'unknown',
                details: details
            });
        };

        if (action === 'verify') {
            const currentKey = await getCurrentKey();
            
            if (key === currentKey) {
                await logAccess('login_attempt', 'success', 'Valid key entered');
                return Response.json({ success: true });
            } else {
                await logAccess('login_attempt', 'failure', 'Invalid key entered');
                
                // Send alert email for failure
                try {
                    await base44.integrations.Core.SendEmail({
                        to: user.email, // Alerting the current admin/owner
                        subject: "SECURITY ALERT: Failed Admin Access Attempt",
                        body: `
                            Security Alert: SafeNestT Admin Panel
                            ----------------------------------------
                            A failed attempt to access the admin dashboard was detected.
                            
                            User: ${user.email}
                            Time: ${new Date().toLocaleString()}
                            IP: ${req.headers.get('x-forwarded-for') || 'unknown'}
                            
                            If this was not you, please secure your account immediately.
                        `
                    });
                } catch (e) {
                    console.error("Failed to send alert email", e);
                }

                return Response.json({ success: false, error: 'Invalid key' }, { status: 403 });
            }
        }

        if (action === 'update') {
            const currentKey = await getCurrentKey();
            
            if (key !== currentKey) {
                await logAccess('key_update', 'failure', 'Invalid current key provided for update');
                return Response.json({ success: false, error: 'Current key is incorrect' }, { status: 403 });
            }

            // Check if setting exists, update or create
            const settings = await base44.asServiceRole.entities.SystemSetting.list();
            const keySetting = settings.find(s => s.setting_key === 'admin_master_key');

            if (keySetting) {
                await base44.asServiceRole.entities.SystemSetting.update(keySetting.id, {
                    setting_value: newKey
                });
            } else {
                await base44.asServiceRole.entities.SystemSetting.create({
                    setting_key: 'admin_master_key',
                    setting_value: newKey,
                    description: 'Master key for admin access'
                });
            }

            await logAccess('key_update', 'success', 'Master key updated');
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});