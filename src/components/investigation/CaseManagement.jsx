import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, FileText, Calendar, DollarSign, User, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import CreateCaseDialog from "./CreateCaseDialog.jsx";
import CaseDetailDialog from "./CaseDetailDialog.jsx";

export default function CaseManagement({ cases }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const queryClient = useQueryClient();

  const filteredCases = (cases || []).filter(c => {
    const matchesSearch = c.case_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.victim_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.case_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    const colors = {
      new: "bg-blue-500/20 text-blue-400 border-blue-500/50",
      investigating: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
      documented: "bg-purple-500/20 text-purple-400 border-purple-500/50",
      submitted: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
      law_enforcement: "bg-orange-500/20 text-orange-400 border-orange-500/50",
      recovering: "bg-green-500/20 text-green-400 border-green-500/50",
      recovered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
      closed: "bg-gray-500/20 text-gray-400 border-gray-500/50"
    };
    return colors[status] || colors.new;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "text-gray-400",
      medium: "text-yellow-400",
      high: "text-orange-400",
      critical: "text-red-400"
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search cases by title, victim, or case number..."
                  className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-[#0f1419] border border-cyan-500/20 rounded-lg text-white"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="investigating">Investigating</option>
              <option value="documented">Documented</option>
              <option value="submitted">Submitted</option>
              <option value="law_enforcement">Law Enforcement</option>
              <option value="recovering">Recovering</option>
              <option value="recovered">Recovered</option>
              <option value="closed">Closed</option>
            </select>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      <div className="grid gap-4">
        {filteredCases.length === 0 ? (
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No cases found</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="mt-4 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
              >
                Create First Case
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredCases.map((caseItem) => (
            <Card
              key={caseItem.id}
              className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer"
              onClick={() => setSelectedCase(caseItem)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{caseItem.case_title}</h3>
                      <Badge className={getStatusColor(caseItem.status)}>
                        {caseItem.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(caseItem.priority)}>
                        {caseItem.priority}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400">Victim</p>
                          <p className="text-sm text-white">{caseItem.victim_name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400">Amount Stolen</p>
                          <p className="text-sm text-red-400 font-semibold">
                            ${caseItem.amount_stolen_usd?.toLocaleString() || 0}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400">Incident Date</p>
                          <p className="text-sm text-white">
                            {caseItem.incident_date ? new Date(caseItem.incident_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400">Case #</p>
                          <p className="text-sm text-cyan-400 font-mono">
                            {caseItem.case_number || 'Pending'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {caseItem.ic3_complaint_number && (
                      <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded flex items-center gap-2">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">IC3</Badge>
                        <span className="text-sm text-blue-300 font-mono">{caseItem.ic3_complaint_number}</span>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateCaseDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            queryClient.invalidateQueries({ queryKey: ['investigation-cases'] });
          }}
        />
      )}

      {selectedCase && (
        <CaseDetailDialog
          caseData={selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['investigation-cases'] });
          }}
        />
      )}
    </div>
  );
}