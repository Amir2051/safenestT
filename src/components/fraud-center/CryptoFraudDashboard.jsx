import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen, AlertTriangle, Search, FileText, Upload, Plus,
  TrendingUp, Wallet, Activity, DollarSign, CheckCircle, Clock,
  ArrowRight, Shield, BarChart3
} from "lucide-react";

export default function CryptoFraudDashboard({ user, onNavigate }) {
  // Fetch case statistics
  const { data: cases = [] } = useQuery({
    queryKey: ['investigation-cases'],
    queryFn: () => base44.entities.InvestigationCase.list('-created_date', 100)
  });

  const { data: fraudCases = [] } = useQuery({
    queryKey: ['fraud-cases'],
    queryFn: () => base44.entities.FraudCase.list('-created_date', 100)
  });

  const { data: walletMonitors = [] } = useQuery({
    queryKey: ['wallet-monitors'],
    queryFn: () => base44.entities.WalletMonitor.list('-created_date', 50)
  });

  // Calculate statistics
  const allCases = [...cases, ...fraudCases];
  const activeCases = allCases.filter(c => 
    !['closed', 'recovered', 'resolved'].includes(c.status)
  ).length;
  const closedCases = allCases.filter(c => 
    ['closed', 'recovered', 'resolved'].includes(c.status)
  ).length;
  const totalStolen = allCases.reduce((sum, c) => sum + (c.amount_stolen_usd || 0), 0);
  const totalRecovered = allCases.reduce((sum, c) => sum + (c.recovery_amount || 0), 0);

  const quickActions = [
    { 
      id: 'report', 
      label: 'Report Fraud', 
      icon: AlertTriangle, 
      color: 'red',
      description: 'File a new fraud case'
    },
    { 
      id: 'trace', 
      label: 'Blockchain Trace', 
      icon: Search, 
      color: 'cyan',
      description: 'Trace stolen funds'
    },
    { 
      id: 'analyzer', 
      label: 'Transaction Analyzer', 
      icon: TrendingUp, 
      color: 'purple',
      description: 'Analyze suspicious transactions'
    },
    { 
      id: 'cases', 
      label: 'View All Cases', 
      icon: FolderOpen, 
      color: 'blue',
      description: 'Manage active investigations'
    }
  ];

  const recentCases = allCases.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <FolderOpen className="w-5 h-5 text-cyan-400" />
              <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">Active</Badge>
            </div>
            <p className="text-3xl font-bold text-white">{activeCases}</p>
            <p className="text-xs text-gray-400">Active Cases</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <Badge className="bg-green-500/20 text-green-400 text-xs">Closed</Badge>
            </div>
            <p className="text-3xl font-bold text-white">{closedCases}</p>
            <p className="text-xs text-gray-400">Resolved Cases</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-red-400" />
              <Badge className="bg-red-500/20 text-red-400 text-xs">Stolen</Badge>
            </div>
            <p className="text-2xl font-bold text-red-400">${totalStolen.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Total Reported</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">Recovered</Badge>
            </div>
            <p className="text-2xl font-bold text-emerald-400">${totalRecovered.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Total Recovered</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  onClick={() => onNavigate(action.id)}
                  className={`h-auto p-4 flex flex-col items-center gap-2 border-${action.color}-500/30 hover:border-${action.color}-500/60 hover:bg-${action.color}-500/10`}
                >
                  <div className={`w-10 h-10 rounded-lg bg-${action.color}-500/20 flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 text-${action.color}-400`} />
                  </div>
                  <span className="text-white font-medium text-sm">{action.label}</span>
                  <span className="text-gray-500 text-xs text-center">{action.description}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Recent Cases
            </CardTitle>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => onNavigate('cases')}
              className="text-cyan-400"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentCases.length > 0 ? (
              <div className="space-y-3">
                {recentCases.map((caseItem) => (
                  <div 
                    key={caseItem.id}
                    className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-medium text-sm truncate">
                        {caseItem.case_title || caseItem.case_number}
                      </p>
                      <Badge className={`text-xs ${
                        caseItem.status === 'investigating' ? 'bg-yellow-500/20 text-yellow-400' :
                        caseItem.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                        caseItem.status === 'recovered' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {caseItem.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{caseItem.victim_name}</span>
                      <span className="text-red-400">${(caseItem.amount_stolen_usd || 0).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">No cases yet</p>
                <Button 
                  size="sm" 
                  onClick={() => onNavigate('report')}
                  className="mt-3 bg-cyan-500/20 text-cyan-400"
                >
                  <Plus className="w-4 h-4 mr-1" /> Report First Case
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Monitors */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Wallet Monitors
            </CardTitle>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => onNavigate('tracker')}
              className="text-purple-400"
            >
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {walletMonitors.length > 0 ? (
              <div className="space-y-3">
                {walletMonitors.slice(0, 5).map((monitor) => (
                  <div 
                    key={monitor.id}
                    className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/10"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white font-mono text-xs truncate max-w-[200px]">
                        {monitor.wallet_address}
                      </p>
                      <Badge className={`text-xs ${
                        monitor.monitoring_status === 'active' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {monitor.monitoring_status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{monitor.blockchain}</span>
                      <span className="text-purple-400">Risk: {monitor.risk_score || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400">No active monitors</p>
                <Button 
                  size="sm" 
                  onClick={() => onNavigate('tracker')}
                  className="mt-3 bg-purple-500/20 text-purple-400"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}