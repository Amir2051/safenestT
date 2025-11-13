import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Simulate server health check (in production, this would ping actual servers)
async function performHealthCheck(server) {
  try {
    // Simulate health metrics
    const isOnline = Math.random() > 0.05; // 95% uptime
    const cpuUsage = Math.random() * 80; // 0-80% CPU
    const memoryUsage = Math.random() * 70; // 0-70% memory
    const avgLatency = 10 + Math.random() * 40; // 10-50ms
    const packetLoss = Math.random() * 2; // 0-2%
    
    return {
      status: isOnline ? 'online' : 'offline',
      health_score: isOnline ? Math.max(20, 100 - cpuUsage - memoryUsage/2) : 0,
      capacity: {
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        current_peers: server.capacity?.current_peers || 0,
        max_peers: server.capacity?.max_peers || 1000,
        bandwidth_mbps: server.capacity?.bandwidth_mbps || 1000
      },
      performance: {
        avg_latency_ms: avgLatency,
        uptime_percentage: isOnline ? 99.5 + Math.random() * 0.5 : 0,
        packet_loss: packetLoss
      },
      last_health_check: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'offline',
      health_score: 0,
      error: error.message
    };
  }
}

// Get devices connected to a specific server
async function getConnectedDevices(base44, serverId) {
  const devices = await base44.asServiceRole.entities.VPNDevice.filter({
    current_server_id: serverId,
    connected: true,
    status: 'active'
  });

  return devices.map(device => ({
    id: device.id,
    device_id: device.device_id,
    device_name: device.device_name,
    device_type: device.device_type,
    assigned_ip: device.assigned_ip,
    last_handshake: device.last_handshake,
    data_transfer: device.data_transfer,
    created_by: device.created_by
  }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { endpoint, ...params } = await req.json();

    switch (endpoint) {
      case 'list-servers': {
        const servers = await base44.asServiceRole.entities.VPNServer.list('-created_date');
        
        // Get connected devices count for each server
        const serversWithStats = await Promise.all(
          servers.map(async (server) => {
            const connectedDevices = await getConnectedDevices(base44, server.server_id);
            return {
              ...server,
              connected_devices_count: connectedDevices.length
            };
          })
        );

        return Response.json({ servers: serversWithStats });
      }

      case 'create-server': {
        const { server_name, region, location, endpoint: serverEndpoint, public_ip, public_key } = params;

        // Generate server_id
        const server_id = `srv_${crypto.randomUUID().substring(0, 8)}`;

        const server = await base44.asServiceRole.entities.VPNServer.create({
          server_id,
          server_name,
          public_key,
          public_ip,
          endpoint: serverEndpoint || `${public_ip}:51820`,
          region,
          location,
          status: 'online',
          health_score: 100,
          capacity: {
            max_peers: 1000,
            current_peers: 0,
            cpu_usage: 0,
            memory_usage: 0,
            bandwidth_mbps: 1000
          },
          performance: {
            avg_latency_ms: 0,
            uptime_percentage: 100,
            packet_loss: 0
          },
          registered_at: new Date().toISOString()
        });

        return Response.json({ success: true, server });
      }

      case 'update-server': {
        const { server_id, updates } = params;

        const servers = await base44.asServiceRole.entities.VPNServer.filter({ server_id });
        if (servers.length === 0) {
          return Response.json({ error: 'Server not found' }, { status: 404 });
        }

        const updated = await base44.asServiceRole.entities.VPNServer.update(servers[0].id, updates);
        return Response.json({ success: true, server: updated });
      }

      case 'delete-server': {
        const { server_id } = params;

        // Check if any devices are connected
        const connectedDevices = await getConnectedDevices(base44, server_id);
        if (connectedDevices.length > 0) {
          return Response.json({ 
            error: `Cannot delete server with ${connectedDevices.length} connected device(s)`,
            connected_count: connectedDevices.length
          }, { status: 400 });
        }

        const servers = await base44.asServiceRole.entities.VPNServer.filter({ server_id });
        if (servers.length === 0) {
          return Response.json({ error: 'Server not found' }, { status: 404 });
        }

        await base44.asServiceRole.entities.VPNServer.delete(servers[0].id);
        return Response.json({ success: true });
      }

      case 'health-check': {
        const { server_id } = params;

        const servers = await base44.asServiceRole.entities.VPNServer.filter({ server_id });
        if (servers.length === 0) {
          return Response.json({ error: 'Server not found' }, { status: 404 });
        }

        const server = servers[0];
        const health = await performHealthCheck(server);

        // Update server with health check results
        await base44.asServiceRole.entities.VPNServer.update(server.id, {
          status: health.status,
          health_score: health.health_score,
          capacity: health.capacity,
          performance: health.performance,
          last_health_check: health.last_health_check
        });

        return Response.json({ success: true, health });
      }

      case 'health-check-all': {
        const servers = await base44.asServiceRole.entities.VPNServer.list();
        
        const results = await Promise.all(
          servers.map(async (server) => {
            const health = await performHealthCheck(server);
            
            await base44.asServiceRole.entities.VPNServer.update(server.id, {
              status: health.status,
              health_score: health.health_score,
              capacity: health.capacity,
              performance: health.performance,
              last_health_check: health.last_health_check
            });

            return {
              server_id: server.server_id,
              server_name: server.server_name,
              health
            };
          })
        );

        return Response.json({ 
          success: true, 
          checked: results.length,
          results,
          checked_at: new Date().toISOString()
        });
      }

      case 'get-server-devices': {
        const { server_id } = params;

        const devices = await getConnectedDevices(base44, server_id);
        
        // Get connection history for this server
        const connections = await base44.asServiceRole.entities.VPNConnection.filter({
          server_id
        }, '-created_date', 100);

        return Response.json({ 
          success: true,
          server_id,
          devices,
          total_connections: connections.length,
          active_connections: devices.length
        });
      }

      case 'disconnect-device': {
        const { device_id, server_id } = params;

        const devices = await base44.asServiceRole.entities.VPNDevice.filter({ device_id });
        if (devices.length === 0) {
          return Response.json({ error: 'Device not found' }, { status: 404 });
        }

        const device = devices[0];

        // Update device to disconnected state
        await base44.asServiceRole.entities.VPNDevice.update(device.id, {
          connected: false,
          current_server_id: null,
          last_handshake: new Date().toISOString()
        });

        // Create connection end record
        const activeConnections = await base44.asServiceRole.entities.VPNConnection.filter({
          device_id,
          server_id,
          connection_status: 'connected'
        }, '-created_date', 1);

        if (activeConnections.length > 0) {
          const conn = activeConnections[0];
          const duration = (Date.now() - new Date(conn.started_at).getTime()) / 1000;
          
          await base44.asServiceRole.entities.VPNConnection.update(conn.id, {
            connection_status: 'disconnected',
            ended_at: new Date().toISOString(),
            duration_seconds: duration,
            disconnect_reason: 'admin_initiated'
          });
        }

        return Response.json({ success: true, message: 'Device disconnected' });
      }

      default:
        return Response.json({ error: 'Unknown endpoint' }, { status: 400 });
    }

  } catch (error) {
    console.error('VPN Server Management Error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});