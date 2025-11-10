
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Simulated tower database (in production, use real carrier data)
const KNOWN_TOWERS = {
  'US-Verizon': ['310120', '311480'],
  'US-ATT': ['310410', '310170'],
  'US-TMobile': ['310260', '310160']
};

// Mock data for testing when API is unavailable
const generateMockTowers = (lat: number, lon: number, count = 15) => {
  const towers = [];
  const radios = ['5G', '4G', '3G', '2G'];
  const carriers = ['310260', '310410', '310120', '311480']; // T-Mobile, AT&T, Verizon (MCCMNC)
  
  for (let i = 0; i < count; i++) {
    const samples = Math.floor(Math.random() * 100);
    // Add some randomness to location
    const latOffset = (Math.random() - 0.5) * 0.05; // +/- 0.025 degrees, roughly 2.7km
    const lonOffset = (Math.random() - 0.5) * 0.05;
    
    const mccMnc = carriers[Math.floor(Math.random() * carriers.length)];
    const radio = radios[Math.floor(Math.random() * radios.length)];
    
    towers.push({
      // OpenCelliD v2 compatible fields (or close approximations)
      cell: 10000 + i, // Unique Cell ID for mock
      mcc: parseInt(mccMnc.substring(0, 3)),
      mnc: parseInt(mccMnc.substring(3)),
      lac: 1000 + Math.floor(Math.random() * 9000), // Location Area Code
      lat: lat + latOffset,
      lon: lon + lonOffset,
      averageSignal: -50 - Math.floor(Math.random() * 60), // RSSI value
      radio: radio,
      samples: samples,
      range: 500 + Math.floor(Math.random() * 2000), // Cell range in meters
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString(),
      updatedAt: new Date().toISOString(),
      changeable: Math.random() > 0.8 ? 1 : 0, // Mock for 'changeable' status
      cellId: 10000 + i, // Alternative cell ID field
      locationAreaCode: 1000 + Math.floor(Math.random() * 9000), // Alternative LAC field
      signalStrength: -50 - Math.floor(Math.random() * 60), // Alternative signal field
      radioType: radio, // Alternative radio field
      cellRange: 500 + Math.floor(Math.random() * 2000), // Alternative range field
    });
  }
  
  return towers;
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
        const { lat, lon, range, use_mock } = params;

        if (!lat || !lon) {
          return Response.json({ 
            error: 'Missing latitude or longitude' 
          }, { status: 400 });
        }

        console.log('Fetching towers:', { lat, lon, range: range || 5000, use_mock });

        let cellsArray: any[] = [];
        let usedMockData = false;
        let dataSource = 'unknown';

        const apiKey = Deno.env.get('OPENCELLID_TOKEN');
        
        if (use_mock || !apiKey) {
          console.log('Using mock data (API key missing or mock requested)');
          cellsArray = generateMockTowers(lat, lon);
          usedMockData = true;
          dataSource = 'mock';
        } else {
          // Attempt to fetch from OpenCelliD API with multiple endpoint formats
          const urls = [
            // OpenCelliD V2 API - Get cells in area (preferred for detailed data)
            `https://opencellid.org/cell/getInArea?key=${apiKey}&BBOX=${lon-0.05},${lat-0.05},${lon+0.05},${lat+0.05}&format=json&limit=50`,
            // OpenCelliD V2 API - Generic cells endpoint (might require different params, kept for robustness)
            `https://opencellid.org/api/cells?key=${apiKey}&lat=${lat}&lon=${lon}&range=${range || 5000}&format=json&limit=50`,
            // Unwired Labs (alternative provider with similar API structure)
            // Note: This endpoint typically expects a POST request and specific payload.
            // For simplicity, attempting a GET first as a fallback, or if the key format works.
            // A proper Unwired Labs integration would be a POST.
            // `https://us1.unwiredlabs.com/v2/process.php` - handled below as POST
          ];

          let apiSuccess = false;

          for (const url of urls) {
            try {
              console.log(`Trying API: ${url.split('?')[0].replace(apiKey, 'KEY_HIDDEN')}...`);
              const response = await fetch(url, {
                headers: {
                  'Accept': 'application/json'
                }
              });
              
              console.log('API response status:', response.status);
              
              if (response.ok) {
                const data = await response.json();
                console.log('API raw response sample:', JSON.stringify(data).substring(0, 300) + (JSON.stringify(data).length > 300 ? '...' : ''));
                
                // Handle different response formats (OpenCelliD v2 can return array or object with 'cells' property)
                if (Array.isArray(data)) {
                  cellsArray = data;
                } else if (data.cells && Array.isArray(data.cells)) {
                  cellsArray = data.cells;
                } else if (data.cell) { // Sometimes a single cell might be returned directly
                  cellsArray = [data.cell];
                }
                
                if (cellsArray.length > 0) {
                  apiSuccess = true;
                  dataSource = 'opencellid';
                  console.log(`✅ Successfully fetched ${cellsArray.length} towers from ${dataSource}`);
                  break; // Stop trying other URLs if one succeeds
                }
              } else {
                const errorText = await response.text();
                console.warn(`API call to ${url.split('?')[0]} failed with status ${response.status}: ${errorText}`);
              }
            } catch (error) {
              console.warn(`API call to ${url.split('?')[0]} caught error: ${error.message}`);
            }
          }

          // Special handling for Unwired Labs (POST request structure) if others failed
          if (!apiSuccess && apiKey) {
            try {
              console.log('Trying Unwired Labs API (POST request)...');
              const unwiredLabsUrl = `https://us1.unwiredlabs.com/v2/process.php`;
              const response = await fetch(unwiredLabsUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify({
                  token: apiKey,
                  radio: 'all', // Request all radio types
                  lat: lat,
                  lon: lon,
                  limit: 50 // Limit results
                })
              });
              
              console.log('Unwired Labs API response status:', response.status);
              
              if (response.ok) {
                const data = await response.json();
                console.log('Unwired Labs raw response sample:', JSON.stringify(data).substring(0, 300) + (JSON.stringify(data).length > 300 ? '...' : ''));
                
                if (data.cells && Array.isArray(data.cells)) {
                  cellsArray = data.cells;
                  apiSuccess = true;
                  dataSource = 'unwiredlabs';
                  console.log(`✅ Successfully fetched ${cellsArray.length} towers from ${dataSource}`);
                }
              } else {
                const errorText = await response.text();
                console.warn(`Unwired Labs API POST failed with status ${response.status}: ${errorText}`);
              }
            } catch (error) {
              console.warn(`Unwired Labs API POST caught error: ${error.message}`);
            }
          }

          // Fallback to mock data if all APIs fail or return no data
          if (!apiSuccess || cellsArray.length === 0) {
            console.log('⚠️ All APIs failed or returned no data, using mock data as fallback');
            cellsArray = generateMockTowers(lat, lon);
            usedMockData = true;
            dataSource = 'mock_fallback';
          }
        }

        console.log(`Processing ${cellsArray.length} cells from ${dataSource}...`);

        // Process towers with robust field mapping for various API responses
        const towers = cellsArray.map((cell, idx) => {
          // Samples
          const samples = cell.samples || cell.numberOfSamples || cell.sampleCount || 0;
          const isUnverified = samples < 5;
          
          // MCC/MNC handling
          const mcc = String(cell.mcc || cell.MCC || '').trim();
          const mnc = String(cell.mnc || cell.MNC || '').trim();
          const mccMnc = `${mcc}${mnc}`;
          const isKnownCarrier = Object.values(KNOWN_TOWERS).flat().includes(mccMnc);

          // Cell ID handling (various possible field names)
          const cellId = String(cell.cell || cell.cellid || cell.cellId || cell.ci || cell.CID || `${cell.lac || 0}-${cell.cid || idx}`);

          // Location handling
          const latitude = parseFloat(cell.lat || cell.latitude || cell.Lat || 0);
          const longitude = parseFloat(cell.lon || cell.longitude || cell.Lon || 0);

          // Signal handling
          const signal = parseFloat(cell.averageSignal || cell.signal || cell.signalStrength || cell.rssi || cell.RSSI || -85);

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
            range: cell.range || cell.cellRange || 1000, // cellRange for OpenCelliD v2
            changeable: cell.changeable || 0,
            created: cell.created || cell.createdAt || 0, // createdAt for OpenCelliD v2
            updated: cell.updated || cell.updatedAt || 0, // updatedAt for OpenCelliD v2
            is_unverified: isUnverified,
            is_known_carrier: isKnownCarrier,
            warning_level: isUnverified && !isKnownCarrier ? 'critical' : 
                           isUnverified ? 'high' : 
                           !isKnownCarrier ? 'medium' : 'none'
          };
        });

        console.log('✅ Processed', towers.length, 'towers successfully');
        if (towers.length > 0) {
          console.log('Sample processed tower:', JSON.stringify(towers[0]).substring(0, 500) + (JSON.stringify(towers[0]).length > 500 ? '...' : ''));
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
            // Reset counts for fetch-towers as it's a new scan, not incremental logging
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
          console.log('No session found for user, creating one...');
          await base44.entities.SignalWatch.create({
            session_id: `SESSION_${Date.now()}`,
            monitoring_active: false, // Not active just from fetching towers
            started_at: new Date().toISOString(),
            signal_history: [],
            anomalies_detected: [],
            total_towers_seen: towers.length,
            suspicious_towers_count: unverifiedCount,
            tower_data: towers.length > 0 ? towers[0] : null,
            signal_health_score: 100 // Initialize health score
          });
        }

        return Response.json({
          success: true,
          towers,
          total: towers.length,
          unverified: unverifiedCount,
          critical: criticalCount,
          location: { lat, lon, range: range || 5000 },
          data_source: dataSource,
          note: usedMockData ? 'Using mock data for demonstration. Set OPENCELLID_TOKEN for real data.' : undefined
        });
      } catch (error) {
        console.error('❌ Fetch towers error:', error);
        
        // Always return mock data as fallback on any error during API calls or processing
        console.log('Returning mock data as error fallback due to:', error.message);
        const mockTowers = generateMockTowers(params.lat, params.lon);
        
        // Process mock towers to match the expected output format
        const processedMockTowers = mockTowers.map(cell => {
          const samples = cell.samples;
          const isUnverified = samples < 5;
          const mccMnc = `${cell.mcc}${cell.mnc}`;
          const isKnownCarrier = Object.values(KNOWN_TOWERS).flat().includes(mccMnc);

          return {
            cell_id: String(cell.cell),
            mcc: String(cell.mcc),
            mnc: String(cell.mnc),
            lac: String(cell.lac),
            cid: '', // Mock data doesn't always have a separate cid
            signal: cell.averageSignal,
            radio: cell.radio,
            latitude: cell.lat,
            longitude: cell.lon,
            samples: samples,
            range: cell.range,
            changeable: 0,
            created: 0,
            updated: 0,
            is_unverified: isUnverified,
            is_known_carrier: isKnownCarrier,
            warning_level: isUnverified && !isKnownCarrier ? 'critical' : 
                           isUnverified ? 'high' : 
                           !isKnownCarrier ? 'medium' : 'none'
          };
        });
        
        return Response.json({ 
          success: true,
          towers: processedMockTowers,
          total: processedMockTowers.length,
          unverified: processedMockTowers.filter(t => t.is_unverified).length,
          critical: processedMockTowers.filter(t => t.warning_level === 'critical').length,
          location: { lat: params.lat, lon: params.lon, range: 5000 },
          data_source: 'mock_error_fallback',
          note: 'API error occurred. Returning mock data for demonstration.',
          error_details: error.message
        });
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
        const newHealthScore = Math.max(0, Math.min(100, (session.signal_health_score || 100) + healthImpact));

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
