import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Users, Loader2, CheckCircle2 } from "lucide-react";

export default function UserExport() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    base44.entities.User.list("-created_date", 1000)
      .then(setUsers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const downloadCSV = () => {
    const headers = ["full_name","email","role","phone","is_verified","disabled","created_date","last_check_in","check_in_streak","id"];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = users.map((u) => headers.map((h) => escape(u[h])).join(","));
    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `safenestt_users_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExported(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
          <Users className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Export Users</h1>
          <p className="text-gray-400 text-sm">Download all registered users as a CSV file</p>
        </div>
      </div>

      <div className="bg-[#0f1419] border border-cyan-500/20 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-medium">Total Users</p>
            <p className="text-3xl font-bold text-cyan-400">{users.length}</p>
          </div>
          <Button
            onClick={downloadCSV}
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Download CSV
          </Button>
        </div>

        {exported && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            CSV downloaded successfully!
          </div>
        )}

        <div className="border-t border-white/10 pt-4">
          <p className="text-gray-400 text-xs mb-2">CSV includes:</p>
          <div className="flex flex-wrap gap-2">
            {["Name","Email","Role","Phone","Verified","Created Date","Last Check-in","ID"].map((f) => (
              <span key={f} className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded border border-cyan-500/20">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-[#0f1419] border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <p className="text-white font-medium text-sm">Preview ({Math.min(users.length, 10)} of {users.length})</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/10">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 10).map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2 text-white">{u.full_name || "—"}</td>
                  <td className="px-4 py-2 text-gray-300">{u.email}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${u.role === "admin" ? "bg-purple-500/20 text-purple-400" : "bg-cyan-500/10 text-cyan-400"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-400">{u.created_date?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}