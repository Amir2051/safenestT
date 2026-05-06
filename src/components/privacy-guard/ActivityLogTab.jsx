import { Button } from "@/components/ui/button";
import { Download, Trash2, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusConfig = {
  success:         { icon: CheckCircle,   color: "text-green-400",  label: "✅ Success" },
  manual_required: { icon: AlertTriangle, color: "text-yellow-400", label: "⚠️ Manual Required" },
  failed:          { icon: XCircle,       color: "text-red-400",    label: "❌ Failed" },
};

export default function ActivityLogTab({ log, onClear }) {
  const handleExport = () => {
    const header = "Timestamp,Action,Status\n";
    const rows = log.map(e =>
      `"${e.timestamp}","${e.action.replace(/"/g, '""')}","${e.status}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "privacy-guard-activity-log.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Activity log exported");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-semibold text-lg">Activity Log</h2>
          <p className="text-gray-500 text-sm">{log.length} events recorded</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            disabled={log.length === 0}
            variant="outline"
            size="sm"
            className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button
            onClick={onClear}
            disabled={log.length === 0}
            variant="outline"
            size="sm"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Clear Log
          </Button>
        </div>
      </div>

      {log.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p>No activity recorded yet.</p>
          <p className="text-xs mt-1">Actions in Domain Blocker and Opt-Out Center will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800/60 overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-gray-900/80 border-b border-gray-800/60 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Timestamp</div>
            <div className="col-span-7">Action</div>
            <div className="col-span-2">Status</div>
          </div>

          <div className="divide-y divide-gray-800/40 max-h-[500px] overflow-y-auto">
            {log.map((entry, i) => {
              const cfg = statusConfig[entry.status] || statusConfig.success;
              const Icon = cfg.icon;
              return (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-12 gap-1 md:gap-2 px-4 py-3 bg-gray-950/40 hover:bg-gray-900/40 transition-colors items-start md:items-center"
                >
                  <div className="col-span-3 text-xs text-gray-500 font-mono">
                    {(() => {
                      try { return format(new Date(entry.timestamp), "MMM d, HH:mm:ss"); }
                      catch { return entry.timestamp; }
                    })()}
                  </div>
                  <div className="col-span-7 text-sm text-gray-200">{entry.action}</div>
                  <div className="col-span-2">
                    <span className={`flex items-center gap-1 text-xs font-medium ${cfg.color}`}>
                      <Icon className="w-3 h-3 shrink-0" />
                      <span className="hidden md:inline">{cfg.label}</span>
                      <span className="md:hidden">{entry.status}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}