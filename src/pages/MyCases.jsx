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
  Wallet, Calendar, DollarSign, Eye, Phone, Mail, User, Scale, ShieldCheck, Pencil, Save, X
} from "lucide-react";
import { toast } from "sonner";

export default function MyCases() {
  const [user, setUser] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [editingCase, setEditingCase] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['my-fraud-cases'],
    queryFn: () => base44.entities.FraudCase.filter(
      user.role === 'admin' ? {} : { created_by: user.email }, 
      '-created_date'
    ),
    enabled: !!user,
  });

  const { data: activeInvestigations = [] } = useQuery({
    queryKey: ['my-client-cases'],
    queryFn: () => base44.entities.ClientCase.filter(
        { client_email: user.email },
        '-created_date'
    ),
    enabled: !!user
  });

  const updateCaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FraudCase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-fraud-cases'] });
      toast.success('Case updated successfully!');
      setEditingCase(null);
      setEditFormData(null);
    },
    onError: (error) => {
      toast.error('Failed to update case: ' + error.message);
    }
  });

  const startEditing = (caseItem) => {
    setEditingCase(caseItem);
    setEditFormData({
      case_title: caseItem.case_title || '',
      description: caseItem.description || '',
      scammer_wallet: caseItem.scammer_wallet || '',
      amount_stolen_usd: caseItem.amount_stolen_usd || 0,
      blockchain: caseItem.blockchain || '',
      suspect_name: caseItem.suspect_details?.name || '',
      suspect_email: caseItem.suspect_details?.email || '',
      suspect_phone: caseItem.suspect_details?.phone || '',
      law_enforcement_authorized: caseItem.law_enforcement_authorization?.authorized || false,
      authorization_full_name: caseItem.law_enforcement_authorization?.full_name || ''
    });
    setSelectedCase(null);
  };

  const handleEditSave = () => {
    if (!editFormData.case_title) {
      toast.error('Case title is required');
      return;
    }
    if (editFormData.law_enforcement_authorized && !editFormData.authorization_full_name) {
      toast.error('Please provide your full legal name for authorization');
      return;
    }

    const updateData = {
      case_title: editFormData.case_title,
      description: editFormData.description,
      scammer_wallet: editFormData.scammer_wallet,
      amount_stolen_usd: parseFloat(editFormData.amount_stolen_usd) || 0,
      blockchain: editFormData.blockchain,
      suspect_details: {
        ...editingCase.suspect_details,
        name: editFormData.suspect_name,
        email: editFormData.suspect_email,
        phone: editFormData.suspect_phone
      },
      law_enforcement_authorization: editFormData.law_enforcement_authorized ? {
        authorized: true,
        authorized_date: editingCase.law_enforcement_authorization?.authorized_date || new Date().toISOString(),
        authorized_agencies: ['FBI', 'IC3', 'FTC'],
        full_name: editFormData.authorization_full_name,
        signature_confirmation: true
      } : {
        authorized: false
      }
    };

    updateCaseMutation.mutate({ id: editingCase.id, data: updateData });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const statusConfig = {
    reported: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock, label: 'Reported' },
    investigating: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Eye, label: 'Investigating' },
    traced: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: Wallet, label: 'Traced' },
    recovering: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', icon: DollarSign, label: 'Recovering' },
    recovered: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle, label: 'Recovered' },
    closed: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: FileText, label: 'Closed' }
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
    other: { color: 'text-gray-300', label: '⚪ Other' }
  };

  const stats = {
    total: cases.length,
    pending: cases.filter(c => c.admin_contact_status === 'Pending').length,
    inProgress: cases.filter(c => c.admin_contact_status === 'In Progress' || c.admin_contact_status === 'Contacted').length,
    resolved: cases.filter(c => c.admin_contact_status === 'Resolved').length,
    totalLost: cases.reduce((sum, c) => sum + (c.amount_stolen_usd || c.amount_stolen || 0), 0)
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <FileText className="w-8 h-8 text-cyan-400" />
          My Cases
        </h1>
        <p className="text-gray-400 mt-1">Track and monitor your submitted scam reports</p>
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
          ) : cases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No cases submitted yet</p>
              <p className="text-gray-400 text-sm mt-1">When you report a scam, it will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cases.map((caseItem) => {
                const status = statusConfig[caseItem.status] || statusConfig.reported;
                const adminStatus = adminStatusConfig[caseItem.admin_contact_status] || adminStatusConfig.Pending;
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
                            {status.label}
                          </Badge>
                          <Badge className={`${adminStatus.color} border text-xs`}>
                            {caseItem.admin_contact_status || 'Pending'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <span className={`font-semibold ${fraudType.color}`}>
                            {fraudType.label}
                          </span>
                          <span className="text-gray-400 flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {(caseItem.amount_stolen_usd || caseItem.amount_stolen || 0).toLocaleString()} {caseItem.currency_type || 'USD'}
                          </span>
                          <span className="text-gray-400 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(caseItem.created_date).toLocaleDateString()}
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
                              User: {caseItem.created_by}
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
                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCase(caseItem);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(caseItem);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
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

      {/* Edit Case Modal */}
      <Dialog open={!!editingCase} onOpenChange={() => { setEditingCase(null); setEditFormData(null); }}>
        <DialogContent className="bg-[#1a2332] border-cyan-500/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Pencil className="w-5 h-5 text-cyan-400" />
              Edit Case
            </DialogTitle>
          </DialogHeader>

          {editFormData && (
            <div className="space-y-6">
              {/* Case Title */}
              <div>
                <Label className="text-white mb-2 block">Case Title *</Label>
                <Input
                  value={editFormData.case_title}
                  onChange={(e) => setEditFormData({...editFormData, case_title: e.target.value})}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                  placeholder="Case title"
                />
              </div>

              {/* Financial Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white mb-2 block">Amount Stolen (USD)</Label>
                  <Input
                    type="number"
                    value={editFormData.amount_stolen_usd}
                    onChange={(e) => setEditFormData({...editFormData, amount_stolen_usd: e.target.value})}
                    className="bg-[#0f1419] border-cyan-500/30 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white mb-2 block">Blockchain</Label>
                  <Select value={editFormData.blockchain} onValueChange={(v) => setEditFormData({...editFormData, blockchain: v})}>
                    <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                      <SelectValue placeholder="Select blockchain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="bitcoin">Bitcoin</SelectItem>
                      <SelectItem value="bsc">BSC</SelectItem>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="solana">Solana</SelectItem>
                      <SelectItem value="tron">Tron</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Scammer Wallet */}
              <div>
                <Label className="text-white mb-2 block">Scammer Wallet Address</Label>
                <Input
                  value={editFormData.scammer_wallet}
                  onChange={(e) => setEditFormData({...editFormData, scammer_wallet: e.target.value})}
                  className="bg-[#0f1419] border-cyan-500/30 text-white font-mono"
                  placeholder="0x..."
                />
              </div>

              {/* Suspect Details */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/20">
                <h4 className="text-orange-400 font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Suspect Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-gray-400 text-sm">Name</Label>
                    <Input
                      value={editFormData.suspect_name}
                      onChange={(e) => setEditFormData({...editFormData, suspect_name: e.target.value})}
                      className="bg-[#1a2332] border-orange-500/20 text-white mt-1"
                      placeholder="Suspect name"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Email</Label>
                    <Input
                      value={editFormData.suspect_email}
                      onChange={(e) => setEditFormData({...editFormData, suspect_email: e.target.value})}
                      className="bg-[#1a2332] border-orange-500/20 text-white mt-1"
                      placeholder="Suspect email"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-sm">Phone</Label>
                    <Input
                      value={editFormData.suspect_phone}
                      onChange={(e) => setEditFormData({...editFormData, suspect_phone: e.target.value})}
                      className="bg-[#1a2332] border-orange-500/20 text-white mt-1"
                      placeholder="Suspect phone"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-white mb-2 block">Description</Label>
                <Textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                  className="bg-[#0f1419] border-cyan-500/30 text-white min-h-[120px]"
                  placeholder="Describe what happened..."
                />
              </div>

              {/* Law Enforcement Authorization */}
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-purple-400" />
                  Law Enforcement Authorization
                </h4>
                <p className="text-gray-300 text-sm mb-4">
                  Authorize SafeNestT to contact law enforcement agencies (FBI, IC3, FTC) on your behalf.
                </p>
                
                <div className="flex items-start space-x-3 mb-4">
                  <Checkbox
                    id="edit_law_enforcement_auth"
                    checked={editFormData.law_enforcement_authorized}
                    onCheckedChange={(checked) => setEditFormData({...editFormData, law_enforcement_authorized: checked})}
                    className="mt-1 border-purple-500 data-[state=checked]:bg-purple-500"
                  />
                  <label htmlFor="edit_law_enforcement_auth" className="text-sm text-white leading-relaxed cursor-pointer">
                    I authorize SafeNestT to contact law enforcement agencies on my behalf regarding this fraud case.
                  </label>
                </div>

                {editFormData.law_enforcement_authorized && (
                  <div className="mt-4 p-3 bg-[#0f1419] rounded-lg border border-purple-500/20">
                    <Label className="text-white mb-2 block">Full Legal Name (Electronic Signature) *</Label>
                    <Input
                      value={editFormData.authorization_full_name}
                      onChange={(e) => setEditFormData({...editFormData, authorization_full_name: e.target.value})}
                      placeholder="Enter your full legal name"
                      className="bg-[#0f1419] border-purple-500/30 text-white"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      Electronic signature confirmation. Date: {new Date().toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-700/50">
                <Button
                  variant="outline"
                  onClick={() => { setEditingCase(null); setEditFormData(null); }}
                  className="border-gray-500/30"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleEditSave}
                  disabled={updateCaseMutation.isPending}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  {updateCaseMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Save Changes</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Case Detail Modal */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="bg-[#1a2332] border-cyan-500/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {selectedCase?.case_title || 'Case Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedCase && (
            <div className="space-y-6">
              {/* Edit Button in Detail View */}
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                  onClick={() => startEditing(selectedCase)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Case
                </Button>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`${statusConfig[selectedCase.status]?.color || statusConfig.reported.color} border`}>
                  {statusConfig[selectedCase.status]?.label || 'Reported'}
                </Badge>
                <Badge className={`${adminStatusConfig[selectedCase.admin_contact_status]?.color || adminStatusConfig.Pending.color} border`}>
                  Admin: {selectedCase.admin_contact_status || 'Pending'}
                </Badge>
                <Badge className={`${fraudTypeConfig[selectedCase.fraud_type]?.color} bg-transparent border-current`}>
                  {fraudTypeConfig[selectedCase.fraud_type]?.label || 'Other'}
                </Badge>
              </div>

              {/* Financial Info */}
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Amount Lost
                </h4>
                <p className="text-2xl font-bold text-white">
                  ${(selectedCase.amount_stolen_usd || selectedCase.amount_stolen || 0).toLocaleString()} {selectedCase.currency_type || 'USD'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Blockchain: {selectedCase.blockchain || 'Not specified'}
                </p>
              </div>

              {/* Scammer Info */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/20">
                <h4 className="text-orange-400 font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Scammer Information
                </h4>
                <div className="space-y-2 text-sm">
                  {selectedCase.suspect_details?.name && (
                    <p className="text-white"><span className="text-gray-400">Name:</span> {selectedCase.suspect_details.name}</p>
                  )}
                  {selectedCase.suspect_details?.phone && (
                    <p className="text-white flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {selectedCase.suspect_details.phone}
                    </p>
                  )}
                  {selectedCase.suspect_details?.email && (
                    <p className="text-white flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {selectedCase.suspect_details.email}
                    </p>
                  )}
                  {selectedCase.scammer_wallet && (
                    <p className="text-white flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-xs break-all">{selectedCase.scammer_wallet}</span>
                    </p>
                  )}
                  {selectedCase.suspect_details?.social_media?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-gray-400 mb-1">Social Media:</p>
                      {selectedCase.suspect_details.social_media.map((sm, idx) => (
                        <p key={idx} className="text-white text-xs ml-4">
                          • {sm.platform}: {sm.profile}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedCase.description && (
                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <h4 className="text-cyan-400 font-semibold mb-2">Description</h4>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedCase.description}</p>
                </div>
              )}

              {/* Evidence */}
              {selectedCase.evidence?.length > 0 && (
                <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/20">
                  <h4 className="text-green-400 font-semibold mb-2">Evidence Files ({selectedCase.evidence.length})</h4>
                  <div className="space-y-2">
                    {selectedCase.evidence.map((ev, idx) => (
                      <a
                        key={idx}
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 bg-green-500/10 rounded text-green-400 text-sm hover:bg-green-500/20 transition-colors"
                      >
                        📎 {ev.description || `Evidence ${idx + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Law Enforcement Authorization */}
              {selectedCase.law_enforcement_authorization && (
                <div className={`p-4 rounded-lg border ${
                  selectedCase.law_enforcement_authorization.authorized 
                    ? 'bg-purple-500/10 border-purple-500/30' 
                    : 'bg-gray-500/10 border-gray-500/30'
                }`}>
                  <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                    selectedCase.law_enforcement_authorization.authorized ? 'text-purple-400' : 'text-gray-400'
                  }`}>
                    <Scale className="w-5 h-5" />
                    Law Enforcement Authorization
                  </h4>
                  {selectedCase.law_enforcement_authorization.authorized ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-semibold">Authorized</span>
                      </div>
                      <p className="text-gray-300">
                        <span className="text-gray-400">Signed by:</span> {selectedCase.law_enforcement_authorization.full_name}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-400">Date:</span> {new Date(selectedCase.law_enforcement_authorization.authorized_date).toLocaleString()}
                      </p>
                      <p className="text-gray-300">
                        <span className="text-gray-400">Agencies:</span> {selectedCase.law_enforcement_authorization.authorized_agencies?.join(', ') || 'FBI, IC3, FTC'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">Not authorized to contact law enforcement</p>
                  )}
                </div>
              )}

              {/* Timeline */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700/50">
                <h4 className="text-gray-300 font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Timeline
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-400">
                    Submitted: <span className="text-white">{new Date(selectedCase.created_date).toLocaleString()}</span>
                  </p>
                  {selectedCase.incident_date && (
                    <p className="text-gray-400">
                      Incident Date: <span className="text-white">{new Date(selectedCase.incident_date).toLocaleDateString()}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}