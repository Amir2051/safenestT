import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

let cachedHub = null;
let cacheEmail = null;

export function usePrivacyHub() {
  const [hub, setHub] = useState(cachedHub);
  const [loading, setLoading] = useState(!cachedHub);
  const [hubId, setHubId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const user = await base44.auth.me();
        if (!user?.email) return;
        if (cachedHub && cacheEmail === user.email) {
          setHub(cachedHub);
          setLoading(false);
          return;
        }
        const records = await base44.entities.PrivacyHub.filter({ user_email: user.email });
        if (cancelled) return;
        if (records.length > 0) {
          cachedHub = records[0];
          cacheEmail = user.email;
          setHub(records[0]);
          setHubId(records[0].id);
        } else {
          const created = await base44.entities.PrivacyHub.create({ user_email: user.email, privacy_score: 50, activity_log: [], broker_requests: [], exposure_scans: [], dark_web_emails: [], dark_web_breaches: [], footprint_services: [], vault_documents: [], rights_requests: [], score_history: [] });
          if (cancelled) return;
          cachedHub = created;
          cacheEmail = user.email;
          setHub(created);
          setHubId(created.id);
        }
      } catch (e) {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const updateHub = useCallback(async (updater) => {
    const current = cachedHub || hub;
    if (!current?.id) return;
    const updated = typeof updater === "function" ? updater(current) : { ...current, ...updater };
    cachedHub = updated;
    setHub(updated);
    try {
      await base44.entities.PrivacyHub.update(current.id, updated);
    } catch (e) {
      // silently fail
    }
  }, [hub]);

  const addLog = useCallback((module, action, status = "success") => {
    updateHub(prev => ({
      ...prev,
      activity_log: [
        { timestamp: new Date().toISOString(), module, action, status },
        ...(prev.activity_log || []).slice(0, 99),
      ],
    }));
  }, [updateHub]);

  return { hub, loading, updateHub, addLog };
}