import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const { endpoint, ...params } = body;

    const base44 = createClientFromRequest(req);

    // Generate tracking link (admin only)
    if (endpoint === 'generate') {
      const user = await base44.auth.me();
      if (!user || (user.role !== 'admin' && !user.is_admin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { case_id } = params;
      if (!case_id) {
        return Response.json({ error: 'Case ID required' }, { status: 400 });
      }

      // Check if tracking link already exists for this case
      const existing = await base44.asServiceRole.entities.TrackingLink.filter({ case_id });
      if (existing && existing.length > 0) {
        return Response.json({ 
          tracking_link: existing[0],
          url: `${url.origin}/TrackingPage?t=${existing[0].tracking_code}`
        });
      }

      // Generate unique tracking code
      const tracking_code = `CASE-${case_id.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      const trackingLink = await base44.asServiceRole.entities.TrackingLink.create({
        case_id,
        tracking_code,
        clicks: [],
        total_clicks: 0,
        status: 'active',
        created_by: user.email
      });

      return Response.json({ 
        tracking_link: trackingLink,
        url: `${url.origin}/TrackingPage?t=${tracking_code}`
      });
    }

    // Log click (public - no auth required)
    if (endpoint === 'log-click') {
      const { tracking_code, visitor_data } = params;
      
      if (!tracking_code) {
        return Response.json({ error: 'Tracking code required' }, { status: 400 });
      }

      // Find tracking link
      const links = await base44.asServiceRole.entities.TrackingLink.filter({ tracking_code });
      if (!links || links.length === 0) {
        return Response.json({ error: 'Invalid tracking code' }, { status: 404 });
      }

      const link = links[0];
      if (link.status !== 'active') {
        return Response.json({ error: 'Link disabled' }, { status: 403 });
      }

      // Get IP from headers
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                 req.headers.get('x-real-ip') || 
                 req.headers.get('cf-connecting-ip') ||
                 'Unknown';

      // Fetch geo data from IP
      let geoData = { country: 'Unknown', city: 'Unknown', region: 'Unknown' };
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`);
        const geo = await geoResponse.json();
        if (geo.status === 'success') {
          geoData = {
            country: geo.country || 'Unknown',
            city: geo.city || 'Unknown',
            region: geo.regionName || 'Unknown'
          };
        }
      } catch (e) {
        console.error('Geo lookup failed:', e);
      }

      // Parse user agent
      const userAgent = visitor_data?.user_agent || 'Unknown';
      let device_type = 'Unknown';
      let browser = 'Unknown';
      let os = 'Unknown';

      if (userAgent !== 'Unknown') {
        // Device detection
        if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
          device_type = /iPad|Tablet/i.test(userAgent) ? 'Tablet' : 'Mobile';
        } else {
          device_type = 'Desktop';
        }

        // Browser detection
        if (/Chrome/i.test(userAgent) && !/Edge|OPR/i.test(userAgent)) browser = 'Chrome';
        else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
        else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
        else if (/Edge/i.test(userAgent)) browser = 'Edge';
        else if (/OPR|Opera/i.test(userAgent)) browser = 'Opera';

        // OS detection
        if (/Windows/i.test(userAgent)) os = 'Windows';
        else if (/Mac OS/i.test(userAgent)) os = 'macOS';
        else if (/Android/i.test(userAgent)) os = 'Android';
        else if (/iPhone|iPad/i.test(userAgent)) os = 'iOS';
        else if (/Linux/i.test(userAgent)) os = 'Linux';
      }

      const clickData = {
        timestamp: new Date().toISOString(),
        ip_address: ip,
        country: geoData.country,
        city: geoData.city,
        region: geoData.region,
        device_type,
        browser,
        os,
        user_agent: userAgent,
        referrer: visitor_data?.referrer || 'Direct'
      };

      // Update tracking link with new click
      const updatedClicks = [...(link.clicks || []), clickData];
      await base44.asServiceRole.entities.TrackingLink.update(link.id, {
        clicks: updatedClicks,
        total_clicks: updatedClicks.length
      });

      return Response.json({ success: true });
    }

    // Get tracking data for a case (admin only)
    if (endpoint === 'get-tracking-data') {
      const user = await base44.auth.me();
      if (!user || (user.role !== 'admin' && !user.is_admin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { case_id } = params;
      const links = await base44.asServiceRole.entities.TrackingLink.filter({ case_id });
      
      return Response.json({ tracking_links: links });
    }

    // Disable tracking link
    if (endpoint === 'disable') {
      const user = await base44.auth.me();
      if (!user || (user.role !== 'admin' && !user.is_admin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { tracking_id } = params;
      await base44.asServiceRole.entities.TrackingLink.update(tracking_id, { status: 'disabled' });
      
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid endpoint' }, { status: 400 });
  } catch (error) {
    console.error('Tracking service error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});