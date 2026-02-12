import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Simple proxy handler for web traffic routing
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, ...params } = await req.json();

    switch (endpoint) {
      case 'start-session': {
        // Create a proxy session
        const sessionId = crypto.randomUUID();
        const session = await base44.asServiceRole.entities.VPNConnection.create({
          user_email: user.email,
          device_id: params.device_id || 'web-browser',
          server_id: params.server_id || 'web-proxy-1',
          connection_status: 'connected',
          client_ip: req.headers.get('x-forwarded-for') || 'unknown',
          started_at: new Date().toISOString(),
          session_id: sessionId,
          created_by: user.email
        });

        // Log the connection
        await base44.asServiceRole.entities.AuditLog.create({
          action_type: 'vpn_connected',
          action_category: 'vpn',
          description: 'Web proxy session started',
          metadata: {
            session_id: sessionId,
            server: params.server_id || 'web-proxy-1'
          },
          severity: 'info',
          status: 'success',
          created_by: user.email
        });

        return Response.json({
          success: true,
          session_id: sessionId,
          proxy_endpoint: 'https://proxy.safenest.app',
          message: 'Proxy session started'
        });
      }

      case 'stop-session': {
        const { session_id } = params;

        // Find and update the session
        const connections = await base44.asServiceRole.entities.VPNConnection.filter({
          user_email: user.email,
          session_id,
          connection_status: 'connected'
        }, '-created_date', 1);

        if (connections.length > 0) {
          const conn = connections[0];
          const duration = (Date.now() - new Date(conn.started_at).getTime()) / 1000;

          await base44.asServiceRole.entities.VPNConnection.update(conn.id, {
            connection_status: 'disconnected',
            ended_at: new Date().toISOString(),
            duration_seconds: duration
          });

          await base44.asServiceRole.entities.AuditLog.create({
            action_type: 'vpn_disconnected',
            action_category: 'vpn',
            description: 'Web proxy session ended',
            metadata: {
              session_id,
              duration_seconds: duration.toFixed(0)
            },
            severity: 'info',
            status: 'success',
            created_by: user.email
          });
        }

        return Response.json({
          success: true,
          message: 'Proxy session stopped'
        });
      }

      case 'get-status': {
        // Check if user has an active session
        const activeSessions = await base44.asServiceRole.entities.VPNConnection.filter({
          user_email: user.email,
          connection_status: 'connected'
        }, '-created_date', 5);

        const webSessions = activeSessions.filter(s => 
          s.device_id === 'web-browser' || s.server_id === 'web-proxy-1'
        );

        return Response.json({
          success: true,
          active: webSessions.length > 0,
          sessions: webSessions.map(s => ({
            session_id: s.session_id,
            started_at: s.started_at,
            duration: Math.floor((Date.now() - new Date(s.started_at).getTime()) / 1000)
          }))
        });
      }

      case 'proxy-request': {
        // Handle proxied HTTP requests
        const { url, method = 'GET', headers = {}, body } = params;

        try {
          // Make the request through SafeNest infrastructure
          const proxyResponse = await fetch(url, {
            method,
            headers: {
              ...headers,
              'User-Agent': 'SafeNest-WebProxy/1.0',
              'X-Forwarded-For': req.headers.get('x-forwarded-for') || 'unknown'
            },
            body: body ? JSON.stringify(body) : undefined
          });

          const responseData = await proxyResponse.text();

          return Response.json({
            success: true,
            status: proxyResponse.status,
            headers: Object.fromEntries(proxyResponse.headers.entries()),
            body: responseData
          });
        } catch (error) {
          return Response.json({
            success: false,
            error: error.message
          }, { status: 500 });
        }
      }

      default:
        return Response.json({ error: 'Unknown endpoint' }, { status: 400 });
    }

  } catch (error) {
    console.error('Web Proxy Service Error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});