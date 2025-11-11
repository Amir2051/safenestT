import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Reverse geocode coordinates to address
async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    const data = await response.json();
    return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  } catch (error) {
    console.error('Geocoding error:', error);
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { endpoint, ...params } = body;
    
    // POST /location/update - Update member location
    if (endpoint === 'update-location') {
      const { group_id, latitude, longitude, accuracy, battery_level, is_charging } = params;
      
      if (!group_id || latitude === undefined || longitude === undefined) {
        return Response.json({ error: 'Missing required parameters' }, { status: 400 });
      }
      
      // Verify member belongs to group
      const memberships = await base44.entities.FamilyMember.filter({
        group_id,
        member_email: user.email,
        status: 'active'
      });
      
      if (memberships.length === 0) {
        return Response.json({ error: 'Not a member of this family group' }, { status: 403 });
      }
      
      // Mark previous locations as not current
      const previousLocations = await base44.asServiceRole.entities.FamilyLocation.filter({
        group_id,
        member_email: user.email,
        is_current: true
      });
      
      for (const loc of previousLocations) {
        await base44.asServiceRole.entities.FamilyLocation.update(loc.id, {
          is_current: false
        });
      }
      
      // Get address
      const address = await reverseGeocode(latitude, longitude);
      
      // Create new location record
      const location = await base44.entities.FamilyLocation.create({
        group_id,
        member_email: user.email,
        member_name: user.full_name,
        latitude,
        longitude,
        accuracy: accuracy || 10,
        address,
        battery_level: battery_level || null,
        is_charging: is_charging || false,
        timestamp: new Date().toISOString(),
        is_current: true,
        device_info: {
          device_type: 'web',
          os: 'browser',
          app_version: '1.0'
        }
      });
      
      // Check geofences
      const geofences = await base44.asServiceRole.entities.Geofence.filter({
        group_id,
        active: true
      });
      
      const triggeredGeofences = [];
      
      for (const fence of geofences) {
        if (!fence.monitored_members.includes(user.email)) {
          continue;
        }
        
        const distance = calculateDistance(
          latitude,
          longitude,
          fence.center_latitude,
          fence.center_longitude
        );
        
        const isInside = distance <= fence.radius_meters;
        
        // Check if member crossed boundary
        if (previousLocations.length > 0) {
          const prevLocation = previousLocations[0];
          const prevDistance = calculateDistance(
            prevLocation.latitude,
            prevLocation.longitude,
            fence.center_latitude,
            fence.center_longitude
          );
          const wasInside = prevDistance <= fence.radius_meters;
          
          if (!wasInside && isInside && fence.notify_on_enter) {
            triggeredGeofences.push({
              fence,
              event: 'entered',
              distance
            });
          } else if (wasInside && !isInside && fence.notify_on_exit) {
            triggeredGeofences.push({
              fence,
              event: 'exited',
              distance
            });
          }
        }
      }
      
      // Send notifications for triggered geofences
      for (const { fence, event } of triggeredGeofences) {
        await base44.asServiceRole.entities.Geofence.update(fence.id, {
          last_triggered: new Date().toISOString(),
          trigger_count: (fence.trigger_count || 0) + 1
        });
        
        // Create family alert
        await base44.asServiceRole.entities.FamilyAlert.create({
          group_id,
          member_email: user.email,
          alert_type: 'location_alert',
          severity: fence.zone_type === 'restricted_zone' ? 'high' : 'medium',
          title: `${user.full_name} ${event} ${fence.zone_name}`,
          description: `Location: ${address}`,
          status: 'active',
          metadata: {
            fence_name: fence.zone_name,
            event,
            latitude,
            longitude,
            address
          }
        });
        
        // Get family admin
        const groups = await base44.asServiceRole.entities.FamilyGroup.filter({ group_id });
        if (groups.length > 0) {
          const group = groups[0];
          
          try {
            await base44.integrations.Core.SendEmail({
              to: group.primary_account_holder,
              subject: `📍 ${user.full_name} ${event} ${fence.zone_name}`,
              body: `
                <h2>Geofence Alert</h2>
                <p><strong>${user.full_name}</strong> has ${event} the geofence zone <strong>${fence.zone_name}</strong>.</p>
                <p><strong>Location:</strong> ${address}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                ${battery_level ? `<p><strong>Battery:</strong> ${battery_level}%</p>` : ''}
              `
            });
          } catch (emailError) {
            console.error('Failed to send geofence notification:', emailError);
          }
        }
      }
      
      return Response.json({
        success: true,
        location,
        triggered_geofences: triggeredGeofences.map(t => ({
          zone_name: t.fence.zone_name,
          event: t.event
        }))
      });
    }
    
    // GET /location/family - Get all family member locations
    if (endpoint === 'get-family-locations') {
      const { group_id } = params;
      
      if (!group_id) {
        return Response.json({ error: 'Missing group_id' }, { status: 400 });
      }
      
      // Verify user is in group
      const memberships = await base44.entities.FamilyMember.filter({
        group_id,
        member_email: user.email
      });
      
      if (memberships.length === 0) {
        return Response.json({ error: 'Not authorized' }, { status: 403 });
      }
      
      // Get current locations for all members
      const locations = await base44.asServiceRole.entities.FamilyLocation.filter({
        group_id,
        is_current: true
      });
      
      return Response.json({
        success: true,
        locations
      });
    }
    
    // GET /location/history - Get location history
    if (endpoint === 'get-location-history') {
      const { group_id, member_email, hours } = params;
      
      const memberships = await base44.entities.FamilyMember.filter({
        group_id,
        member_email: user.email
      });
      
      if (memberships.length === 0) {
        return Response.json({ error: 'Not authorized' }, { status: 403 });
      }
      
      const since = new Date();
      since.setHours(since.getHours() - (hours || 24));
      
      const locations = await base44.asServiceRole.entities.FamilyLocation.filter({
        group_id,
        member_email: member_email || user.email
      }, '-timestamp', 100);
      
      const filtered = locations.filter(loc => 
        new Date(loc.timestamp) >= since
      );
      
      return Response.json({
        success: true,
        locations: filtered
      });
    }
    
    return Response.json({ error: 'Unknown endpoint' }, { status: 404 });
    
  } catch (error) {
    console.error('Location service error:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});