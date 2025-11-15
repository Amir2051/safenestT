import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, DollarSign, AlertTriangle, CheckCircle, Clock,
  TrendingUp, Search, Calendar, CreditCard
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminSubscriptions() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(userData => {
      if (!userData.is_admin) {
        navigate('/Dashboard');
        return;
      }
      setUser(userData);
    }).catch(() => navigate('/Dashboard'));
  }, []);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['admin-users-subscriptions'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user?.is_admin,
    refetchInterval: 30000
  });

  if (!user?.is_admin) {
    return null;
  }

  const now = new Date();
  
  const trialUsers = allUsers.filter(u => 
    u.subscription_status === 'trial' && 
    u.trial_ends && 
    new Date(u.trial_ends) > now
  );

  const activeUsers = allUsers.filter(u => 
    u.subscription_status === 'active' && 
    u.has_payment_method
  );

  const failedPaymentUsers = allUsers.filter(u => 
    u.payment_failed === true || 
    u.subscription_status === 'past_due'
  );

  const freeUsers = allUsers.filter(u => 
    u.subscription_plan === 'free' || 
    (!u.has_payment_method && u.subscription_status !== 'trial')
  );

  const filteredUsers = allUsers.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRevenue = activeUsers.length * 9.99; // Simplified calculation

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-400" />
          Subscription Management
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">ADMIN</Badge>
        </h1>
        <p className="text-gray-400 mt-1">Monitor trials, active subscriptions, and payment status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <Users className="w-6 h-6 text-cyan-400 mb-2" />
            <p className="text-2xl font-bold text-white">{allUsers.length}</p>
            <p className="text-xs text-gray-400">Total Users</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-4">
            <Clock className="w-6 h-6 text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-yellow-400">{trialUsers.length}</p>
            <p className="text-xs text-gray-400">In Free Trial</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <CheckCircle className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-green-400">{activeUsers.length}</p>
            <p className="text-xs text-gray-400">Active Paying</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <AlertTriangle className="w-6 h-6 text-red-400 mb-2" />
            <p className="text-2xl font-bold text-red-400">{failedPaymentUsers.length}</p>
            <p className="text-xs text-gray-400">Payment Failed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardContent className="p-4">
            <DollarSign className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-green-400">${totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-gray-400">Est. Monthly Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="grid gap-4">
        {/* Trial Users Section */}
        {trialUsers.length > 0 && (
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                Users in Free Trial ({trialUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trialUsers.map(u => {
                  const daysLeft = Math.ceil((new Date(u.trial_ends) - now) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={u.id} className="p-3 bg-[#0f1419] rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-semibold">{u.full_name || 'Unnamed'}</p>
                        <p className="text-gray-400 text-sm">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {u.has_payment_method ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                            <CreditCard className="w-3 h-3 mr-1" />
                            Payment Added
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                            No Payment
                          </Badge>
                        )}
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                          {daysLeft}d left
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Paying Users */}
        {activeUsers.length > 0 && (
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Active Paying Users ({activeUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeUsers.slice(0, 10).map(u => (
                  <div key={u.id} className="p-3 bg-[#0f1419] rounded-lg flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white font-semibold">{u.full_name || 'Unnamed'}</p>
                      <p className="text-gray-400 text-sm">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`${
                        u.subscription_plan === 'elite' 
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                          : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                      }`}>
                        {u.subscription_plan?.toUpperCase()}
                      </Badge>
                      {u.billing_cycle_anchor && (
                        <span className="text-xs text-gray-400">
                          Next: {new Date(u.billing_cycle_anchor).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Failed Payment Users */}
        {failedPaymentUsers.length > 0 && (
          <Card className="bg-gradient-to-br from-red-900/40 to-orange-900/40 border-red-500/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Failed Payment Users ({failedPaymentUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {failedPaymentUsers.map(u => (
                  <div key={u.id} className="p-3 bg-red-500/10 rounded-lg flex items-center justify-between border border-red-500/20">
                    <div className="flex-1">
                      <p className="text-white font-semibold">{u.full_name || 'Unnamed'}</p>
                      <p className="text-gray-400 text-sm">{u.email}</p>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                      PAST DUE
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}