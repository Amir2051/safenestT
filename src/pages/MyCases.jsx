import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText, AlertTriangle, Clock, CheckCircle, Loader2,
  Wallet, Calendar, DollarSign, Eye, Phone, Mail, User, Scale, ShieldCheck, Pencil, Save, X, Activity, FileStack, Plus
} from "lucide-react";
import { toast } from "sonner";
import CaseDetailDialog from "@/components/investigation/CaseDetailDialog";
import UserCaseDetail from "@/components/cases/UserCaseDetail.jsx";
import MasterCaseGenerator from "@/components/investigation/MasterCaseGenerator";
import { DialogTrigger } from "@/components/ui/dialog";

export default function MyCases() {
  const [user, setUser] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [editingCase, setEditingCase] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch MyCase (New Unified Entity)
  const { data: myCases = [], isLoading: loadingMyCases } = useQuery({
    queryKey: ['my-cases'],
    queryFn: async () => {
      // RLS (Row Level Security) handles the filtering on the server side.
      // Admins see all, Users see only their cases (created_by, client_email, etc.)
      return base44.entities.MyCase.list('-created_date', 1000);
    },
    enabled: !!user
  });

  // Fetch My Reported Scams
  const { data: myScams = [], isLoading: loadingMyScams } = useQuery({
    queryKey: ['my-scams'],
    queryFn: async () => {
        if (!user) return [];
        return base44.entities.ScamDatabase.filter({ created_by: user.email }, '-created_date', 1000);
    },
    enabled: !!user
  });

  const handleCaseUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['my-cases'] });
      queryClient.invalidateQueries({ queryKey: ['my-scams'] });
  };

  // Normalize cases for display
  const normalizedCases = myCases.map(c => ({
      ...c,
      id: c.id,
      case_title: c.case_number ? `${c.case_number} - ${c.issue_type}` : c.client_name,
      status: c.status,
      amount: c.amount_lost,
      currency: c.cryptocurrency || 'USD',
      created_date: c.created_date,
      type: 'client',
      _entityName: 'MyCase',
      fraud_type: c.issue_type,
      description: c.description,
      blockchain: c.blockchain,
      scammer_wallet: c.scammer_wallet,
      admin_status: c.status
  }));

  const normalizedScams = myScams.map(s => ({
      ...s,
      id: s.id, // Use original ID but note it's a scam report
      case_title: `Report: ${s.identifier}`,
      status: s.status === 'active' ? 'Reported' : s.status,
      amount: s.total_stolen_usd,
      currency: 'USD',
      created_date: s.created_date,
      type: 'report',
      _entityName: 'ScamDatabase',
      fraud_type: 'scam_report',
      description: s.scam_description,
      blockchain: s.blockchain,
      scammer_wallet: s.scam_type === 'wallet' ? s.identifier : null,
      admin_status: s.status
  }));

  const allCases = [...normalizedCases, ...normalizedScams].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const isLoading = loadingMyCases || loadingMyScams;

  // Using CaseDetailDialog instead

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const statusConfig = {
    // Standard statuses
    pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock, label: 'Pending' },
    'in review': { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', icon: Eye, label: 'In Review' },
    'in progress': { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Activity, label: 'In Progress' },
    called: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: Phone, label: 'Called' },
    resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle, label: 'Resolved' },
    closed: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: FileText, label: 'Closed' },
    
    // Legacy/Other
    new: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', icon: Clock, label: 'New' },
    reported: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock, label: 'Reported' },
    investigating: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Eye, label: 'Investigating' },
    traced: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: Wallet, label: 'Traced' },
    recovering: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', icon: DollarSign, label: 'Recovering' },
    recovered: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle, label: 'Recovered' }
  };

  const adminStatusConfig = {
    Pending: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
    Contacted: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
    'In Progress': { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
    Resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/50' }
  };

  const fraudTypeConfig = {
    crypto_theft: { color: 'text-red-400', label: '🔴 Crypto Theft' },
    phishing: { color: 'text-orange-400', label: '🟠 Phishing Attack' },
    fake_exchange: { color: 'text-yellow-400', label: '🟡 Fake Exchange' },
    rug_pull: { color: 'text-pink-400', label: '🩷 Rug Pull' },
    romance_scam: { color: 'text-purple-400', label: '🟣 Romance Scam' },
    investment_scam: { color: 'text-cyan-400', label: '🔵 Investment Scam' },
    scam_report: { color: 'text-yellow-400', label: '⚠️ Scam Report' },
    other: { color: 'text-gray-300', label: '⚪ Other' }
  };

  const stats = {
    total: allCases.length,
    pending: allCases.filter(c => c.status === 'Pending' || c.status === 'reported').length,
    inProgress: allCases.filter(c => c.status === 'In Progress' || c.status === 'investigating' || c.status === 'traced').length,
    resolved: allCases.filter(c => c.status === 'Resolved' || c.status === 'recovered').length,
    totalLost: allCases.reduce((sum, c) => sum + (c.amount || 0), 0)
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-cyan-400" />
            My Cases
          </h1>
          <p className="text-gray-400 mt-1">Track and monitor your submitted scam reports</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
              <FileStack className="w-5 h-5 mr-2" />
              Generate Master IC3 Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl bg-transparent border-none p-0 shadow-none">
            <MasterCaseGenerator />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-gray-400">Total Cases</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-orange-400">{stats.pending}</p>
            <p className="text-sm text-gray-400">Pending</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Eye className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-400">{stats.inProgress}</p>
            <p className="text-sm text-gray-400">In Progress</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-400">{stats.resolved}</p>
            <p className="text-sm text-gray-400">Resolved</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-400">${stats.totalLost.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Total Lost</p>
          </CardContent>
        </Card>
      </div>

      {/* Cases List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Your Submitted Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading your cases...</p>
            </div>
          ) : allCases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No cases submitted yet</p>
              <p className="text-gray-400 text-sm mt-1">When you report a scam, it will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allCases.map((caseItem) => {
                // Safe access to properties
                const status = statusConfig[caseItem.status.toLowerCase()] || statusConfig.reported;
                const fraudType = fraudTypeConfig[caseItem.fraud_type] || fraudTypeConfig.other;
                const StatusIcon = status.icon;

                return (
                  <div
                    key={caseItem.id}
                    className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedCase(caseItem)}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-white font-semibold truncate">
                            {caseItem.case_title || 'Untitled Case'}
                          </h3>
                          <Badge className={`${status.color} border text-xs`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {caseItem.status}
                          </Badge>
                          {caseItem.admin_status && caseItem.admin_status !== caseItem.status && (
                              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 border text-xs">
                                {caseItem.admin_status}
                              </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <span className={`font-semibold ${fraudType.color}`}>
                            {fraudType.label}
                          </span>
                          <span className="text-gray-400 flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {(caseItem.amount || 0).toLocaleString()} {caseItem.currency || 'USD'}
                          </span>
                          <span className="text-gray-400 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {caseItem.created_date ? new Date(caseItem.created_date).toLocaleDateString() : 'Date N/A'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {caseItem.scammer_wallet && (
                            <p className="text-gray-500 text-xs font-mono truncate">
                              Scammer: {caseItem.scammer_wallet}
                            </p>
                          )}
                          {user.role === 'admin' && (
                            <p className="text-purple-400 text-xs truncate flex items-center gap-1">
                              <User className="w-3 h-3" />
                              User: {[caseItem.client_email, caseItem.created_by_email, caseItem.created_by, caseItem.client_name, caseItem.created_by_name].find(e => e && typeof e === 'string' && !e.trim().toLowerCase().startsWith('service+') && !e.toLowerCase().includes('no-reply.base44.com') && !e.toLowerCase().includes('base44.com')) || 'Unknown'}
                            </p>
                          )}
                          {caseItem.law_enforcement_authorization?.authorized && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 border text-xs">
                              <Scale className="w-3 h-3 mr-1" />
                              Law Enforcement Authorized
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCase(caseItem);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Manage Case
                      </Button>
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCase && (
        (user.role === 'admin' || user.is_admin || user.job_title === 'Fraud Specialist') ? (
          <CaseDetailDialog
            caseData={selectedCase}
            onClose={() => setSelectedCase(null)}
            onUpdate={handleCaseUpdate}
          />
        ) : (
          <UserCaseDetail 
            caseData={selectedCase}
            onClose={() => setSelectedCase(null)}
          />
        )
      )}
    </div>
  );
}