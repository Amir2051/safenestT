import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Activity as ActivityIcon, Search, Filter, Download, 
  Shield, Wifi, CreditCard, Lock, Settings as SettingsIcon,
  Bell, Calendar, Clock, MapPin, Smartphone, CheckCircle,
  AlertTriangle, XCircle, TrendingUp, Eye
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const actionIcons = {
  vpn: Wifi,
  security: Shield,
  subscription: CreditCard,
  password: Lock,
  alert: Bell,
  settings: SettingsIcon,
  authentication: CheckCircle,
  monitoring: Eye
};

const actionColors = {
  vpn: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  security: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  subscription: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  password: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  alert: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  settings: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  authentication: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  monitoring: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' }
};

const statusIcons = {
  success: CheckCircle,
  failed: XCircle,
  pending: Clock
};

const statusColors = {
  success: 'text-green-400',
  failed: 'text-red-400',
  pending: 'text-yellow-400'
};

export default function Activity() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateRange, setDateRange] = useState("7days");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 100),
    initialData: [],
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || log.action_category === filterCategory;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    
    // Date range filter
    let matchesDate = true;
    if (dateRange !== 'all') {
      const logDate = new Date(log.created_date);
      const now = new Date();
      const daysDiff = Math.floor((now - logDate) / (1000 * 60 * 60 * 24));
      
      if (dateRange === '24hours') matchesDate = daysDiff < 1;
      else if (dateRange === '7days') matchesDate = daysDiff < 7;
      else if (dateRange === '30days') matchesDate = daysDiff < 30;
    }
    
    return matchesSearch && matchesCategory && matchesStatus && matchesDate;
  });

  // Statistics
  const stats = {
    total: logs.length,
    today: logs.filter(l => {
      const logDate = new Date(l.created_date);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length,
    vpnActions: logs.filter(l => l.action_category === 'vpn').length,
    securityActions: logs.filter(l => l.action_category === 'security').length,
  };

  const exportLogs = () => {
    const csv = [
      ['Date', 'Action', 'Category', 'Status', 'Description'],
      ...filteredLogs.map(log => [
        format(new Date(log.created_date), 'yyyy-MM-dd HH:mm:ss'),
        log.action_type,
        log.action_category,
        log.status,
        log.description
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safenest-activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ActivityIcon className="w-8 h-8 text-cyan-400" />
            Activity Log
          </h1>
          <p className="text-gray-400 mt-1">Complete audit trail of your security actions</p>
        </div>
        <Button
          onClick={exportLogs}
          variant="outline"
          className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Actions</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <ActivityIcon className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Today</p>
                <p className="text-2xl font-bold text-white">{stats.today}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">VPN Actions</p>
                <p className="text-2xl font-bold text-white">{stats.vpnActions}</p>
              </div>
              <Wifi className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Security</p>
                <p className="text-2xl font-bold text-white">{stats.securityActions}</p>
              </div>
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search activity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-40 bg-[#0f1419] border-cyan-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="vpn">VPN</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="password">Password</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
                <SelectItem value="settings">Settings</SelectItem>
                <SelectItem value="authentication">Authentication</SelectItem>
                <SelectItem value="monitoring">Monitoring</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-32 bg-[#0f1419] border-cyan-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-32 bg-[#0f1419] border-cyan-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                <SelectItem value="24hours">24 Hours</SelectItem>
                <SelectItem value="7days">7 Days</SelectItem>
                <SelectItem value="30days">30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <div className="space-y-3">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <Card key={i} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 animate-pulse">
              <CardContent className="p-6 h-24" />
            </Card>
          ))
        ) : filteredLogs.length === 0 ? (
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-12 text-center">
              <ActivityIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No activity found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => {
            const Icon = actionIcons[log.action_category] || ActivityIcon;
            const StatusIcon = statusIcons[log.status] || CheckCircle;
            const colors = actionColors[log.action_category] || actionColors.security;
            
            return (
              <Card
                key={log.id}
                className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="text-white font-semibold">{log.description}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge className={`${colors.bg} ${colors.text} ${colors.border} border text-xs`}>
                              {log.action_category}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              {format(new Date(log.created_date), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-5 h-5 ${statusColors[log.status]}`} />
                          <Badge className={`${
                            log.status === 'success' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            log.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          } border text-xs`}>
                            {log.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="bg-[#0f1419] rounded-lg p-3 mt-3 border border-cyan-500/10">
                          <p className="text-xs font-semibold text-gray-400 mb-2">Details:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                            {log.metadata.ip_address && (
                              <div>
                                <span className="text-gray-400">IP: </span>
                                <span className="text-white font-mono">{log.metadata.ip_address}</span>
                              </div>
                            )}
                            {log.metadata.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span className="text-white">{log.metadata.location}</span>
                              </div>
                            )}
                            {log.metadata.server && (
                              <div>
                                <span className="text-gray-400">Server: </span>
                                <span className="text-white">{log.metadata.server}</span>
                              </div>
                            )}
                            {log.metadata.device_info && (
                              <div className="flex items-center gap-1">
                                <Smartphone className="w-3 h-3 text-gray-400" />
                                <span className="text-white">{log.metadata.device_info}</span>
                              </div>
                            )}
                            {log.metadata.plan_name && (
                              <div>
                                <span className="text-gray-400">Plan: </span>
                                <span className="text-purple-400 font-semibold">{log.metadata.plan_name}</span>
                              </div>
                            )}
                            {log.metadata.previous_value && log.metadata.new_value && (
                              <div className="col-span-2">
                                <span className="text-gray-400">Change: </span>
                                <span className="text-red-400">{log.metadata.previous_value}</span>
                                <span className="text-gray-400"> → </span>
                                <span className="text-green-400">{log.metadata.new_value}</span>
                              </div>
                            )}
                            {log.metadata.affected_item && (
                              <div className="col-span-2">
                                <span className="text-gray-400">Affected: </span>
                                <span className="text-cyan-400">{log.metadata.affected_item}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {filteredLogs.length > 0 && (
        <div className="text-center text-gray-400 text-sm">
          Showing {filteredLogs.length} of {logs.length} total activities
        </div>
      )}
    </div>
  );
}