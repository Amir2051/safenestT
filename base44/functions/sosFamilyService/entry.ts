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

    // Helper function to send email with retry logic
    async function sendEmailWithRetry(emailData, maxRetries = 3) {
      let lastError = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📧 Email attempt ${attempt} to ${emailData.to}`);
          
          await base44.integrations.Core.SendEmail({
            from_name: 'SafeNest Emergency Alert',
            to: emailData.to,
            subject: emailData.subject,
            body: emailData.body
          });
          
          console.log(`✅ Email sent successfully to ${emailData.to}`);
          return { success: true, attempts: attempt };
          
        } catch (error) {
          lastError = error;
          console.error(`❌ Email attempt ${attempt} failed:`, error.message);
          
          if (attempt < maxRetries) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      // Log failure to database
      try {
        await base44.asServiceRole.entities.FamilyAlert.create({
          group_id: emailData.group_id,
          member_email: user.email,
          alert_type: 'sos_emergency',
          severity: 'critical',
          title: '⚠️ Email Delivery Failed',
          description: `Failed to send SOS email to ${emailData.to} after ${maxRetries} attempts`,
          status: 'active',
          metadata: {
            error: lastError?.message,
            recipient: emailData.to,
            attempts: maxRetries
          }
        });
      } catch (logError) {
        console.error('Failed to log email error:', logError);
      }
      
      return { 
        success: false, 
        attempts: maxRetries, 
        error: lastError?.message 
      };
    }

    // Helper function to reverse geocode location
    async function reverseGeocode(lat, lon) {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${Deno.env.get('GOOGLE_MAPS_API_KEY')}`
        );
        const data = await response.json();
        
        if (data.results && data.results[0]) {
          return data.results[0].formatted_address;
        }
        return null;
      } catch (error) {
        console.error('Geocoding error:', error);
        return null;
      }
    }

    if (endpoint === 'trigger-sos') {
      const {
        group_id,
        member_email,
        member_name,
        location,
        has_audio,
        timestamp
      } = body;

      if (!group_id || !member_email) {
        return Response.json({ 
          error: 'Missing required fields: group_id, member_email' 
        }, { status: 400 });
      }

      console.log('🚨 SOS Alert Triggered:', { group_id, member_email, member_name });

      // Get family group details
      const groups = await base44.asServiceRole.entities.FamilyGroup.filter({ 
        group_id 
      });
      
      if (groups.length === 0) {
        return Response.json({ 
          error: 'Family group not found' 
        }, { status: 404 });
      }

      const group = groups[0];

      // Get all active family members (excluding the SOS sender)
      const allMembers = await base44.asServiceRole.entities.FamilyMember.filter({
        group_id,
        status: 'active'
      });

      const recipientMembers = allMembers.filter(m => 
        m.member_email !== member_email
      );

      console.log(`📨 Notifying ${recipientMembers.length} family members`);

      // Get or create location details
      let locationDetails = {
        latitude: null,
        longitude: null,
        address: 'Location unavailable',
        accuracy: null,
        battery_level: null,
        is_charging: false,
        timestamp: timestamp || new Date().toISOString()
      };

      if (location) {
        locationDetails = { ...locationDetails, ...location };
        
        // Reverse geocode to get address
        if (location.latitude && location.longitude) {
          const address = await reverseGeocode(location.latitude, location.longitude);
          if (address) {
            locationDetails.address = address;
          } else {
            locationDetails.address = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
          }

          // Update FamilyLocation with SOS flag
          try {
            await base44.asServiceRole.entities.FamilyLocation.create({
              group_id,
              user_id: member_email,
              member_email,
              member_name: member_name || member_email,
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy || 100,
              address: locationDetails.address,
              share_status: true,
              battery_level: location.battery_level,
              is_charging: location.is_charging || false,
              speed_kmh: location.speed_kmh,
              timestamp: locationDetails.timestamp,
              is_current: true,
              metadata: {
                sos_alert: true,
                triggered_at: timestamp
              }
            });
          } catch (locError) {
            console.error('Failed to update location:', locError);
          }
        }
      }

      // Create SOS alert in database
      const alertData = {
        group_id,
        member_email,
        alert_type: 'sos_emergency',
        severity: 'critical',
        title: `🆘 EMERGENCY: ${member_name || member_email} needs help!`,
        description: `${member_name || member_email} has triggered an emergency SOS alert. Their last known location has been shared with all family members.`,
        status: 'active',
        metadata: {
          location: locationDetails,
          has_audio,
          audio_url: location?.audio_url || null,
          notified_members: recipientMembers.map(m => m.member_email),
          timestamp
        }
      };

      let alert;
      try {
        alert = await base44.asServiceRole.entities.FamilyAlert.create(alertData);
        console.log('✅ SOS Alert created:', alert.id);
      } catch (alertError) {
        console.error('Failed to create alert:', alertError);
        return Response.json({ 
          error: 'Failed to create SOS alert',
          details: alertError.message
        }, { status: 500 });
      }

      // Prepare email details
      const currentTime = new Date(timestamp || Date.now()).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });

      const mapUrl = locationDetails.latitude && locationDetails.longitude
        ? `https://maps.google.com/?q=${locationDetails.latitude},${locationDetails.longitude}`
        : null;

      const navigationUrl = locationDetails.latitude && locationDetails.longitude
        ? `https://www.google.com/maps/dir/?api=1&destination=${locationDetails.latitude},${locationDetails.longitude}`
        : null;

      // Send emails to all family members
      const emailResults = [];
      
      for (const member of recipientMembers) {
        const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .alert-badge { background: #fef2f2; color: #991b1b; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; font-weight: bold; }
    .content { background: white; padding: 30px; border: 3px solid #fca5a5; border-radius: 0 0 10px 10px; }
    .location-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .location-box strong { color: #991b1b; }
    .button { display: inline-block; padding: 12px 30px; margin: 10px 5px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; }
    .button-primary { background: #ef4444; color: white; }
    .button-secondary { background: #3b82f6; color: white; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0; }
    .info-item { background: #f9fafb; padding: 12px; border-radius: 8px; border-left: 3px solid #06b6d4; }
    .info-item strong { display: block; color: #0e7490; margin-bottom: 5px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .warning { background: #fef3c7; border: 2px solid #fbbf24; color: #92400e; padding: 15px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 EMERGENCY SOS ALERT</h1>
      <div class="alert-badge">⚠️ IMMEDIATE ACTION REQUIRED</div>
    </div>
    
    <div class="content">
      <h2 style="color: #dc2626; margin-top: 0;">
        ${member_name || member_email} needs help!
      </h2>
      
      <p style="font-size: 16px;">
        <strong>${member_name || member_email}</strong> has triggered an emergency SOS alert through SafeNest Family Protection.
      </p>

      ${locationDetails.latitude && locationDetails.longitude ? `
        <div class="location-box">
          <strong>📍 Last Known Location:</strong><br>
          ${locationDetails.address}<br>
          <small style="color: #666;">
            Coordinates: ${locationDetails.latitude.toFixed(6)}, ${locationDetails.longitude.toFixed(6)}<br>
            ${locationDetails.accuracy ? `Accuracy: ±${Math.round(locationDetails.accuracy)}m` : ''}
          </small>
        </div>
      ` : `
        <div class="warning">
          ⚠️ Location information unavailable. Please try to contact them immediately.
        </div>
      `}

      <div class="info-grid">
        <div class="info-item">
          <strong>⏰ Alert Time</strong>
          ${currentTime}
        </div>
        
        ${locationDetails.battery_level ? `
          <div class="info-item">
            <strong>🔋 Battery Level</strong>
            ${locationDetails.battery_level}% ${locationDetails.is_charging ? '(Charging)' : ''}
          </div>
        ` : ''}
        
        <div class="info-item">
          <strong>👨‍👩‍👧‍👦 Family Group</strong>
          ${group.group_name}
        </div>
        
        ${has_audio ? `
          <div class="info-item">
            <strong>🎤 Audio Recording</strong>
            Available (10 seconds)
          </div>
        ` : ''}
      </div>

      <div class="warning">
        <strong>🚨 RECOMMENDED ACTIONS:</strong>
        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
          <li>Contact ${member_name || member_email} immediately via phone call</li>
          <li>Coordinate with other family members</li>
          <li>If unable to reach them, consider contacting local authorities</li>
          ${mapUrl ? '<li>Use the location map below to find them</li>' : ''}
        </ul>
      </div>

      ${mapUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${mapUrl}" class="button button-primary">
            📍 View on Map
          </a>
          ${navigationUrl ? `
            <a href="${navigationUrl}" class="button button-secondary">
              🧭 Get Directions
            </a>
          ` : ''}
        </div>
      ` : ''}

      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin-top: 20px; border-radius: 5px;">
        <strong>💡 About SOS Alerts:</strong><br>
        This alert was automatically sent to all active family members in your SafeNest group.
        All SOS alerts are logged for safety and review purposes.
      </div>
    </div>
    
    <div class="footer">
      <p>This is an automated emergency notification from SafeNest Family Protection</p>
      <p>SafeNest - Protecting Families Together</p>
      <p style="color: #999; font-size: 11px;">
        Alert ID: ${alert.id} | Group: ${group.group_name}
      </p>
    </div>
  </div>
</body>
</html>
        `;

        const emailResult = await sendEmailWithRetry({
          to: member.member_email,
          subject: `🚨 EMERGENCY SOS ALERT from ${member_name || member_email}`,
          body: emailBody,
          group_id
        });

        emailResults.push({
          recipient: member.member_email,
          recipient_name: member.member_name,
          ...emailResult
        });
      }

      // Count successful and failed emails
      const successCount = emailResults.filter(r => r.success).length;
      const failedCount = emailResults.filter(r => !r.success).length;

      console.log(`📊 Email Results: ${successCount} sent, ${failedCount} failed`);

      return Response.json({
        success: true,
        message: 'SOS alert triggered successfully',
        alert_id: alert.id,
        notifications: {
          total: recipientMembers.length,
          sent: successCount,
          failed: failedCount,
          results: emailResults
        },
        location: locationDetails,
        has_audio,
        timestamp
      });

    } else if (endpoint === 'get-sos-history') {
      const { group_id, limit = 50 } = body;

      if (!group_id) {
        return Response.json({ 
          error: 'Missing required field: group_id' 
        }, { status: 400 });
      }

      const alerts = await base44.entities.FamilyAlert.filter({
        group_id,
        alert_type: 'sos_emergency'
      }, '-created_date', limit);

      return Response.json({
        success: true,
        alerts
      });

    } else if (endpoint === 'get-sos-settings') {
      // Get user's SOS notification preferences
      const settings = await base44.entities.FamilyMember.filter({
        member_email: user.email
      });

      if (settings.length === 0) {
        return Response.json({
          success: true,
          settings: {
            email_enabled: true,
            sms_enabled: false,
            push_enabled: true,
            auto_share_location: true,
            audio_recording: true
          }
        });
      }

      return Response.json({
        success: true,
        settings: settings[0].sos_settings || {
          email_enabled: true,
          sms_enabled: false,
          push_enabled: true,
          auto_share_location: true,
          audio_recording: true
        }
      });

    } else if (endpoint === 'update-sos-settings') {
      const { group_id, settings } = body;

      if (!group_id || !settings) {
        return Response.json({ 
          error: 'Missing required fields' 
        }, { status: 400 });
      }

      // Update member's SOS settings
      const members = await base44.entities.FamilyMember.filter({
        group_id,
        member_email: user.email
      });

      if (members.length === 0) {
        return Response.json({ 
          error: 'Member not found' 
        }, { status: 404 });
      }

      await base44.entities.FamilyMember.update(members[0].id, {
        sos_settings: settings
      });

      return Response.json({
        success: true,
        message: 'SOS settings updated successfully',
        settings
      });

    } else {
      return Response.json({ 
        error: 'Unknown endpoint' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ SOS Service Error:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});