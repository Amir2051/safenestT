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
      const { value, type, caseId } = data;
      const lowerValue = String(value || '').toLowerCase().trim();
      const targetFields = type === 'wallet'
        ? ['scammer_wallet', 'victim_wallet', 'monitored_wallets']
        : type === 'email'
          ? ['client_email', 'victim_email', 'scammer_info']
          : type === 'phone'
            ? ['phone_number', 'victim_phone', 'scammer_info']
            : ['scammer_wallet', 'victim_wallet', 'client_email', 'victim_email', 'phone_number', 'victim_phone', 'monitored_wallets', 'description', 'scammer_info'];

      const matches = [];
      const seen = new Set();
      const addUnique = async (entityName, options = {}) => {
        try {
          const items = options.filter
            ? await base44.asServiceRole.entities[entityName].filter(options.filter, options.sort || null, options.limit || 300)
            : await base44.asServiceRole.entities[entityName].list(options.sort || '-created_date', options.limit || 300);
          for (const item of items) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              const match = checkMatch(item, targetFields, lowerValue);
              if (match) {
                matches.push({
                  id: item.id,
                  title: item.case_title || item.case_number || item.name || item.identifier,
                  entity: entityName,
                  match_type: match.matched_field,
                  data: item,
                  case: {
                    id: item.id,
                    title: item.case_title || item.case_number,
                    case_number: item.case_number,
                    status: item.status,
                    fraud_type: item.issue_type || item.fraud_type || item.scam_type,
                    amount_lost: item.amount_lost || item.amount_stolen_usd || 0
                  }
                });
              }
            }
          }
        } catch (e) {
          // optional entities may not exist in all deployments
        }
      };

      if (lowerValue) {
        await addUnique('MyCase');
        await addUnique('InvestigationCase');
        await addUnique('ClientCase');
        await addUnique('ScamDatabase');
      } else if (caseId) {
        const source = await Promise.all([
          base44.asServiceRole.entities.MyCase.get(caseId).catch(() => null),
          base44.asServiceRole.entities.InvestigationCase.get(caseId).catch(() => null),
          base44.asServiceRole.entities.ClientCase.get(caseId).catch(() => null)
        ]).then((arr) => arr.find(Boolean));
        if (!source) {
          return Response.json({ error: 'Source case not found for correlation' }, { status: 404 });
        }
        const relatedValues = new Set();
        const pushValues = (vals) => {
          (Array.isArray(vals) ? vals : [vals]).forEach((v) => { if (v && typeof v === 'string') relatedValues.add(v.toLowerCase()); });
        };
        pushValues(source.scammer_wallet);
        pushValues(source.victim_wallet);
        pushValues(source.monitored_wallets);
        pushValues(source.client_email);
        pushValues(source.victim_email);
        pushValues(source.phone_number);
        pushValues(source.victim_phone);
        if (source.scammer_info) {
          pushValues([source.scammer_info.email, source.scammer_info.phone, source.scammer_info.wallet_address]);
        }
        pushValues(source.description);
        for (const term of relatedValues) {
          await addUnique('MyCase');
          await addUnique('InvestigationCase');
          await addUnique('ClientCase');
          await addUnique('ScamDatabase');
        }
      } else {
        return Response.json({ error: 'Value or caseId required' }, { status: 400 });
      }

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
      if (query) {
        const all = await base44.asServiceRole.entities.ScamPattern.list('-created_date', 100);
        const lower = String(query).toLowerCase();
        const filtered = all.filter((p) => {
          const haystack = [p.name, p.description, p.type, p.risk_level, ...(p.indicators || [])].join(' ').toLowerCase();
          return haystack.includes(lower);
        });
        return Response.json({ success: true, patterns: filtered });
      }
      const patterns = await base44.asServiceRole.entities.ScamPattern.list('-created_date', 100);
      return Response.json({ success: true, patterns });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Advanced Investigation Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function checkMatch(record, fields, lowerValue) {
  for (const field of fields) {
    const val = record[field];
    if (val !== undefined && val !== null && String(val).toLowerCase().includes(lowerValue)) {
      return { matched_field: field, value: val };
    }
  }
  return null;
}
