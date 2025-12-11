import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Users, DollarSign, AlertTriangle, CheckCircle, Clock,
  Search, CreditCard, Filter, Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminSubscriptions() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, trial, past_due, free
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(userData => {
      // Check both is_admin flag AND role
      if (!userData.is_admin && userData.role !== 'admin') {
        navigate('/Dashboard');
        return;
      }
      setUser(userData);
    }).catch(() => navigate('/Dashboard'));
  }, []);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['admin-users-subscriptions'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
    enabled: !!user?.is_admin,
    refetchInterval: 15000
  });

  if (!user?.is_admin) {
    return null;
  }

  const now = new Date();
  
  // Categorize users
  const activeUsers = allUsers.filter(u => u.subscription_status === 'active');
  const trialUsers = allUsers.filter(u => u.subscription_status === 'trial' && (!u.trial_ends || new Date(u.trial_ends) > now));
  const failedUsers = allUsers.filter(u => u.subscription_status === 'past_due' || u.payment_failed === true);
  const freeUsers = allUsers.filter(u => !['active', 'trial', 'past_due'].includes(u.subscription_status));

  // Filter logic
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'all') return true;
    if (filter === 'active') return u.subscription_status === 'active';
    if (filter === 'trial') return u.subscription_status === 'trial';
    if (filter === 'past_due') return u.subscription_status === 'past_due' || u.payment_failed;
    if (filter === 'free') return !['active', 'trial', 'past_due'].includes(u.subscription_status);
    
    return true;
  });

  const totalRevenue = activeUsers.length * 24.99; // Using premium price estimate

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            Subscription Management
            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">ADMIN</Badge>
          </h1>
          <p className="text-gray-400 mt-1">Monitor all user subscriptions, payments, and trials</p>
        </div>
        
        <div className="flex gap-2">
            <Button variant="outline" className="border-gray-700 bg-[#1a2332] text-gray-300">
                <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a2332]/50 border-cyan-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
                <p className="text-2xl font-bold text-white">{allUsers.length}</p>
                <p className="text-xs text-gray-400">Total Users</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332]/50 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <div>
                <p className="text-2xl font-bold text-green-400">{activeUsers.length}</p>
                <p className="text-xs text-gray-400">Active Paid</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332]/50 border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
                <p className="text-2xl font-bold text-yellow-400">{trialUsers.length}</p>
                <p className="text-xs text-gray-400">In Trial</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332]/50 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
            <div>
                <p className="text-2xl font-bold text-blue-400">${totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Est. MRR</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls & Table */}
      <Card className="bg-[#0f1419] border-gray-800">
        <CardHeader className="border-b border-gray-800 pb-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex gap-2 overflow-x-auto">
              {[
                { id: 'all', label: 'All Users', count: allUsers.length },
                { id: 'active', label: 'Active', count: activeUsers.length },
                { id: 'trial', label: 'Trial', count: trialUsers.length },
                { id: 'past_due', label: 'Past Due', count: failedUsers.length },
                { id: 'free', label: 'Free', count: freeUsers.length },
              ].map(f => (
                <Button
                  key={f.id}
                  variant={filter === f.id ? "default" : "outline"}
                  onClick={() => setFilter(f.id)}
                  className={`text-sm ${filter === f.id ? 'bg-cyan-600 hover:bg-cyan-700' : 'border-gray-700 bg-transparent text-gray-400 hover:text-white'}`}
                >
                  {f.label} <span className="ml-2 opacity-60 bg-black/20 px-1.5 rounded text-xs">{f.count}</span>
                </Button>
              ))}
            </div>
            
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-[#1a2332] border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500"
                />
            </div>
          </div>
        </CardHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-[#1a2332]/30 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">User Details</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Plan</th>
                <th className="p-4 font-medium">Payment Method</th>
                <th className="p-4 font-medium">Billing Details</th>
                <th className="p-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredUsers.length === 0 ? (
                <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-500">
                        No users found matching your criteria.
                    </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{u.full_name || 'No Name'}</span>
                          <span className="text-sm text-gray-500">{u.email}</span>
                          {u.id && <span className="text-xs text-gray-700 font-mono mt-0.5">{u.id.slice(0, 8)}...</span>}
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <Badge className={`
                          ${u.subscription_status === 'active' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 
                            u.subscription_status === 'trial' ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' :
                            u.subscription_status === 'past_due' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' :
                            'bg-gray-700 text-gray-400 hover:bg-gray-600'}
                          capitalize border-none px-2.5 py-1
                        `}>
                          {u.subscription_status?.replace('_', ' ') || 'Free'}
                        </Badge>
                      </td>
                      
                      <td className="p-4">
                        <span className="text-sm text-gray-300 capitalize">
                            {u.subscription_plan || 'Free'}
                        </span>
                      </td>
                      
                      <td className="p-4">
                        {u.has_payment_method ? (
                            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                                <CreditCard className="w-4 h-4" />
                                <span>Linked</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-gray-600 text-sm">
                                <CreditCard className="w-4 h-4" />
                                <span>None</span>
                            </div>
                        )}
                        {u.stripe_customer_id && (
                            <span className="text-[10px] text-gray-600 block mt-1 font-mono">
                                {u.stripe_customer_id.slice(0, 8)}...
                            </span>
                        )}
                      </td>
                      
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                            {u.next_billing_date && (
                                <span className="text-xs text-gray-400">
                                    Next: {new Date(u.next_billing_date).toLocaleDateString()}
                                </span>
                            )}
                            {u.trial_ends && new Date(u.trial_ends) > now && (
                                <span className="text-xs text-yellow-500">
                                    Trial Ends: {new Date(u.trial_ends).toLocaleDateString()}
                                </span>
                            )}
                            {!u.next_billing_date && !u.trial_ends && (
                                <span className="text-xs text-gray-600">-</span>
                            )}
                        </div>
                      </td>
                      
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(u.created_date).toLocaleDateString()}
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
            <span>Showing {filteredUsers.length} of {allUsers.length} users</span>
            <span>Real-time Sync Active</span>
        </div>
      </Card>
    </div>
  );
}