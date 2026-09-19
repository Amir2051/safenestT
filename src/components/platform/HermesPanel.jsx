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
  emptyDescription = "MIA has not produced data for this section. Start or continue the investigation.",
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
        description="This panel displays real intelligence returned by MIA. The secure backend gateway must be connected before an investigation can populate it."
      />
    );
  }
  if (isLoading) {
    return <EmptyState variant="loading" title="Querying MIA…" />;
  }
  if (data?.status === "not_connected" || data?.status === "backend_unavailable") {
    return (
      <EmptyState
        variant="not_connected"
        title="MIA intelligence gateway unavailable"
        description="The secure intelligence gateway is not accessible. Verify the hosted MIA gateway and backend configuration."
      />
    );
  }
  if (data?.status === "error") {
    return <EmptyState variant="error" title="MIA request failed" description={data?.error || "No response from MIA."} />;
  }
  const payload = data?.data;
  if (!payload || (Array.isArray(payload) && payload.length === 0) || (payload && typeof payload === "object" && !Array.isArray(payload) && Object.keys(payload).length === 0)) {
    return <EmptyState variant="empty" title={emptyTitle} description={emptyDescription} />;
  }
  return render(payload);
}