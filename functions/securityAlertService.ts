import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Helper to send in-app notification
async function sendInAppNotification(title, message, type, priority, actionUrl) {
  const notification = {
    id: crypto.randomUUID(),
    title,
    message,
    type,
    priority,
    actionUrl,
    timestamp: Date.now(),
    read: false
  };

  // Dispatch browser event for notification center
  if (typeof window !== 'undefined') {
    const stored = JSON.parse(localStorage.getItem('inAppNotifications') || '[]');
    stored.unshift(notification);
    localStorage.setItem('inAppNotifications', JSON.stringify(stored.slice(0, 100))); // Keep last 100
    window.dispatchEvent(new Event('notificationAdded'));
  }

  return notification;
}

// Detect multiple failed VPN connection attempts
async function detectFailedVPNAttempts(base44, userEmail) {
  const fifteenMinutesAgo = new Date();
  fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

  // Get recent failed connections
  const recentConnections = await base44.asServiceRole.entities.VPNConnection.filter({
    user_email: userEmail,
    connection_status: 'failed'
  }, '-created_date', 20);

  const recentFailures = recentConnections.filter(conn => 
    new Date(conn.created_date) >= fifteenMinutesAgo
  );

  if (recentFailures.length >= 5) {
    // Check if we already created an alert for this recently
    const recentAlerts = await base44.asServiceRole.entities.Alert.filter({
      created_by: userEmail,
      alert_type: 'vpn',
      status: 'active'
    }, '-created_date', 5);

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const existingAlert = recentAlerts.find(alert => 
      alert.title.includes('Failed VPN') && new Date(alert.created_date) >= oneHourAgo
    );

    if (!existingAlert) {
      const alert = await base44.asServiceRole.entities.Alert.create({
        created_by: userEmail,
        alert_type: 'vpn',
        severity: 'high',
        title: 'Multiple Failed VPN Connection Attempts Detected',
        message: `${recentFailures.length} failed VPN connection attempts detected in the last 15 minutes. This could indicate network issues or a security concern.`,
        status: 'active',
        affected_item: `${recentFailures.length} failed connections`,
        recommendation: 'Check your internet connection, verify your VPN credentials, and ensure you\'re using the latest configuration. If this persists, try connecting to a different server.'
      });

      return { threat: 'failed_vpn_attempts', severity: 'high', alert, count: recentFailures.length };
    }
  }

  return null;
}

// Detect suspicious IP connections
async function detectSuspiciousIPs(base44, userEmail) {
  // Get recent connections from different IPs
  const connections = await base44.asServiceRole.entities.VPNConnection.filter({
    user_email: userEmail
  }, '-created_date', 50);

  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);

  const recentConnections = connections.filter(conn => 
    new Date(conn.created_date) >= oneHourAgo
  );

  // Group by client IP
  const ipGroups = {};
  recentConnections.forEach(conn => {
    if (conn.client_ip) {
      ipGroups[conn.client_ip] = (ipGroups[conn.client_ip] || 0) + 1;
    }
  });

  const uniqueIPs = Object.keys(ipGroups).length;

  // Alert if more than 5 different IPs in last hour (potential account compromise)
  if (uniqueIPs >= 5) {
    const recentAlerts = await base44.asServiceRole.entities.Alert.filter({
      created_by: userEmail,
      alert_type: 'vpn',
      status: 'active'
    }, '-created_date', 5);

    const threeHoursAgo = new Date();
    threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

    const existingAlert = recentAlerts.find(alert => 
      alert.title.includes('Suspicious IP') && new Date(alert.created_date) >= threeHoursAgo
    );

    if (!existingAlert) {
      const alert = await base44.asServiceRole.entities.Alert.create({
        created_by: userEmail,
        alert_type: 'vpn',
        severity: 'critical',
        title: 'Suspicious IP Activity Detected',
        message: `${uniqueIPs} different IP addresses used in the last hour. This may indicate unauthorized access to your account.`,
        status: 'active',
        affected_item: `${uniqueIPs} unique IPs`,
        recommendation: 'Review your recent connections, change your password immediately, and enable two-factor authentication if not already enabled.'
      });

      return { threat: 'suspicious_ips', severity: 'critical', alert, count: uniqueIPs };
    }
  }

  return null;
}

// Detect unusual data transfer patterns
async function detectUnusualDataTransfer(base44, userEmail) {
  // Get user's VPN devices
  const devices = await base44.asServiceRole.entities.VPNDevice.filter({
    created_by: userEmail,
    status: 'active'
  });

  const threats = [];

  for (const device of devices) {
    const totalTransferGB = ((device.data_transfer?.rx_bytes || 0) + (device.data_transfer?.tx_bytes || 0)) / (1024 * 1024 * 1024);

    // Alert if more than 50GB transferred in short time (potential data exfiltration)
    if (totalTransferGB > 50) {
      // Check when device was created/activated
      const deviceAge = Date.now() - new Date(device.activation_date || device.created_date).getTime();
      const hoursOld = deviceAge / (1000 * 60 * 60);

      // If transferred >50GB in less than 24 hours
      if (hoursOld < 24) {
        const recentAlerts = await base44.asServiceRole.entities.Alert.filter({
          created_by: userEmail,
          alert_type: 'vpn',
          status: 'active'
        }, '-created_date', 5);

        const existingAlert = recentAlerts.find(alert => 
          alert.affected_item?.includes(device.device_name)
        );

        if (!existingAlert) {
          const alert = await base44.asServiceRole.entities.Alert.create({
            created_by: userEmail,
            alert_type: 'vpn',
            severity: 'high',
            title: 'Unusual Data Transfer Pattern Detected',
            message: `Device "${device.device_name}" has transferred ${totalTransferGB.toFixed(2)}GB in ${hoursOld.toFixed(1)} hours. This is unusually high and may indicate unauthorized activity.`,
            status: 'active',
            affected_item: `${device.device_name} - ${totalTransferGB.toFixed(2)}GB`,
            recommendation: 'Review this device\'s activity, verify it\'s your legitimate device, and check what applications are using data. Consider revoking the device if you don\'t recognize the activity.'
          });

          threats.push({ 
            threat: 'unusual_data_transfer', 
            severity: 'high', 
            alert, 
            device: device.device_name,
            dataGB: totalTransferGB.toFixed(2)
          });
        }
      }
    }
  }

  return threats.length > 0 ? threats : null;
}

// Detect rapid server switching (potential evasion)
async function detectRapidServerSwitching(base44, userEmail) {
  const thirtyMinutesAgo = new Date();
  thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

  const recentConnections = await base44.asServiceRole.entities.VPNConnection.filter({
    user_email: userEmail
  }, '-created_date', 50);

  const recent = recentConnections.filter(conn => 
    new Date(conn.created_date) >= thirtyMinutesAgo
  );

  // Count unique servers
  const uniqueServers = new Set(recent.map(c => c.server_id)).size;

  // Alert if switched servers more than 6 times in 30 minutes
  if (uniqueServers >= 6) {
    const recentAlerts = await base44.asServiceRole.entities.Alert.filter({
      created_by: userEmail,
      alert_type: 'vpn',
      status: 'active'
    }, '-created_date', 5);

    const existingAlert = recentAlerts.find(alert => 
      alert.title.includes('Rapid Server Switching')
    );

    if (!existingAlert) {
      const alert = await base44.asServiceRole.entities.Alert.create({
        created_by: userEmail,
        alert_type: 'vpn',
        severity: 'medium',
        title: 'Rapid Server Switching Detected',
        message: `Connected to ${uniqueServers} different VPN servers in the last 30 minutes. This pattern is unusual.`,
        status: 'active',
        affected_item: `${uniqueServers} server switches`,
        recommendation: 'This could be normal if you\'re testing servers, but may indicate automated activity. Review your device security.'
      });

      return { threat: 'rapid_server_switching', severity: 'medium', alert, count: uniqueServers };
    }
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, ...params } = await req.json();

    switch (endpoint) {
      case 'detect-threats': {
        // Run all threat detection algorithms
        const threats = [];

        const failedVPN = await detectFailedVPNAttempts(base44, user.email);
        if (failedVPN) threats.push(failedVPN);

        const suspiciousIPs = await detectSuspiciousIPs(base44, user.email);
        if (suspiciousIPs) threats.push(suspiciousIPs);

        const unusualData = await detectUnusualDataTransfer(base44, user.email);
        if (unusualData) threats.push(...unusualData);

        const rapidSwitching = await detectRapidServerSwitching(base44, user.email);
        if (rapidSwitching) threats.push(rapidSwitching);

        // Send notifications for critical threats
        for (const threat of threats) {
          if (threat.severity === 'critical') {
            // This would need to be called from frontend after detection
            // sendInAppNotification(threat.alert.title, threat.alert.message, 'security', 'high');
          }
        }

        return Response.json({
          success: true,
          threats_detected: threats.length,
          threats,
          scanned_at: new Date().toISOString()
        });
      }

      case 'get-alert-preferences': {
        // Get user's alert preferences
        const prefs = user.alert_preferences || {
          enabled: true,
          notify_critical: true,
          notify_high: true,
          notify_medium: false,
          notify_low: false,
          email_alerts: true,
          push_alerts: true,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          alert_types: {
            vpn: true,
            breach: true,
            password: true,
            phishing: true,
            permission: true,
            dark_web: true
          }
        };

        return Response.json({ preferences: prefs });
      }

      case 'update-alert-preferences': {
        const { preferences } = params;

        await base44.auth.updateMe({
          alert_preferences: preferences
        });

        return Response.json({ success: true, preferences });
      }

      case 'test-alert': {
        // Create a test alert for testing the system
        const alert = await base44.entities.Alert.create({
          alert_type: 'vpn',
          severity: 'low',
          title: 'Test Alert - Security System Check',
          message: 'This is a test alert to verify your notification system is working correctly. You can safely dismiss this.',
          status: 'active',
          affected_item: 'Test Alert',
          recommendation: 'No action needed - this is a test.'
        });

        return Response.json({ success: true, alert });
      }

      default:
        return Response.json({ error: 'Unknown endpoint' }, { status: 400 });
    }

  } catch (error) {
    console.error('Security Alert Service Error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});