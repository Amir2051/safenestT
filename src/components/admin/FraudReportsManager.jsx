import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Eye,
  DollarSign,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  TrendingUp,
  Send
} from "lucide-react";
import { toast } from "sonner";

export default function FraudReportsManager() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const queryClient = useQueryClient();

  const { data: fraudCases = [], isLoading } = useQuery({
    queryKey: ["admin-fraud-cases"],
    queryFn: () => base44.asServiceRole.entities.FraudCase.list("-created_date"),
    refetchInterval: 30000,
  });

  const { data: recoveryFunds = [] } = useQuery({
    queryKey: ["recovery-funds"],
    queryFn: () => base44.asServiceRole.entities.RecoveryFund.list("-created_date"),
    refetchInterval: 30000,
  });

  const updateCaseMutation = useMutation({
    mutationFn: async ({ caseId, updates }) => {
      await base44.asServiceRole.entities.FraudCase.update(caseId, updates);

      // Create notification for user
      const fraudCase = fraudCases.find((c) => c.id === caseId);
      if (fraudCase && updates.status) {
        await base44.asServiceRole.entities.EmailNotification.create({
          recipient: fraudCase.created_by,
          subject: `Fraud Case Update: ${updates.status}`,
          template_name: "fraud_case_update",
          status: "pending",
          metadata: {
            case_id: caseId,
            case_title: fraudCase.case_title,
            new_status: updates.status,
            admin_notes: updates.case_notes?.[updates.case_notes.length - 1]?.note || "",
          },
        });
      }

      return { caseId, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fraud-cases"] });
      toast.success("Case updated and user notified");
      setShowCaseDialog(false);
      setStatusUpdate("");
      setAdminNotes("");
    },
    onError: (error) => {
      toast.error("Failed to update case: " + error.message);
    },
  });

  const createFundTransactionMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.asServiceRole.entities.RecoveryFund.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recovery-funds"] });
      toast.success("Fund transaction recorded");
    },
  });

  const handleUpdateCase = () => {
    if (!selectedCase || !statusUpdate) {
      toast.error("Please select a status");
      return;
    }

    const currentNotes = selectedCase.case_notes || [];
    const newNote = {
      timestamp: new Date().toISOString(),
      note: adminNotes || `Status changed to ${statusUpdate}`,
      author: "Admin",
    };

    updateCaseMutation.mutate({
      caseId: selectedCase.id,
      updates: {
        status: statusUpdate,
        case_notes: [...currentNotes, newNote],
      },
    });
  };

  const openCaseDialog = (fraudCase) => {
    setSelectedCase(fraudCase);
    setStatusUpdate(fraudCase.status);
    setAdminNotes("");
    setShowCaseDialog(true);
  };

  const filteredCases =
    filterStatus === "all"
      ? fraudCases
      : fraudCases.filter((c) => c.status === filterStatus);

  const totalStolen = fraudCases.reduce((sum, c) => sum + (c.amount_stolen_usd || 0), 0);
  const totalRecovered = fraudCases.reduce((sum, c) => sum + (c.amount_stolen_usd * (c.recovery_progress || 0)) / 100, 0);
  const totalFundBalance = recoveryFunds
    .filter((f) => f.transaction_type === "contribution" && f.status === "confirmed")
    .reduce((sum, f) => sum + f.amount_usd, 0) -
    recoveryFunds
      .filter((f) => f.transaction_type === "distribution" && f.status === "distributed")
      .reduce((sum, f) => sum + f.amount_usd, 0);

  const statusColors = {
    reported: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    investigating: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    traced: "bg-purple-500/20 text-purple-400 border-purple-500/50",
    recovering: "bg-orange-500/20 text-orange-400 border-orange-500/50",
    recovered: "bg-green-500/20 text-green-400 border-green-500/50",
    closed: "bg-gray-500/20 text-gray-400 border-gray-500/50",
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Cases</p>
                <p className="text-2xl font-bold text-white">{fraudCases.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Stolen</p>
                <p className="text-2xl font-bold text-orange-400">
                  ${totalStolen.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Recovered</p>
                <p className="text-2xl font-bold text-green-400">
                  ${totalRecovered.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Fund Balance</p>
                <p className="text-2xl font-bold text-cyan-400">
                  ${totalFundBalance.toLocaleString()}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20">
          <TabsTrigger value="cases">
            <FileText className="w-4 h-4 mr-2" />
            Fraud Reports
          </TabsTrigger>
          <TabsTrigger value="fund">
            <DollarSign className="w-4 h-4 mr-2" />
            Recovery Fund
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-6">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">All Fraud Reports</CardTitle>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48 bg-[#0f1419] border-cyan-500/20 text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="investigating">Investigating</SelectItem>
                    <SelectItem value="traced">Traced</SelectItem>
                    <SelectItem value="recovering">Recovering</SelectItem>
                    <SelectItem value="recovered">Recovered</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No fraud cases found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCases.map((fraudCase) => (
                    <div
                      key={fraudCase.id}
                      className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-white font-bold">{fraudCase.case_title}</h3>
                            <Badge className={statusColors[fraudCase.status] || statusColors.reported}>
                              {fraudCase.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                            <div>
                              <p className="text-gray-400">Reporter</p>
                              <p className="text-white font-mono text-xs">{fraudCase.created_by}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Amount Stolen</p>
                              <p className="text-red-400 font-bold">
                                ${fraudCase.amount_stolen_usd?.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Recovery</p>
                              <p className="text-green-400 font-bold">{fraudCase.recovery_progress || 0}%</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Date</p>
                              <p className="text-white">
                                {new Date(fraudCase.created_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm line-clamp-2 mb-2">
                            {fraudCase.description}
                          </p>
                          {fraudCase.scammer_wallet && (
                            <p className="text-xs text-gray-400 font-mono">
                              Scammer: {fraudCase.scammer_wallet}
                            </p>
                          )}
                        </div>
                        <Button
                          onClick={() => openCaseDialog(fraudCase)}
                          size="sm"
                          className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fund" className="mt-6">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white">Recovery Fund Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recoveryFunds.map((fund) => (
                  <div
                    key={fund.id}
                    className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={
                              fund.transaction_type === "contribution"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-orange-500/20 text-orange-400"
                            }
                          >
                            {fund.transaction_type}
                          </Badge>
                          <Badge variant="outline">{fund.status}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Amount</p>
                            <p className="text-white font-bold">${fund.amount_usd?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Date</p>
                            <p className="text-white">
                              {new Date(fund.created_date).toLocaleDateString()}
                            </p>
                          </div>
                          {fund.fraud_case_id && (
                            <div>
                              <p className="text-gray-400">Case ID</p>
                              <p className="text-cyan-400 font-mono text-xs">{fund.fraud_case_id}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Case Management Dialog */}
      {showCaseDialog && selectedCase && (
        <Dialog open={showCaseDialog} onOpenChange={setShowCaseDialog}>
          <DialogContent className="bg-[#1a2332] border-cyan-500/30 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">{selectedCase.case_title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Case Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#0f1419] rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Reporter</p>
                  <p className="text-white font-mono text-sm">{selectedCase.created_by}</p>
                </div>
                <div className="p-4 bg-[#0f1419] rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Amount Stolen</p>
                  <p className="text-red-400 font-bold text-lg">
                    ${selectedCase.amount_stolen_usd?.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-[#0f1419] rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Blockchain</p>
                  <p className="text-white">{selectedCase.blockchain}</p>
                </div>
                <div className="p-4 bg-[#0f1419] rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Date Reported</p>
                  <p className="text-white">
                    {new Date(selectedCase.created_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-[#0f1419] rounded-lg">
                <p className="text-gray-400 text-sm mb-2">Description</p>
                <p className="text-white">{selectedCase.description}</p>
              </div>

              <div className="p-4 bg-[#0f1419] rounded-lg">
                <p className="text-gray-400 text-sm mb-2">Scammer Wallet</p>
                <p className="text-red-400 font-mono text-sm break-all">
                  {selectedCase.scammer_wallet}
                </p>
              </div>

              {/* Admin Actions */}
              <div className="space-y-4 p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                <h3 className="text-white font-bold">Admin Actions</h3>
                
                <div>
                  <Label className="text-white mb-2 block">Update Status</Label>
                  <Select value={statusUpdate} onValueChange={setStatusUpdate}>
                    <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                      <SelectItem value="reported">Reported</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="traced">Traced</SelectItem>
                      <SelectItem value="recovering">Recovering</SelectItem>
                      <SelectItem value="recovered">Recovered</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white mb-2 block">Admin Notes</Label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add notes about this case update..."
                    className="bg-[#0f1419] border-cyan-500/20 text-white h-24"
                  />
                </div>

                <Button
                  onClick={handleUpdateCase}
                  disabled={updateCaseMutation.isPending}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  {updateCaseMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Update Case & Notify User
                    </>
                  )}
                </Button>
              </div>

              {/* Case History */}
              {selectedCase.case_notes && selectedCase.case_notes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-white font-bold">Case History</h3>
                  {selectedCase.case_notes.map((note, idx) => (
                    <div key={idx} className="p-3 bg-[#0f1419] rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-400 text-xs">
                          {new Date(note.timestamp).toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {note.author}
                        </Badge>
                      </div>
                      <p className="text-white text-sm">{note.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}