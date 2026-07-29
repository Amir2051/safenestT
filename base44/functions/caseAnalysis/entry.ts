import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  try {
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    let body;
    try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
    const { caseId, entityName } = body;
    if (!caseId) return new Response(JSON.stringify({ error: 'Case ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const norm = (str) => str ? str.toString().trim().toLowerCase() : '';

    let currentCase = null;
    let foundEntity = entityName || null;
    const entitiesToTry = ['MyCase', 'InvestigationCase', 'ClientCase', 'FraudCase'];

    const tryEntities = async (list) => {
      for (const entity of list) {
        if (!base44.entities[entity]) continue;
        try {
          const cases = await base44.entities[entity].filter({ id: caseId });
          if (cases?.length) return { entity, case: cases[0] };
        } catch { /* ignore entity read error */ }
      }
      return null;
    };

    const ordered = foundEntity && !entitiesToTry.includes(foundEntity) ? [foundEntity, ...entitiesToTry.filter(e => e !== foundEntity)] : (foundEntity ? [foundEntity, ...entitiesToTry.filter(e => e !== foundEntity)] : entitiesToTry);
    const hit = await tryEntities(ordered);
    if (!hit) return new Response(JSON.stringify({ error: `Case not found. Searched: ${ordered.join(', ')}` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    currentCase = hit.case;
    foundEntity = hit.entity;

    let allCases = [];
    try { allCases = await base44.entities[foundEntity].list('-created_date', 1000); } catch {}
    const otherCases = allCases.filter(c => c.id !== caseId);

    const getAllWallets = (c) => {
      const wallets = new Set();
      if (c.scammer_wallet) wallets.add(norm(c.scammer_wallet));
      if (c.scammer_info?.wallet_addresses) c.scammer_info.wallet_addresses.forEach(w => wallets.add(norm(w)));
      if (c.monitored_wallets) c.monitored_wallets.forEach(w => wallets.add(norm(w)));
      if (c.traced_wallets) c.traced_wallets.forEach(w => wallets.add(norm(w)));
      return wallets;
    };

    const currentAllWallets = getAllWallets(currentCase);
    const connections = [];

    const ipMatch = (a, b) => {
      const s1 = new Set((a || []).map(norm));
      const s2 = new Set((b || []).map(norm));
      return [...s1].filter(x => s2.has(x));
    };

    for (const other of otherCases) {
      const reasons = [];
      let score = 0;

      if (norm(currentCase.scammer_wallet) && norm(other.scammer_wallet) && norm(currentCase.scammer_wallet) === norm(other.scammer_wallet)) {
        reasons.push({ type: 'wallet', value: currentCase.scammer_wallet, confidence: 'high', label: 'Same Scammer Wallet' });
        score += 50;
      }

      const currentMonitored = (currentCase.monitored_wallets || []).map(norm);
      const otherMonitored = (other.monitored_wallets || []).map(norm);
      const commonMonitored = currentMonitored.filter(w => otherMonitored.includes(w));
      if (commonMonitored.length) { reasons.push({ type: 'monitored_wallet', value: commonMonitored.join(', '), confidence: 'high', label: 'Shared Monitored Wallet' }); score += 40; }

      const otherAllWallets = getAllWallets(other);
      const crossMatch = [...currentAllWallets].filter(w => otherAllWallets.has(w) && !commonMonitored.includes(w) && w !== norm(currentCase.scammer_wallet));
      if (crossMatch.length) { reasons.push({ type: 'cross_wallet', value: crossMatch.slice(0, 3).join(', '), confidence: 'high', label: 'Cross-Case Transaction Flow' }); score += 45; }

      if (norm(currentCase.scammer_info?.email) && norm(other.scammer_info?.email) && norm(currentCase.scammer_info.email) === norm(other.scammer_info.email)) {
        reasons.push({ type: 'email', value: currentCase.scammer_info.email, confidence: 'high', label: 'Same Scammer Email' });
        score += 40;
      }
      if (norm(currentCase.scammer_info?.phone) && norm(other.scammer_info?.phone) && norm(currentCase.scammer_info.phone) === norm(other.scammer_info.phone)) {
        reasons.push({ type: 'phone', value: currentCase.scammer_info.phone, confidence: 'high', label: 'Same Scammer Phone' });
        score += 40;
      }
      if (norm(currentCase.scammer_info?.website) && norm(other.scammer_info?.website) && norm(currentCase.scammer_info.website) === norm(other.scammer_info.website)) {
        reasons.push({ type: 'website', value: currentCase.scammer_info.website, confidence: 'high', label: 'Same Scam Website' });
        score += 50;
      }

      const s1 = norm(currentCase.scammer_info?.name || currentCase.suspect_details?.primary_suspect?.name);
      const s2 = norm(other.scammer_info?.name || other.suspect_details?.primary_suspect?.name);
      if (s1 && s2 && s1.length > 3 && s2.length > 3 && (s1.includes(s2) || s2.includes(s1))) {
        reasons.push({ type: 'suspect', value: `${s1} / ${s2}`, confidence: 'medium', label: 'Suspect Name Match' });
        score += 30;
      }

      const sharedIps = ipMatch(currentCase.suspect_details?.ip_addresses, other.suspect_details?.ip_addresses);
      if (sharedIps.length) { reasons.push({ type: 'ip', value: sharedIps.join(', '), confidence: 'high', label: 'Shared Infrastructure IP' }); score += 45; }

      const curSocial = (currentCase.suspect_details?.social_profiles || []).map(p => norm(p.url || p.platform));
      const othSocial = (other.suspect_details?.social_profiles || []).map(p => norm(p.url || p.platform));
      const sharedSocial = curSocial.filter(x => othSocial.includes(x));
      if (sharedSocial.length) { reasons.push({ type: 'social', value: sharedSocial.join(', '), confidence: 'medium', label: 'Shared Social Profile' }); score += 25; }

      const curAssoc = (currentCase.suspect_details?.known_associates || []).map(a => norm(a.name));
      const othAssoc = (other.suspect_details?.known_associates || []).map(a => norm(a.name));
      const sharedAssoc = curAssoc.filter(x => othAssoc.includes(x) && x.length > 3);
      if (sharedAssoc.length) { reasons.push({ type: 'associate', value: sharedAssoc.join(', '), confidence: 'medium', label: 'Shared Known Associate' }); score += 30; }

      if (score > 0) connections.push({ case: { id: other.id, title: other.case_title || other.case_number || 'Untitled', case_number: other.case_number, status: other.status, fraud_type: other.issue_type, amount_lost: other.amount_lost || other.amount_stolen_usd || 0 }, reasons, score });
    }

    const getSimilarity = (s1, s2) => {
      if (!s1 || !s2) return 0;
      const w1 = new Set(s1.toLowerCase().split(/\W+/).filter(w => w.length > 4));
      const w2 = new Set(s2.toLowerCase().split(/\W+/).filter(w => w.length > 4));
      const intersection = new Set([...w1].filter(x => w2.has(x)));
      return intersection.size / (w1.size + w2.size + 1);
    };

    const semanticCandidates = otherCases.filter(c => !connections.find(conn => conn.case.id === c.id) && c.description && currentCase.description).map(c => ({ ...c, simScore: getSimilarity(currentCase.description, c.description) }));
    semanticCandidates.sort((a, b) => b.simScore - a.simScore);
    const semantic = semanticCandidates.slice(0, 20).map(c => ({ case: { id: c.id, title: c.case_title || c.case_number || 'Untitled', case_number: c.case_number, status: c.status, fraud_type: c.issue_type, amount_lost: c.amount_lost || c.amount_stolen_usd || 0 }, score: Math.round(c.simScore * 100), reasons: [{ type: 'semantic', value: 'Description similarity', confidence: 'low', label: 'Semantic Match' }] }));
    connections.push(...semantic);

    const ranked = connections.sort((a, b) => b.score - a.score).slice(0, 25);

    return new Response(JSON.stringify({ success: true, case_id: caseId, entity: foundEntity, connections: ranked, meta: { total_candidates: otherCases.length, direct_matches: connections.length - semantic.length, semantic_matches: semantic.length } }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
