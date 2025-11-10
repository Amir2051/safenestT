import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Known carrier database (US carriers)
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

    // POST /signal-watch/fetch-towers (OpenCelliD Integration)
    if (endpoint === 'fetch-towers') {
      try {
        const { lat, lon, range } = params;

        if (!lat || !lon) {
          return Response.json({ 
            error: 'Missing latitude or longitude' 
          }, { status: 400 });
        }

        console.log('Fetching towers from OpenCelliD:', { lat, lon, range: range || 5000 });

        // Get API key
        const apiKey = Deno.env.get('OPENCELLID_TOKEN');
        
        if (!apiKey) {
          return Response.json({ 
            error: 'OPENCELLID_TOKEN not configured. Please add your OpenCelliD API key in the dashboard settings.' 
          }, { status: 500 });
        }

        let cellsArray = [];
        let apiSuccess = false;

        // Try OpenCelliD API with multiple endpoint formats
        const urls = [
          // Format 1: OpenCelliD v2 API - Get cells in area
          `https://opencellid.org/cell/getInArea?key=${apiKey}&BBOX=${lon-0.05},${lat-0.05},${lon+0.05},${lat+0.05}&format=json&limit=50`,
          // Format 2: Unwired Labs API (alternative provider)
          `https://us1.unwiredlabs.com/v2/process.php`
        ];

        // Try first URL (OpenCelliD direct)
        try {
          console.log('Trying OpenCelliD API (Format 1)...');
          const response = await fetch(urls[0], {
            headers: {
              'Accept': 'application/json'
            }
          });
          
          console.log('OpenCelliD API response status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('OpenCelliD raw response sample:', JSON.stringify(data).substring(0, 300));
            
            // Handle different response formats
            if (data.cells && Array.isArray(data.cells)) {
              cellsArray = data.cells;
            } else if (Array.isArray(data)) {
              cellsArray = data;
            } else if (data.cell) {
              cellsArray = [data.cell];
            }
            
            if (cellsArray.length > 0) {
              apiSuccess = true;
              console.log('✅ Successfully fetched', cellsArray.length, 'towers from OpenCelliD');
            }
          } else {
            const errorText = await response.text();
            console.warn(`OpenCelliD API failed with status ${response.status}: ${errorText}`);
          }
        } catch (error) {
          console.error('OpenCelliD API Format 1 failed:', error.message);
        }

        // Try second URL (Unwired Labs - alternative)
        if (!apiSuccess) {
          try {
            console.log('Trying Unwired Labs API (Format 2)...');
            const response = await fetch(urls[1], {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                token: apiKey,
                radio: 'all',
                lat: lat,
                lon: lon,
                limit: 50
              })
            });
            
            console.log('Unwired Labs API response status:', response.status);
            
            if (response.ok) {
              const data = await response.json();
              console.log('Unwired Labs raw response sample:', JSON.stringify(data).substring(0, 300));
              
              if (data.cells && Array.isArray(data.cells)) {
                cellsArray = data.cells;
                apiSuccess = true;
                console.log('✅ Successfully fetched', cellsArray.length, 'towers from Unwired Labs');
              }
            } else {
              const errorText = await response.text();
              console.warn(`Unwired Labs API failed with status ${response.status}: ${errorText}`);
            }
          } catch (error) {
            console.error('Unwired Labs API failed:', error.message);
          }
        }

        // If all APIs failed
        if (!apiSuccess || cellsArray.length === 0) {
          console.error('❌ All OpenCelliD APIs failed or returned no data');
          return Response.json({ 
            error: 'No cell towers found in this area. The OpenCelliD API may be unavailable or there are no towers recorded at this location. Please try a different location or check your API key.',
            towers: [],
            total: 0,
            unverified: 0,
            critical: 0,
            location: { lat, lon, range: range || 5000 }
          }, { status: 404 });
        }

        console.log('Processing', cellsArray.length, 'cells...');

        // Process towers with robust field mapping
        const towers = cellsArray.map((cell, idx) => {
          // Handle multiple possible field names
          const samples = cell.samples || cell.numberOfSamples || cell.sampleCount || 0;
          const isUnverified = samples < 5;
          
          // MCC/MNC handling
          const mcc = String(cell.mcc || cell.MCC || '');
          const mnc = String(cell.mnc || cell.MNC || '');
          const mccMnc = `${mcc}${mnc}`;
          const isKnownCarrier = Object.values(KNOWN_TOWERS).flat().includes(mccMnc);

          // Cell ID handling
          const cellId = String(cell.cell || cell.cellid || cell.cellId || cell.ci || cell.CID || 
                        `${cell.lac || 0}-${cell.cid || idx}`);

          // Location handling
          const latitude = parseFloat(cell.lat || cell.latitude || cell.Lat || 0);
          const longitude = parseFloat(cell.lon || cell.longitude || cell.Lon || 0);

          // Signal handling
          const signal = parseFloat(cell.averageSignal || cell.signal || cell.signalStrength || 
                        cell.rssi || cell.RSSI || -85);

          // Radio type handling
          const radio = String(cell.radio || cell.radioType || cell.networkType || '4G').toUpperCase();

          return {
            cell_id: cellId,
            mcc: mcc,
            mnc: mnc,
            lac: String(cell.lac || cell.locationAreaCode || cell.LAC || ''),
            cid: String(cell.cid || cell.cellId || cell.CID || ''),
            signal: signal,
            radio: radio,
            latitude: latitude,
            longitude: longitude,
            samples: samples,
            range: cell.range || cell.cellRange || 1000,
            changeable: cell.changeable || 0,
            created: cell.created || cell.createdAt || 0,
            updated: cell.updated || cell.updatedAt || 0,
            is_unverified: isUnverified,
            is_known_carrier: isKnownCarrier,
            warning_level: isUnverified && !isKnownCarrier ? 'critical' : 
                           isUnverified ? 'high' : 
                           !isKnownCarrier ? 'medium' : 'none'
          };
        });

        console.log('✅ Processed', towers.length, 'towers successfully');
        if (towers.length > 0) {
          console.log('Sample processed tower:', JSON.stringify(towers[0]));
        }

        // Update or create session
        const sessions = await base44.entities.SignalWatch.filter({ 
          created_by: user.email 
        });

        const unverifiedCount = towers.filter(t => t.is_unverified).length;
        const criticalCount = towers.filter(t => t.warning_level === 'critical').length;

        if (sessions.length > 0) {
          const session = sessions[0];
          await base44.entities.SignalWatch.update(session.id, {
            tower_data: towers.length > 0 ? towers[0] : null,
            total_towers_seen: towers.length,
            suspicious_towers_count: unverifiedCount
          });

          // Create alert if critical towers found
          if (criticalCount > 0) {
            const criticalTowers = towers.filter(t => t.warning_level === 'critical');
            await base44.entities.Alert.create({
              alert_type: 'phishing',
              severity: 'high',
              title: '⚠️ Unverified Cell Towers Detected',
              message: `Found ${criticalCount} unverified tower(s) nearby. These could be rogue towers. Cell IDs: ${criticalTowers.slice(0, 3).map(t => t.cell_id).join(', ')}`,
              status: 'active',
              affected_item: `${lat},${lon}`,
              recommendation: 'Avoid sensitive transactions. Enable VPN. Report suspicious towers.'
            });
          }
        } else {
          console.log('No session found, creating new one...');
          await base44.entities.SignalWatch.create({
            session_id: `SESSION_${Date.now()}`,
            monitoring_active: false,
            started_at: new Date().toISOString(),
            signal_history: [],
            anomalies_detected: [],
            total_towers_seen: towers.length,
            suspicious_towers_count: unverifiedCount
          });
        }

        return Response.json({
          success: true,
          towers,
          total: towers.length,
          unverified: unverifiedCount,
          critical: criticalCount,
          location: { lat, lon, range: range || 5000 }
        });
      } catch (error) {
        console.error('❌ Fetch towers error:', error);
        return Response.json({ 
          error: 'Failed to fetch cell towers: ' + error.message,
          towers: [],
          total: 0,
          unverified: 0,
          critical: 0
        }, { status: 500 });
      }
    }

    // POST /signal-watch/start
    if (endpoint === 'start') {
      try {
        console.log('Starting signal monitoring for:', user.email);

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

        try {
          const allReports = await base44.asServiceRole.entities.TowerReport.list();
          const similarReports = allReports.filter(r => {
            if (!r.geolocation?.latitude || !r.geolocation?.longitude) return false;
            const distance = Math.sqrt(
              Math.pow(r.geolocation.latitude - (tower_info.latitude || 0), 2) +
              Math.pow(r.geolocation.longitude - (tower_info.longitude || 0), 2)
            ) * 111;
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