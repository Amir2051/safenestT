import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && !user.is_admin && user.job_title !== 'Fraud Specialist')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { action, data } = await req.json();

    if (action === 'correlate') {
      const { value, type } = data; // type: 'wallet', 'email', 'phone', 'any'
      if (!value) return Response.json({ error: 'Value required' }, { status: 400 });

      const matches = [];
      const lowerValue = value.toLowerCase().trim();

      // Parallel search across entities
      const [cases, scams, investigationCases] = await Promise.all([
        base44.asServiceRole.entities.MyCase.list(null, 1000), // Consider filtering if possible for performance
        base44.asServiceRole.entities.ScamDatabase.list(null, 1000),
        base44.asServiceRole.entities.InvestigationCase.list(null, 1000).catch(() => [])
      ]);

      // Helper to check fields
      const checkMatch = (record, fields, entityType) => {
        for (const field of fields) {
          const val = record[field];
          if (val) {
            if (Array.isArray(val)) {
              if (val.some(v => v && v.toString().toLowerCase().includes(lowerValue))) {
                return { matched_field: field, value: val };
              }
            } else if (val.toString().toLowerCase().includes(lowerValue)) {
              return { matched_field: field, value: val };
            }
          }
        }
        return null;
      };

      // Search MyCase
      cases.forEach(c => {
        const match = checkMatch(c, ['scammer_wallet', 'victim_wallet', 'client_email', 'scammer_info', 'description'], 'MyCase');
        // Deep check scammer_info object
        let deepMatch = false;
        if (!match && c.scammer_info) {
             const info = JSON.stringify(c.scammer_info).toLowerCase();
             if (info.includes(lowerValue)) deepMatch = true;
        }

        if (match || deepMatch) {
          matches.push({
            entity: 'MyCase',
            id: c.id,
            title: c.case_title || c.case_number,
            match_type: match ? match.matched_field : 'nested_data',
            data: c
          });
        }
      });

      // Search ScamDatabase
      scams.forEach(s => {
        const match = checkMatch(s, ['identifier', 'scam_description', 'reported_by'], 'ScamDatabase');
        if (match) {
          matches.push({
            entity: 'ScamDatabase',
            id: s.id,
            title: `Scam Report: ${s.scam_type}`,
            match_type: match.matched_field,
            data: s
          });
        }
      });

      // Search InvestigationCase (Legacy)
      investigationCases.forEach(ic => {
        const match = checkMatch(ic, ['scammer_wallet', 'victim_email', 'scammer_info'], 'InvestigationCase');
        if (match) {
          matches.push({
            entity: 'InvestigationCase',
            id: ic.id,
            title: ic.case_title,
            match_type: match.matched_field,
            data: ic
          });
        }
      });

      return Response.json({ success: true, matches });
    }

    if (action === 'save_pattern') {
      const { name, description, type, indicators, risk_level } = data;
      const pattern = await base44.asServiceRole.entities.ScamPattern.create({
        name,
        description,
        type,
        indicators,
        risk_level,
        created_by: user.email
      });
      return Response.json({ success: true, pattern });
    }

    if (action === 'search_patterns') {
      const { query } = data;
      // If query is provided, we could do a simple filter, or just list all for client-side filtering if list is small.
      // For now list all 100 most recent
      const patterns = await base44.asServiceRole.entities.ScamPattern.list('-created_date', 100);
      return Response.json({ success: true, patterns });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Advanced Investigation Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});