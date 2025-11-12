import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    // Helper: Generate WireGuard keypair
    function generateWireGuardKeys() {
      // In production, use actual WireGuard key generation
      // For demo, we'll simulate it
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const genKey = () => {
        let key = '';
        for (let i = 0; i < 43; i++) {
          key += chars[Math.floor(Math.random() * chars.length)];
        }
        return key + '=';
      };

      return {
        privateKey: genKey(),
        publicKey: genKey()
      };
    }

    // Helper: Assign VPN IP
    async function assignVPNIP() {
      const devices = await base44.entities.VPNDevice.filter({ 
        created_by: user.email 
      });
      
      const usedIPs = devices.map(d => d.assigned_ip).filter(Boolean);
      
      // Assign from 10.8.0.2 to 10.8.0.254
      for (let i = 2; i <= 254; i++) {
        const ip = `10.8.0.${i}`;
        if (!usedIPs.includes(ip)) {
          return ip;
        }
      }
      
      throw new Error('No available IP addresses');
    }

    // Helper: Generate WireGuard config file
    function generateConfigFile(device, server, privateKey) {
      return `[Interface]
PrivateKey = ${privateKey}
Address = ${device.assigned_ip}/32
DNS = 1.1.1.1, 1.0.0.1

[Peer]
PublicKey = ${server.public_key}
Endpoint = ${server.endpoint}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`;
    }

    if (endpoint === 'create-device') {
      const { device_name, device_type } = body;

      if (!device_name || !device_type) {
        return Response.json({ 
          error: 'Missing required fields: device_name, device_type' 
        }, { status: 400 });
      }

      // Generate keys
      const keys = generateWireGuardKeys();
      
      // Assign IP
      const assignedIP = await assignVPNIP();

      // Create device
      const device = await base44.entities.VPNDevice.create({
        device_id: crypto.randomUUID(),
        device_name,
        device_type,
        public_key: keys.publicKey,
        private_key_fingerprint: await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(keys.privateKey)
        ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')),
        assigned_ip: assignedIP,
        status: 'active',
        activation_date: new Date().toISOString(),
        config_version: 1
      });

      // Get best server (lowest load)
      const servers = await base44.asServiceRole.entities.VPNServer.filter({
        status: 'online'
      });

      if (servers.length === 0) {
        return Response.json({ 
          error: 'No VPN servers available' 
        }, { status: 503 });
      }

      const bestServer = servers.sort((a, b) => 
        (a.capacity?.current_peers || 0) - (b.capacity?.current_peers || 0)
      )[0];

      // Generate config
      const configContent = generateConfigFile(device, bestServer, keys.privateKey);

      // Create config record
      const config = await base44.entities.VPNConfig.create({
        config_id: crypto.randomUUID(),
        device_id: device.device_id,
        user_email: user.email,
        config_content: configContent,
        config_format: 'wireguard',
        download_token: crypto.randomUUID(),
        token_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        generated_at: new Date().toISOString(),
        server_endpoint: bestServer.endpoint
      });

      return Response.json({
        success: true,
        device,
        config_id: config.config_id,
        download_token: config.download_token,
        message: `Device "${device_name}" created successfully`
      });

    } else if (endpoint === 'list-devices') {
      const devices = await base44.entities.VPNDevice.filter({
        created_by: user.email
      }, '-created_date');

      return Response.json({
        success: true,
        devices,
        total: devices.length
      });

    } else if (endpoint === 'revoke-device') {
      const { device_id } = body;

      if (!device_id) {
        return Response.json({ 
          error: 'Missing device_id' 
        }, { status: 400 });
      }

      const devices = await base44.entities.VPNDevice.filter({
        device_id,
        created_by: user.email
      });

      if (devices.length === 0) {
        return Response.json({ 
          error: 'Device not found' 
        }, { status: 404 });
      }

      await base44.entities.VPNDevice.update(devices[0].id, {
        status: 'revoked',
        revocation_date: new Date().toISOString(),
        connected: false
      });

      return Response.json({
        success: true,
        message: 'Device revoked successfully'
      });

    } else if (endpoint === 'get-config') {
      const { config_id, download_token } = body;

      const configs = await base44.entities.VPNConfig.filter({
        config_id,
        download_token,
        user_email: user.email
      });

      if (configs.length === 0) {
        return Response.json({ 
          error: 'Config not found or token invalid' 
        }, { status: 404 });
      }

      const config = configs[0];

      // Check expiration
      if (new Date(config.token_expires_at) < new Date()) {
        return Response.json({ 
          error: 'Download token expired' 
        }, { status: 410 });
      }

      // Mark as downloaded
      await base44.entities.VPNConfig.update(config.id, {
        downloaded: true,
        downloaded_at: new Date().toISOString()
      });

      return Response.json({
        success: true,
        config: config.config_content,
        format: config.config_format
      });

    } else if (endpoint === 'update-connection-status') {
      const { device_id, connected, server_id, data_transfer } = body;

      const devices = await base44.entities.VPNDevice.filter({
        device_id,
        created_by: user.email
      });

      if (devices.length === 0) {
        return Response.json({ 
          error: 'Device not found' 
        }, { status: 404 });
      }

      await base44.entities.VPNDevice.update(devices[0].id, {
        connected,
        current_server_id: server_id,
        last_handshake: connected ? new Date().toISOString() : devices[0].last_handshake,
        data_transfer: data_transfer || devices[0].data_transfer
      });

      // Create connection log if connecting
      if (connected) {
        await base44.entities.VPNConnection.create({
          session_id: crypto.randomUUID(),
          device_id,
          server_id,
          user_email: user.email,
          connection_status: 'connected',
          started_at: new Date().toISOString(),
          client_ip: body.client_ip || 'unknown',
          vpn_ip: devices[0].assigned_ip
        });
      }

      return Response.json({
        success: true,
        message: 'Connection status updated'
      });

    } else {
      return Response.json({ 
        error: 'Unknown endpoint' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('VPN Device Service Error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});