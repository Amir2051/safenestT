import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Simulated tower database (in production, use real carrier data)
const KNOWN_TOWERS = {
  'US-Verizon': ['310120', '311480'],
  'US-ATT': ['310410', '310170'],
  'US-TMobile': ['310260', '310160']
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return Response.json({ 
        error: 'Invalid request body' 
      }, { status: 400 });
    }

    const { endpoint, ...params } = body;

    if (!endpoint) {
      return Response.json({ 
        error: 'Missing endpoint parameter' 
      }, { status: 400 });
    }

    // Verify authentication
    let user;
    try {
      user = await base44.auth.me();
    } catch (authError) {
      console.error('Authentication failed:', authError);
      return Response.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    if (!user) {
      return Response.json({ 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    console.log('Signal Watch request:', { endpoint, user: user.email });

    // POST /signal-watch/start
    if (endpoint === 'start') {
      try {
        console.log('Starting signal monitoring for:', user.email);

        // Get or create monitoring session
        const existing = await base44.entities.SignalWatch.filter({ 
          created_by: user.email 
        });

        let session;
        if (existing.length > 0) {
          session = existing[0];
          await base44.entities.SignalWatch.update(session.id, {
            monitoring_active: true,
            started_at: new Date().toISOString(),
            stopped_at: null
          });
        } else {
          session = await base44.entities.SignalWatch.create({
            session_id: `SESSION_${Date.now()}`,
            monitoring_active: true,
            started_at: new Date().toISOString(),
            signal_history: [],
            anomalies_detected: [],
            total_towers_seen: 0,
            suspicious_towers_count: 0
          });
        }

        return Response.json({
          success: true,
          session_id: session.session_id,
          message: 'Signal monitoring started'
        });
      } catch (error) {
        console.error('Start monitoring error:', error);
        return Response.json({ 
          error: 'Failed to start monitoring: ' + error.message 
        }, { status: 500 });
      }
    }

    // POST /signal-watch/stop
    if (endpoint === 'stop') {
      try {
        const sessions = await base44.entities.SignalWatch.filter({ 
          created_by: user.email 
        });

        if (sessions.length === 0) {
          return Response.json({ 
            success: true,
            message: 'No active session'
          });
        }

        const session = sessions[0];
        await base44.entities.SignalWatch.update(session.id, {
          monitoring_active: false,
          stopped_at: new Date().toISOString()
        });

        return Response.json({
          success: true,
          message: 'Signal monitoring stopped'
        });
      } catch (error) {
        console.error('Stop monitoring error:', error);
        return Response.json({ 
          error: 'Failed to stop monitoring: ' + error.message 
        }, { status: 500 });
      }
    }

    // POST /signal-watch/log-tower
    if (endpoint === 'log-tower') {
      try {
        const { cell_id, mcc, mnc, lac, rssi, connection_type, carrier_name, latitude, longitude } = params;

        const sessions = await base44.entities.SignalWatch.filter({ 
          created_by: user.email 
        });

        if (sessions.length === 0) {
          // Create session if it doesn't exist
          const session = await base44.entities.SignalWatch.create({
            session_id: `SESSION_${Date.now()}`,
            monitoring_active: true,
            started_at: new Date().toISOString(),
            signal_history: [],
            anomalies_detected: [],
            total_towers_seen: 0,
            suspicious_towers_count: 0
          });
          
          return Response.json({
            success: true,
            status: 'normal',
            health_score: 100
          });
        }

        const session = sessions[0];
        const history = session.signal_history || [];
        const anomalies = session.anomalies_detected || [];

        // Detect anomalies
        let status = 'normal';
        let newAnomaly = null;
        let healthImpact = 0;

        // Check for 2G downgrade
        if (connection_type === '2G' && history.length > 0) {
          const recent = history.slice(-5);
          const was4G = recent.some(h => h.connection_type === '4G' || h.connection_type === '5G');
          if (was4G) {
            status = 'alert';
            healthImpact = -15;
            newAnomaly = {
              timestamp: new Date().toISOString(),
              anomaly_type: 'forced_2g_downgrade',
              severity: 'high',
              cell_id,
              description: 'Sudden downgrade from 4G/5G to 2G detected. Possible IMSI catcher.',
              resolved: false
            };
          }
        }

        // Check for unknown tower ID
        const mccMnc = `${mcc}${mnc}`;
        const isKnownTower = Object.values(KNOWN_TOWERS).flat().includes(mccMnc);
        if (!isKnownTower && mcc && mnc) {
          status = status === 'alert' ? 'alert' : 'anomaly';
          healthImpact = Math.min(healthImpact, -10);
          if (!newAnomaly) {
            newAnomaly = {
              timestamp: new Date().toISOString(),
              anomaly_type: 'unknown_tower_id',
              severity: 'medium',
              cell_id,
              description: 'Tower ID not in carrier database. May be temporary or suspicious.',
              resolved: false
            };
          }
        }

        // Check for weak signal
        if (rssi < -100) {
          status = status === 'normal' ? 'anomaly' : status;
          healthImpact = Math.min(healthImpact, -5);
        }

        // Update session
        const newHistoryEntry = {
          timestamp: new Date().toISOString(),
          cell_id,
          rssi,
          connection_type,
          status
        };

        const updatedHistory = [...history, newHistoryEntry].slice(-100); // Keep last 100
        const updatedAnomalies = newAnomaly ? [...anomalies, newAnomaly] : anomalies;
        const newHealthScore = Math.max(0, Math.min(100, session.signal_health_score + healthImpact));

        await base44.entities.SignalWatch.update(session.id, {
          tower_data: {
            cell_id, mcc, mnc, lac, rssi, connection_type, carrier_name, latitude, longitude
          },
          signal_history: updatedHistory,
          anomalies_detected: updatedAnomalies,
          signal_health_score: newHealthScore,
          total_towers_seen: (session.total_towers_seen || 0) + 1,
          suspicious_towers_count: status === 'alert' 
            ? (session.suspicious_towers_count || 0) + 1 
            : session.suspicious_towers_count
        });

        return Response.json({
          success: true,
          status,
          anomaly: newAnomaly,
          health_score: newHealthScore
        });
      } catch (error) {
        console.error('Log tower error:', error);
        return Response.json({ 
          error: 'Failed to log tower: ' + error.message 
        }, { status: 500 });
      }
    }

    // POST /signal-watch/report
    if (endpoint === 'report') {
      try {
        const { tower_info, report_reason, user_comments, is_anonymous } = params;

        if (!tower_info || !report_reason) {
          return Response.json({ 
            error: 'Missing required fields' 
          }, { status: 400 });
        }

        const reportId = `REPORT_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const report = await base44.entities.TowerReport.create({
          report_id: reportId,
          reporter_email: is_anonymous ? null : user.email,
          is_anonymous: is_anonymous || false,
          reported_at: new Date().toISOString(),
          tower_info,
          report_reason,
          user_comments: user_comments || '',
          device_info: {
            os: 'Web',
            device_model: 'Browser',
            app_version: '1.0.0'
          },
          geolocation: {
            latitude: tower_info.latitude || 0,
            longitude: tower_info.longitude || 0
          },
          status: 'pending'
        });

        // Check for similar reports in same area (within 1km radius)
        try {
          const allReports = await base44.asServiceRole.entities.TowerReport.list();
          const similarReports = allReports.filter(r => {
            if (!r.geolocation?.latitude || !r.geolocation?.longitude) return false;
            const distance = Math.sqrt(
              Math.pow(r.geolocation.latitude - (tower_info.latitude || 0), 2) +
              Math.pow(r.geolocation.longitude - (tower_info.longitude || 0), 2)
            ) * 111; // Rough km conversion
            return distance < 1 && r.id !== report.id;
          });

          if (similarReports.length > 0) {
            await base44.entities.TowerReport.update(report.id, {
              similar_reports_count: similarReports.length,
              verification_score: Math.min(100, 20 + (similarReports.length * 15))
            });
          }

          return Response.json({
            success: true,
            report_id: reportId,
            similar_reports: similarReports.length,
            message: 'Report submitted successfully. Thank you for helping the community!'
          });
        } catch (similarError) {
          console.error('Error checking similar reports:', similarError);
          return Response.json({
            success: true,
            report_id: reportId,
            similar_reports: 0,
            message: 'Report submitted successfully.'
          });
        }
      } catch (error) {
        console.error('Report submission error:', error);
        return Response.json({ 
          error: 'Failed to submit report: ' + error.message 
        }, { status: 500 });
      }
    }

    // GET /signal-watch/stats
    if (endpoint === 'stats') {
      try {
        const sessions = await base44.entities.SignalWatch.filter({ 
          created_by: user.email 
        });

        if (sessions.length === 0) {
          return Response.json({
            session_exists: false,
            monitoring_active: false,
            health_score: 100,
            total_towers_seen: 0,
            suspicious_towers_count: 0,
            recent_anomalies: [],
            current_tower: null,
            signal_history: []
          });
        }

        const session = sessions[0];
        const recentAnomalies = (session.anomalies_detected || [])
          .filter(a => !a.resolved)
          .slice(-10);

        return Response.json({
          session_exists: true,
          monitoring_active: session.monitoring_active,
          health_score: session.signal_health_score || 100,
          total_towers_seen: session.total_towers_seen || 0,
          suspicious_towers_count: session.suspicious_towers_count || 0,
          recent_anomalies: recentAnomalies,
          current_tower: session.tower_data || null,
          signal_history: (session.signal_history || []).slice(-20),
          alert_sensitivity: session.alert_sensitivity || 'normal',
          anonymous_reporting_enabled: session.anonymous_reporting_enabled !== false
        });
      } catch (error) {
        console.error('Stats fetch error:', error);
        return Response.json({ 
          error: 'Failed to fetch stats: ' + error.message 
        }, { status: 500 });
      }
    }

    // POST /signal-watch/clear-history
    if (endpoint === 'clear-history') {
      try {
        const sessions = await base44.entities.SignalWatch.filter({ 
          created_by: user.email 
        });

        if (sessions.length > 0) {
          const session = sessions[0];
          await base44.entities.SignalWatch.update(session.id, {
            signal_history: [],
            anomalies_detected: [],
            total_towers_seen: 0,
            suspicious_towers_count: 0,
            signal_health_score: 100
          });
        }

        return Response.json({
          success: true,
          message: 'History cleared'
        });
      } catch (error) {
        console.error('Clear history error:', error);
        return Response.json({ 
          error: 'Failed to clear history: ' + error.message 
        }, { status: 500 });
      }
    }

    // POST /signal-watch/update-settings
    if (endpoint === 'update-settings') {
      try {
        const { alert_sensitivity, anonymous_reporting_enabled } = params;

        const sessions = await base44.entities.SignalWatch.filter({ 
          created_by: user.email 
        });

        if (sessions.length === 0) {
          return Response.json({ 
            error: 'No session found' 
          }, { status: 404 });
        }

        const session = sessions[0];
        await base44.entities.SignalWatch.update(session.id, {
          alert_sensitivity: alert_sensitivity || session.alert_sensitivity,
          anonymous_reporting_enabled: anonymous_reporting_enabled !== undefined 
            ? anonymous_reporting_enabled 
            : session.anonymous_reporting_enabled
        });

        return Response.json({
          success: true,
          message: 'Settings updated'
        });
      } catch (error) {
        console.error('Update settings error:', error);
        return Response.json({ 
          error: 'Failed to update settings: ' + error.message 
        }, { status: 500 });
      }
    }

    return Response.json({ 
      error: 'Unknown endpoint: ' + endpoint 
    }, { status: 404 });

  } catch (error) {
    console.error('Signal Watch service error:', error);
    return Response.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
});