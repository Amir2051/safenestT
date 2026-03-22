import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const { endpoint, ...params } = await req.json();

    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check vault status for PII exposure
    const vaults = await base44.entities.Vault.filter({ user_id: user.email });
    const vault = vaults[0];
    const vaultUnlocked = vault?.is_unlocked && 
                          vault?.token_expires_at && 
                          new Date(vault.token_expires_at) > new Date();

    // GET /analytics/user/{user_id}/trends
    if (endpoint === 'trends') {
      const { start, end, identifiers, types, user_id } = params;
      
      // Authorization check
      const targetUserId = user_id || user.email;
      if (targetUserId !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Query exposure metrics
      const metrics = await base44.asServiceRole.entities.ExposureMetrics.filter({
        user_id: targetUserId
      });

      // Filter by date range
      const filtered = metrics.filter(m => {
        const date = new Date(m.date);
        const inRange = (!start || date >= new Date(start)) && 
                       (!end || date <= new Date(end));
        const typeMatch = !types || types.includes(m.identifier_type);
        return inRange && typeMatch;
      });

      // Aggregate by date
      const aggregateMap = {};
      filtered.forEach(m => {
        if (!aggregateMap[m.date]) {
          aggregateMap[m.date] = { total: 0, breakdown: {} };
        }
        aggregateMap[m.date].total += m.count;
        aggregateMap[m.date].breakdown[m.identifier_type] = 
          (aggregateMap[m.date].breakdown[m.identifier_type] || 0) + m.count;
      });

      // Convert to series
      const series = Object.keys(aggregateMap)
        .sort()
        .map(date => ({
          date,
          total: aggregateMap[date].total,
          breakdown: aggregateMap[date].breakdown
        }));

      return Response.json({
        user_id: targetUserId,
        start: start || 'all',
        end: end || 'now',
        series,
        vault_locked: !vaultUnlocked,
        note: vaultUnlocked ? 'Full data visible' : 'Identifiers are redacted until vault is unlocked.'
      });
    }

    // GET /analytics/aggregate
    if (endpoint === 'aggregate') {
      const { start, end, group_by } = params;

      // Admin only for aggregate across users
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin only' }, { status: 403 });
      }

      const metrics = await base44.asServiceRole.entities.ExposureMetrics.list();
      
      const filtered = metrics.filter(m => {
        const date = new Date(m.date);
        return (!start || date >= new Date(start)) && (!end || date <= new Date(end));
      });

      const aggregated = {};
      filtered.forEach(m => {
        const key = group_by === 'source' ? m.source : m.identifier_type;
        aggregated[key] = (aggregated[key] || 0) + m.count;
      });

      return Response.json({
        group_by,
        start: start || 'all',
        end: end || 'now',
        data: aggregated,
        total_events: filtered.reduce((sum, m) => sum + m.count, 0)
      });
    }

    // GET /analytics/heatmap
    if (endpoint === 'heatmap') {
      const { start, end, source_filter, user_id } = params;
      
      const targetUserId = user_id || user.email;
      if (targetUserId !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const metrics = await base44.asServiceRole.entities.ExposureMetrics.filter({
        user_id: targetUserId
      });

      // Filter
      const filtered = metrics.filter(m => {
        const date = new Date(m.date);
        const inRange = (!start || date >= new Date(start)) && 
                       (!end || date <= new Date(end));
        const sourceMatch = !source_filter || m.source.toLowerCase().includes(source_filter.toLowerCase());
        return inRange && sourceMatch;
      });

      // Get unique sources and dates
      const sources = [...new Set(filtered.map(m => m.source))].sort();
      const dates = [...new Set(filtered.map(m => m.date))].sort();

      // Build matrix
      const matrix = sources.map(source => {
        return dates.map(date => {
          const matches = filtered.filter(m => m.source === source && m.date === date);
          return matches.reduce((sum, m) => sum + m.count, 0);
        });
      });

      return Response.json({
        rows: sources,
        cols: dates,
        matrix,
        legend: 'value = number of exposures',
        vault_locked: !vaultUnlocked
      });
    }

    // GET /analytics/export
    if (endpoint === 'export') {
      const { format, start, end } = params;

      // Require vault unlock for export
      if (!vaultUnlocked) {
        return Response.json({ 
          error: 'Vault must be unlocked to export data' 
        }, { status: 403 });
      }

      const metrics = await base44.entities.ExposureMetrics.filter({
        user_id: user.email
      });

      const filtered = metrics.filter(m => {
        const date = new Date(m.date);
        return (!start || date >= new Date(start)) && (!end || date <= new Date(end));
      });

      // Log vault action
      await base44.entities.VaultAudit.create({
        audit_id: `AUDIT_${Date.now()}`,
        user_id: user.email,
        action: 'vault_export',
        actor_id: user.email,
        timestamp: new Date().toISOString(),
        summary: `Exported ${filtered.length} exposure metrics`,
        metadata: { record_count: filtered.length, format },
        success: true
      });

      if (format === 'csv') {
        const csv = [
          'date,source,type,severity,count',
          ...filtered.map(m => `${m.date},${m.source},${m.identifier_type},${m.severity},${m.count}`)
        ].join('\n');

        return new Response(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename=exposure-metrics-${Date.now()}.csv`
          }
        });
      }

      return Response.json(filtered);
    }

    return Response.json({ error: 'Unknown endpoint' }, { status: 400 });

  } catch (error) {
    console.error('Analytics service error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});