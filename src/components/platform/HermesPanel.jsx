import React from "react";
import { useQuery } from "@tanstack/react-query";
import EmptyState from "./EmptyState";

/**
 * HermesPanel — reusable wrapper for any Hermes-dependent data surface.
 *
 * Handles ALL connection states honestly:
 *   - not_connected / backend_unavailable → "awaiting data" state
 *   - loading → spinner
 *   - error → error state
 *   - empty → empty state (empty is NOT an error)
 *   - ok → renders children via render(data)
 *
 * Usage:
 *   <HermesPanel caseId={caseId} hermesState={hermes.state}
 *     queryKey="entities" fetcher={HermesAPI.getEntities}
 *     render={(data) => <EntityList entities={data} />} />
 */
export default function HermesPanel({
  caseId,
  hermesState,
  queryKey,
  fetcher,
  emptyTitle = "No data yet",
  emptyDescription = "Hermes has not produced data for this section. Start or continue the investigation.",
  render,
}) {
  const canFetch = hermesState === "configured" || hermesState === "ok";

  const { data, isLoading } = useQuery({
    queryKey: ["hermes", queryKey, caseId],
    queryFn: () => fetcher(caseId),
    enabled: !!caseId && canFetch,
    staleTime: 5000,
  });

  if (!canFetch) {
    return (
      <EmptyState
        variant="not_connected"
        title="Awaiting investigation data"
        description="This panel displays real data returned by Hermes. Connect Hermes (VITE_HERMES_API_URL + hermesProxy backend function) and start an investigation to populate it."
      />
    );
  }
  if (isLoading) {
    return <EmptyState variant="loading" title="Querying Hermes…" />;
  }
  if (data?.status === "not_connected" || data?.status === "backend_unavailable") {
    return (
      <EmptyState
        variant="not_connected"
        title="Hermes backend unavailable"
        description="The hermesProxy backend function is not accessible on your current plan. Upgrade to enable real investigation data."
      />
    );
  }
  if (data?.status === "error") {
    return <EmptyState variant="error" title="Hermes request failed" description={data?.error || "No response from Hermes."} />;
  }
  const payload = data?.data;
  if (!payload || (Array.isArray(payload) && payload.length === 0) || (payload && typeof payload === "object" && !Array.isArray(payload) && Object.keys(payload).length === 0)) {
    return <EmptyState variant="empty" title={emptyTitle} description={emptyDescription} />;
  }
  return render(payload);
}