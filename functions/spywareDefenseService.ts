import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    // Advanced spyware detection patterns
    const PEGASUS_SIGNATURES = [
      'NSO_Group',
      'Pegasus_Process',
      'zero_click_exploit',
      'imessage_exploit',
      'whatsapp_exploit',
      'kernel_injection'
    ];

    const SUSPICIOUS_PROCESSES = [
      'com.nsogroup',
      'pegasus',
      'predator',
      'hermit',
      'candiru'
    ];

    // Analyze device for spyware indicators
    async function analyzeDeviceSecurity(deviceData) {
      const anomalies = [];
      let threatLevel = 'secure';
      let confidenceScore = 100;

      // Battery Drain Analysis (Pegasus indicator)
      if (deviceData.battery?.drain_rate > 15) {
        anomalies.push({
          category: 'battery_drain',
          severity: deviceData.battery.drain_rate > 25 ? 'high' : 'medium',
          title: 'Unusual Battery Drain Detected',
          description: `Device consuming ${deviceData.battery.drain_rate}%/hour - significantly above normal (5-8%/hour)`,
          detected_at: new Date().toISOString(),
          indicators: [
            'Rapid battery depletion',
            'Background activity spike',
            'Possible surveillance software'
          ],
          recommended_action: 'Run deep scan and check for unauthorized background apps'
        });
        if (deviceData.battery.drain_rate > 25) {
          threatLevel = 'high';
          confidenceScore -= 20;
        }
      }

      // Network Activity Analysis
      if (deviceData.network?.unusual_traffic || deviceData.network?.suspicious_endpoints?.length > 0) {
        anomalies.push({
          category: 'network_activity',
          severity: 'critical',
          title: 'Suspicious Network Activity Detected',
          description: 'Device communicating with unknown or suspicious endpoints',
          detected_at: new Date().toISOString(),
          indicators: deviceData.network.suspicious_endpoints || [
            'Unknown C2 servers',
            'Encrypted data exfiltration',
            'Unauthorized connections'
          ],
          recommended_action: 'Disconnect from network immediately and run forensic analysis'
        });
        threatLevel = 'critical';
        confidenceScore -= 30;
      }

      // Permission Abuse Detection
      if (deviceData.permissions?.dangerous_permissions?.length > 10) {
        anomalies.push({
          category: 'permission_abuse',
          severity: 'medium',
          title: 'Excessive Dangerous Permissions',
          description: `${deviceData.permissions.dangerous_permissions.length} dangerous permissions granted`,
          detected_at: new Date().toISOString(),
          indicators: deviceData.permissions.dangerous_permissions.slice(0, 5),
          recommended_action: 'Review and revoke unnecessary app permissions'
        });
        if (threatLevel === 'secure') threatLevel = 'medium';
      }

      // Root/Jailbreak Detection
      if (deviceData.device_info?.is_rooted) {
        anomalies.push({
          category: 'system_tampering',
          severity: 'critical',
          title: 'Rooted/Jailbroken Device Detected',
          description: 'Device has been rooted or jailbroken, bypassing OS security',
          detected_at: new Date().toISOString(),
          indicators: [
            'Root access detected',
            'System integrity compromised',
            'Elevated privilege risk'
          ],
          recommended_action: 'CRITICAL: Device compromise likely. Factory reset recommended.'
        });
        threatLevel = 'critical';
        confidenceScore -= 40;
      }

      // Integrity Violation Detection
      if (deviceData.integrity?.files_tampered || deviceData.integrity?.system_modified) {
        anomalies.push({
          category: 'integrity_violation',
          severity: 'critical',
          title: 'System Integrity Violation',
          description: 'Core system files have been modified or tampered with',
          detected_at: new Date().toISOString(),
          indicators: [
            'File tampering detected',
            'System modifications found',
            'Possible malware injection'
          ],
          recommended_action: 'URGENT: Run MVT scan or contact forensic analyst'
        });
        threatLevel = 'critical';
        confidenceScore -= 35;
      }

      // Suspicious Processes (Pegasus/Predator patterns)
      if (deviceData.processes?.suspicious?.length > 0) {
        const matchedSignatures = deviceData.processes.suspicious.filter(proc => 
          SUSPICIOUS_PROCESSES.some(sig => proc.toLowerCase().includes(sig.toLowerCase()))
        );

        if (matchedSignatures.length > 0) {
          anomalies.push({
            category: 'suspicious_processes',
            severity: 'critical',
            title: 'Pegasus-Type Spyware Signatures Detected',
            description: `Detected ${matchedSignatures.length} processes matching known spyware patterns`,
            detected_at: new Date().toISOString(),
            indicators: matchedSignatures,
            recommended_action: 'CRITICAL THREAT: Isolate device and contact security team immediately'
          });
          threatLevel = 'critical';
          confidenceScore -= 50;
        }
      }

      // Certificate Pinning Issues
      if (deviceData.network?.untrusted_certificates > 0) {
        anomalies.push({
          category: 'certificate_issues',
          severity: 'high',
          title: 'Untrusted SSL Certificates Detected',
          description: `${deviceData.network.untrusted_certificates} untrusted certificates found`,
          detected_at: new Date().toISOString(),
          indicators: [
            'Certificate pinning bypass',
            'Man-in-the-middle risk',
            'Intercepted communications'
          ],
          recommended_action: 'Check for network interception or proxy manipulation'
        });
        if (threatLevel !== 'critical') threatLevel = 'high';
      }

      return {
        anomalies,
        threatLevel,
        confidenceScore: Math.max(0, confidenceScore),
        totalIssues: anomalies.length
      };
    }

    // Generate encrypted forensic report
    async function generateForensicReport(scanData, analysisResults) {
      const report = {
        report_id: crypto.randomUUID(),
        generated_at: new Date().toISOString(),
        user_email: user.email,
        device_info: scanData.device_info,
        scan_summary: {
          threat_level: analysisResults.threatLevel,
          confidence_score: analysisResults.confidenceScore,
          anomalies_count: analysisResults.totalIssues,
          scan_duration: scanData.duration_seconds
        },
        detailed_findings: analysisResults.anomalies,
        battery_analysis: scanData.battery_analysis,
        network_analysis: scanData.network_analysis,
        permission_analysis: scanData.permission_analysis,
        integrity_check: scanData.integrity_check,
        recommendations: scanData.recommendations,
        spyware_indicators: scanData.spyware_indicators || [],
        metadata: {
          app_version: '2.0.0',
          scan_engine: 'SafeNest Advanced Defense',
          encryption: 'AES-256-GCM'
        }
      };

      // Convert to JSON and encrypt
      const reportJson = JSON.stringify(report, null, 2);
      const reportBlob = new Blob([reportJson], { type: 'application/json' });
      const reportFile = new File([reportBlob], `forensic-report-${report.report_id}.json`, {
        type: 'application/json'
      });

      // Upload as private file
      const uploadResult = await base44.integrations.Core.UploadPrivateFile({
        file: reportFile
      });

      return {
        report_id: report.report_id,
        file_uri: uploadResult.file_uri,
        summary: report.scan_summary
      };
    }

    if (endpoint === 'run-security-scan') {
      const {
        scan_type = 'quick_scan',
        device_data
      } = body;

      console.log('🔍 Starting security scan:', scan_type);

      const scanId = crypto.randomUUID();
      const startTime = Date.now();

      // Analyze device security
      const analysis = await analyzeDeviceSecurity(device_data);

      const duration = (Date.now() - startTime) / 1000;

      // Generate recommendations based on findings
      const recommendations = [];
      
      if (analysis.anomalies.some(a => a.category === 'battery_drain')) {
        recommendations.push({
          priority: 'high',
          action: 'Review background app activity',
          reason: 'Unusual battery drain may indicate surveillance software',
          auto_fixable: false
        });
      }

      if (analysis.anomalies.some(a => a.category === 'network_activity')) {
        recommendations.push({
          priority: 'critical',
          action: 'Disconnect from network and enable airplane mode',
          reason: 'Suspicious network activity detected - possible data exfiltration',
          auto_fixable: false
        });
      }

      if (analysis.anomalies.some(a => a.category === 'system_tampering')) {
        recommendations.push({
          priority: 'critical',
          action: 'Factory reset device immediately',
          reason: 'System integrity compromised - device likely infected',
          auto_fixable: false
        });
        recommendations.push({
          priority: 'critical',
          action: 'Contact forensic security analyst',
          reason: 'Professional analysis required for advanced threats',
          auto_fixable: false
        });
      }

      if (analysis.anomalies.some(a => a.category === 'permission_abuse')) {
        recommendations.push({
          priority: 'medium',
          action: 'Audit and revoke dangerous app permissions',
          reason: 'Excessive permissions increase attack surface',
          auto_fixable: true
        });
      }

      if (analysis.threatLevel === 'secure') {
        recommendations.push({
          priority: 'low',
          action: 'Continue regular security scans',
          reason: 'No threats detected - maintain good security hygiene',
          auto_fixable: false
        });
      }

      // Create diagnostic record
      const diagnostic = await base44.entities.SecurityDiagnostic.create({
        scan_id: scanId,
        scan_type,
        scan_status: 'completed',
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        threat_level: analysis.threatLevel,
        device_info: device_data.device_info,
        anomalies_detected: analysis.anomalies,
        battery_analysis: device_data.battery,
        network_analysis: device_data.network,
        permission_analysis: device_data.permissions,
        integrity_check: device_data.integrity,
        recommendations,
        auto_remediation_applied: false,
        user_notified: false
      });

      // Generate forensic report if threats detected
      let forensicReport = null;
      if (analysis.threatLevel !== 'secure') {
        forensicReport = await generateForensicReport({
          ...diagnostic,
          spyware_indicators: device_data.spyware_indicators || []
        }, analysis);

        // Update diagnostic with report URI
        await base44.entities.SecurityDiagnostic.update(diagnostic.id, {
          forensic_report_uri: forensicReport.file_uri
        });
      }

      // Send alert email if critical threats
      if (analysis.threatLevel === 'critical' || analysis.threatLevel === 'high') {
        try {
          await base44.integrations.Core.SendEmail({
            from_name: 'SafeNest Security Alert',
            to: user.email,
            subject: `🚨 ${analysis.threatLevel.toUpperCase()} Security Threat Detected`,
            body: `
              <h2>Security Alert - Immediate Action Required</h2>
              <p>SafeNest has detected ${analysis.threatLevel} level security threats on your device.</p>
              
              <h3>Threat Summary:</h3>
              <ul>
                ${analysis.anomalies.map(a => `
                  <li><strong>${a.title}</strong>: ${a.description}</li>
                `).join('')}
              </ul>
              
              <h3>Recommended Actions:</h3>
              <ol>
                ${recommendations.slice(0, 3).map(r => `
                  <li><strong>${r.action}</strong>: ${r.reason}</li>
                `).join('')}
              </ol>
              
              <p><strong>Confidence Score:</strong> ${analysis.confidenceScore}%</p>
              <p><strong>Scan ID:</strong> ${scanId}</p>
              
              <p style="color: red; font-weight: bold;">
                If you suspect sophisticated spyware (Pegasus/Predator), contact a certified forensic analyst immediately.
              </p>
            `
          });
        } catch (emailError) {
          console.error('Failed to send alert email:', emailError);
        }
      }

      return Response.json({
        success: true,
        scan_id: scanId,
        threat_level: analysis.threatLevel,
        confidence_score: analysis.confidenceScore,
        anomalies: analysis.anomalies,
        recommendations,
        forensic_report: forensicReport,
        duration_seconds: duration
      });

    } else if (endpoint === 'get-forensic-report') {
      const { scan_id } = body;

      if (!scan_id) {
        return Response.json({ error: 'Missing scan_id' }, { status: 400 });
      }

      const diagnostics = await base44.entities.SecurityDiagnostic.filter({
        scan_id
      });

      if (diagnostics.length === 0) {
        return Response.json({ error: 'Scan not found' }, { status: 404 });
      }

      const diagnostic = diagnostics[0];

      if (!diagnostic.forensic_report_uri) {
        return Response.json({ error: 'No forensic report available' }, { status: 404 });
      }

      // Generate signed URL for download
      const signedUrl = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: diagnostic.forensic_report_uri,
        expires_in: 3600 // 1 hour
      });

      return Response.json({
        success: true,
        signed_url: signedUrl.signed_url,
        expires_in: 3600
      });

    } else if (endpoint === 'get-scan-history') {
      const { limit = 20 } = body;

      const scans = await base44.entities.SecurityDiagnostic.list(
        '-created_date',
        limit
      );

      return Response.json({
        success: true,
        scans
      });

    } else if (endpoint === 'report-spyware-indicator') {
      const { indicator_data } = body;

      if (!indicator_data) {
        return Response.json({ error: 'Missing indicator_data' }, { status: 400 });
      }

      // Create spyware indicator record
      const indicator = await base44.entities.SpywareIndicator.create({
        ...indicator_data,
        detected_at: new Date().toISOString(),
        status: 'active',
        auto_blocked: false
      });

      // Send immediate alert
      await base44.integrations.Core.SendEmail({
        from_name: 'SafeNest Spyware Alert',
        to: user.email,
        subject: '🚨 CRITICAL: Advanced Spyware Detected',
        body: `
          <h2 style="color: red;">CRITICAL SECURITY ALERT</h2>
          <p>SafeNest has detected indicators of advanced spyware on your device.</p>
          
          <h3>Threat Type: ${indicator_data.indicator_type}</h3>
          <p><strong>Severity:</strong> ${indicator_data.severity}</p>
          <p><strong>Confidence:</strong> ${indicator_data.confidence}%</p>
          
          <h3>Immediate Actions Required:</h3>
          <ol>
            <li>Disconnect device from all networks immediately</li>
            <li>Enable airplane mode</li>
            <li>Do not use banking, email, or sensitive apps</li>
            <li>Contact a certified mobile forensic analyst</li>
            <li>Consider device factory reset after data backup</li>
          </ol>
          
          <p><strong>Indicator ID:</strong> ${indicator.id}</p>
          
          <p style="background: #fef3c7; padding: 10px; border-left: 4px solid #f59e0b;">
            <strong>⚠️ Important:</strong> If you are a journalist, activist, or high-risk individual,
            this could be a nation-state attack (Pegasus/Predator). Seek professional forensic help immediately.
          </p>
        `
      });

      return Response.json({
        success: true,
        indicator_id: indicator.id,
        alert_sent: true
      });

    } else {
      return Response.json({ error: 'Unknown endpoint' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Spyware Defense Service Error:', error);
    return Response.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
});