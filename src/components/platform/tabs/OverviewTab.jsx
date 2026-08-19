import React from "react";
import { Badge } from "@/components/ui/badge";
import HermesPanel from "@/components/platform/HermesPanel";
import { HermesAPI } from "@/lib/hermesClient";

export default function OverviewTab({ caseId, caseItem, hermesState }) {
  const progress = caseItem?.investigation_progress || 0;
  const status = caseItem?.status || "new";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-white">Investigation Progress</p>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 capitalize">{status.replace(/_/g, " ")}</Badge>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
      </div>

      <HermesPanel caseId={caseId} hermesState={hermesState} queryKey="investigation-status" fetcher={HermesAPI.getInvestigationStatus}
        emptyTitle="No investigation status yet" emptyDescription="Start an investigation through Hermes to see real-time status, progress, and agent activity."
        render={(data) => {
          const inv = data?.investigation || data;
          return (
            <div className="rounded-lg border border-white/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Hermes Investigation</p>
                <Badge variant="outline" className={`capitalize ${inv.status === "running" ? "border-green-500/30 text-green-400" : inv.status === "paused" ? "border-amber-500/30 text-amber-400" : "border-white/10 text-gray-400"}`}>{inv.status || "idle"}</Badge>
              </div>
              {inv.current_phase && <p className="text-xs text-gray-400">Phase: {inv.current_phase}</p>}
              {inv.started_at && <p className="text-xs text-gray-500">Started: {new Date(inv.started_at).toLocaleString()}</p>}
              {inv.agents_active && <p className="text-xs text-gray-500">{inv.agents_active} agent(s) active</p>}
            </div>
          );
        }} />
    </div>
  );
}