import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, AlertTriangle } from "lucide-react";

import AdminReferralAnalytics from "../components/referrals/AdminReferralAnalytics.jsx";

export default function AdminReferrals() {
  const [user, setUser] = useState(null);

  const { data: referrals = [] } = useQuery({
    queryKey: ['all-referrals-admin'],
    queryFn: () => base44.entities.Referral.list('-created_date', 1000),
    enabled: !!user && user.role === 'admin',
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users-admin'],
    queryFn: async () => {
      // Simulated - in production would fetch all users
      return [];
    },
    enabled: !!user && user.role === 'admin',
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      if (userData.role !== 'admin') {
        window.location.href = '/#/dashboard';
      }
    }).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/30">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">You need admin privileges to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            Referral Program Analytics
          </h1>
          <p className="text-gray-400 mt-1">
            Admin dashboard • Overall program performance and insights
          </p>
        </div>
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 px-4 py-2">
          <Users className="w-4 h-4 mr-2" />
          Admin View
        </Badge>
      </div>

      {/* Admin Analytics */}
      <AdminReferralAnalytics referrals={referrals} users={users} />
    </div>
  );
}