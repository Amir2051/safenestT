import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FolderOpen, Search, Filter, Plus, Eye, Edit, Trash2,
  DollarSign, User, Calendar, AlertTriangle, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import CaseDetailDialog from "@/components/investigation/CaseDetailDialog";
import CreateCaseDialog from "@/components/investigation/CreateCaseDialog";

export default function ActiveCasesPanel({ user }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: myCases = [], isLoading: loadingCases, refetch: refetchCases } = useQuery({
    queryKey: ['my-cases-all'],
    queryFn: async () => {
      if (user?.role === 'admin' || user?.is_admin || user?.job_title === 'Fraud Specialist') {
        return base44.entities.MyCase.list('-created_date', 1000);
      }
      // For users, show their own cases
      return base44.entities.MyCase.filter({ 
        $or: [
          { created_by: user.email },
          { created_by_email: user.email },
          { client_email: user.email }
        ]
      }, '-created_date', 1000);
    },
    enabled: !!user
  });

  // Normalize MyCase data to match UI expectations
  const allCases = myCases.map(c => ({
    ...c,
    _entityName: 'MyCase',
    case_title: c.case_title || c.client_name || 'Untitled Case',
    victim_name: c.client_name || c.created_by_name,
    display_email: [c.client_email, c.created_by_email, c.created_by, c.client_name].find(e => e && typeof e === 'string' && !e.includes('no-reply.base44.com') && !e.startsWith('service+')) || 'Unknown User',
    amount_stolen_usd: c.amount_lost || c.amount_stolen_usd || 0,
    status: c.status || 'Pending',
    created_date: c.created_date,
    id: c.id
  })).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const filteredCases = allCases.filter(caseItem => {
    const matchesSearch = 
      (caseItem.case_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (caseItem.case_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (caseItem.victim_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleRefresh = () => {
    refetchCases();
    toast.success('Cases refreshed');
  };

  const handleCaseUpdate = () => {
    queryClient.invalidateQueries(['my-cases-all']);
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (['resolved', 'recovered', 'approved', 'completed'].includes(s)) {
      return 'bg-green-500/20 text-green-400 border-green-500/50';
    }
    if (['closed', 'deemed', 'rejected', 'denied'].includes(s)) {
      return 'bg-red-500/20 text-red-400 border-red-500/50';
    }
    // Pending, New, In Progress, etc.
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const isLoading = loadingCases;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-cyan-400" />
            Active Cases
          </h2>
          <p className="text-gray-400 text-sm">
            {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="border-cyan-500/30 text-cyan-400"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Case
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-[#1a2332] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0f1419] border-cyan-500/30 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48 bg-[#0f1419] border-cyan-500/30 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="documented">Documented</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="recovering">Recovering</SelectItem>
                <SelectItem value="recovered">Recovered</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading cases...</p>
        </div>
      ) : filteredCases.length > 0 ? (
        <div className="grid gap-4">
          {filteredCases.map((caseItem) => (
            <Card 
              key={caseItem.id}
              className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer"
              onClick={() => setSelectedCase(caseItem)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-semibold">
                        {caseItem.case_title || 'Untitled Case'}
                      </h3>
                      <Badge className={getStatusColor(caseItem.status)}>
                        {caseItem.status}
                      </Badge>
                      {(caseItem.priority || caseItem.case_priority) && (
                        <Badge className={getPriorityColor(caseItem.priority || caseItem.case_priority)}>
                          {caseItem.priority || caseItem.case_priority}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {caseItem.display_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-red-400" />
                        <span className="text-red-400">
                          ${(caseItem.amount_stolen_usd || 0).toLocaleString()}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(caseItem.created_date).toLocaleDateString()}
                      </span>
                      {caseItem.case_number && (
                        <span className="text-cyan-400 font-mono text-xs">
                          #{caseItem.case_number}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCase(caseItem);
                      }}
                      className="border-cyan-500/30 text-cyan-400"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                {caseItem.investigation_progress !== undefined && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">Investigation Progress</span>
                      <span className="text-cyan-400">{caseItem.investigation_progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        style={{ width: `${caseItem.investigation_progress || 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-[#1a2332] border-cyan-500/20">
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Cases Found</h3>
            <p className="text-gray-400 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'No cases match your search criteria'
                : 'Start by reporting a new fraud case'}
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Case
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Case Detail Dialog */}
      {selectedCase && (
        <CaseDetailDialog
          caseData={selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdate={handleCaseUpdate}
        />
      )}

      {/* Create Case Dialog */}
      {showCreateDialog && (
        <CreateCaseDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => {
            setShowCreateDialog(false);
            handleCaseUpdate();
          }}
        />
      )}
    </div>
  );
}