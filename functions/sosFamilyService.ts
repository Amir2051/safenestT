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

    console.log('🆘 SOS Service - Endpoint:', endpoint);

    // ==================== TRIGGER SOS ====================
    if (endpoint === 'trigger-sos') {
      const { group_id, member_email, member_name, location, has_audio, timestamp } = body;

      if (!group_id || !member_email) {
        return Response.json({ 
          error: 'Missing required fields: group_id, member_email' 
        }, { status: 400 });
      }

      console.log('🆘 SOS triggered by:', member_name, member_email);

      // 1. Get family group and all members
      const familyGroup = await base44.asServiceRole.entities.FamilyGroup.filter({ 
        group_id 
      });
      
      if (familyGroup.length === 0) {
        return Response.json({ error: 'Family group not found' }, { status: 404 });
      }

      const group = familyGroup[0];
      
      const familyMembers = await base44.asServiceRole.entities.FamilyMember.filter({ 
        group_id,
        status: 'active'
      });

      // 2. Update location if provided
      let locationRecord = null;
      let address = null;

      if (location) {
        // Reverse geocode to get address
        try {
          const geocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`,
            { headers: { 'User-Agent': 'SafeNest-Family-SOS/1.0' } }
          );
          
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            address = geocodeData.display_name || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
          }
        } catch (e) {
          console.error('Geocoding error:', e);
          address = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
        }

        // Mark all previous locations as not current
        const previousLocations = await base44.asServiceRole.entities.FamilyLocation.filter({
          group_id,
          user_id: member_email,
          is_current: true
        });

        for (const prevLoc of previousLocations) {
          await base44.asServiceRole.entities.FamilyLocation.update(prevLoc.id, {
            is_current: false
          });
        }

        // Create new location record
        locationRecord = await base44.asServiceRole.entities.FamilyLocation.create({
          group_id,
          user_id: member_email,
          member_email,
          member_name,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 10,
          address,
          share_status: true,
          battery_level: location.battery_level || null,
          is_charging: location.is_charging || false,
          speed_kmh: location.speed_kmh || null,
          timestamp: timestamp || new Date().toISOString(),
          is_current: true,
          device_info: {
            sos_triggered: true,
            has_audio: has_audio || false,
            audio_url: location.audio_url || null
          }
        });

        console.log('📍 Location shared:', address);
      }

      // 3. Create SOS alert
      const sosAlert = await base44.asServiceRole.entities.FamilyAlert.create({
        group_id,
        member_email,
        alert_type: 'sos_emergency',
        severity: 'critical',
        title: `🆘 EMERGENCY - ${member_name} triggered SOS`,
        description: location 
          ? `${member_name} has triggered an emergency SOS alert from: ${address}`
          : `${member_name} has triggered an emergency SOS alert. Location unavailable.`,
        status: 'active',
        metadata: {
          location: location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            address,
            battery_level: location.battery_level,
            speed_kmh: location.speed_kmh
          } : null,
          has_audio: has_audio || false,
          audio_url: location?.audio_url || null,
          timestamp: timestamp || new Date().toISOString(),
          location_id: locationRecord?.id || null
        },
        notified_members: []
      });

      console.log('🚨 SOS Alert created:', sosAlert.id);

      // 4. Send notifications to all family members (except the person who triggered)
      const notificationPromises = familyMembers
        .filter(member => member.member_email !== member_email)
        .map(async (member) => {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: 'SafeNest Family SOS',
              to: member.member_email,
              subject: `🆘 EMERGENCY ALERT - ${member_name} needs help!`,
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 32px;">🆘 EMERGENCY SOS ALERT</h1>
                  </div>
                  
                  <div style="background: #fff; padding: 30px; border: 3px solid #dc2626; border-radius: 0 0 10px 10px;">
                    <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
                      <h2 style="color: #991b1b; margin-top: 0;">⚠️ ${member_name} Triggered Emergency SOS</h2>
                      <p style="color: #7f1d1d; font-size: 16px; margin-bottom: 0;">
                        This is a real emergency alert from your family member. Please take immediate action.
                      </p>
                    </div>

                    ${location ? `
                      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="color: #78350f; margin-top: 0;">📍 Last Known Location:</h3>
                        <p style="color: #92400e; margin: 5px 0; font-family: monospace;">
                          ${address}
                        </p>
                        <p style="color: #92400e; margin: 5px 0;">
                          <strong>Coordinates:</strong> ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
                        </p>
                        ${location.battery_level ? `
                          <p style="color: #92400e; margin: 5px 0;">
                            <strong>Battery:</strong> ${location.battery_level}% ${location.is_charging ? '(Charging)' : ''}
                          </p>
                        ` : ''}
                        <a href="https://www.google.com/maps?q=${location.latitude},${location.longitude}" 
                           style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; font-weight: bold;">
                          📍 View Location on Map
                        </a>
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}" 
                           style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; margin-left: 10px; font-weight: bold;">
                          🧭 Get Directions
                        </a>
                      </div>
                    ` : `
                      <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="color: #991b1b; margin: 0;">
                          ⚠️ Location information unavailable. Please contact ${member_name} immediately.
                        </p>
                      </div>
                    `}

                    ${has_audio ? `
                      <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="color: #1e3a8a; margin: 0;">
                          🎤 Audio recording available - check the SafeNest app for details
                        </p>
                      </div>
                    ` : ''}

                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px;">
                      <h3 style="color: #374151; margin-top: 0;">Immediate Actions:</h3>
                      <ol style="color: #4b5563; line-height: 1.8;">
                        <li>Try to contact ${member_name} immediately via phone</li>
                        <li>Check their location on the SafeNest Family Map</li>
                        <li>If unable to reach them, consider contacting local authorities</li>
                        <li>Coordinate with other family members</li>
                      </ol>
                    </div>

                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                      <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                        Alert triggered: ${new Date(timestamp || new Date()).toLocaleString()}
                      </p>
                      <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">
                        SafeNest Family Protection System
                      </p>
                    </div>
                  </div>
                </div>
              `
            });

            console.log('📧 Notification sent to:', member.member_email);
            
            return member.member_email;
          } catch (emailError) {
            console.error('Failed to send notification to', member.member_email, emailError);
            return null;
          }
        });

      const notifiedEmails = (await Promise.all(notificationPromises)).filter(Boolean);

      // Update alert with notified members
      await base44.asServiceRole.entities.FamilyAlert.update(sosAlert.id, {
        notified_members: notifiedEmails
      });

      console.log('✅ SOS process completed - notified', notifiedEmails.length, 'members');

      return Response.json({
        success: true,
        message: 'SOS alert sent successfully',
        alert_id: sosAlert.id,
        location_id: locationRecord?.id || null,
        notified_count: notifiedEmails.length,
        notified_members: notifiedEmails,
        has_location: !!location,
        has_audio: has_audio || false
      });
    }

    // ==================== GET SOS HISTORY ====================
    if (endpoint === 'get-sos-history') {
      const { group_id, limit = 20 } = body;

      if (!group_id) {
        return Response.json({ error: 'group_id required' }, { status: 400 });
      }

      const sosAlerts = await base44.entities.FamilyAlert.filter({
        group_id,
        alert_type: 'sos_emergency'
      }, '-created_date', limit);

      return Response.json({
        success: true,
        alerts: sosAlerts
      });
    }

    return Response.json({ error: 'Invalid endpoint' }, { status: 400 });

  } catch (error) {
    console.error('🆘 SOS Service Error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 });
  }
});