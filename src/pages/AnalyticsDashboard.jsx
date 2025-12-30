import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import FraudAnalyticsDashboard from "../components/analytics/FraudAnalyticsDashboard";
import AdminGate from "../components/admin/AdminGate";
import { BarChart3 } from "lucide-react";

export default function AnalyticsDashboard() {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <AdminGate>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics & Intelligence</h1>
            <p className="text-gray-400">Strategic insights powered by AI</p>
          </div>
        </div>

        <FraudAnalyticsDashboard />
      </div>
    </AdminGate>
  );
}