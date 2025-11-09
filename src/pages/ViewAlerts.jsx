import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Bell, AlertTriangle, CheckCircle, Eye, ExternalLink,
  FileText, Clock, Filter, Search, Flag, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import AlertDetailDialog from "../components/title/AlertDetailDialog.jsx";
import ReportFraudDialog from "../components/title/ReportFraudDialog.jsx";

export default function ViewAlerts() {
  const [user, setUser] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showFraudDialog, setShowFraudDialog] = useState(false);
  const [fraudAlert, setFraudAlert] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['title-alerts'],
    queryFn: () => base44.entities.TitleAlert.filter({ property_owner: user?.email }, '-alert_date'),
    enabled: !!user,
    initialData: [],
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.filter({ property_owner: user?.email }),
    enabled: !!user,
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const updateAlertMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TitleAlert.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['title-alerts'] });
      toast.success('Alert updated successfully');
    },
  });

  const handleReviewAlert = async (alert) => {
    await updateAlertMutation.mutateAsync({
      id: alert.id,
      data: {
        status: 'reviewed',
        reviewed_date: new Date().toISOString()
      }
    });
  };

  const handleResolveAlert = async (alert) => {
    await updateAlertMutation.mutateAsync({
      id: alert.id,
      data: {
        status: 'resolved',
        reviewed_date: new Date().toISOString()
      }
    });
  };

  const handleMarkFalseAlarm = async (alert) => {
    await updateAlertMutation.mutateAsync({
      id: alert.id,
      data: {
        status: 'false_alarm',
        reviewed_date: new Date().toISOString()
      }
    });
  };

  const handleReportFraud = (alert) => {
    setFraudAlert(alert);
    setShowFraudDialog(true);
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesSearch = !searchTerm || 
      alert.property_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.filing_party?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.filing_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'reviewed':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'investigating':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'resolved':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'false_alarm':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const newAlertsCount = alerts.filter(a => a.status === 'new').length;
  const criticalAlertsCount = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  const reviewedCount = alerts.filter(a => a.status === 'reviewed' || a.status === 'investigating').length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Bell className="w-8 h-8 text-red-400" />
          Property Alerts
        </h1>
        <p className="text-gray-400 mt-1">
          Review suspicious filings and protect your property ownership
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              {newAlertsCount > 0 && (
                <Badge className="bg-red-500 text-white animate-pulse">New</Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-red-400">{newAlertsCount}</p>
            <p className="text-sm text-gray-400">New Alerts</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Flag className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-3xl font-bold text-orange-400">{criticalAlertsCount}</p>
            <p className="text-sm text-gray-400">High Priority</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-3xl font-bold text-blue-400">{reviewedCount}</p>
            <p className="text-sm text-gray-400">Under Review</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-green-400">{resolvedCount}</p>
            <p className="text-sm text-gray-400">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by address, party name, or document type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setFilterStatus('all')}
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                className={filterStatus === 'all' ? 'bg-cyan-500' : 'border-cyan-500/20 text-cyan-400'}
              >
                All
              </Button>
              <Button
                onClick={() => setFilterStatus('new')}
                variant={filterStatus === 'new' ? 'default' : 'outline'}
                size="sm"
                className={filterStatus === 'new' ? 'bg-red-500' : 'border-red-500/20 text-red-400'}
              >
                New
              </Button>
              <Button
                onClick={() => setFilterStatus('reviewed')}
                variant={filterStatus === 'reviewed' ? 'default' : 'outline'}
                size="sm"
                className={filterStatus === 'reviewed' ? 'bg-blue-500' : 'border-blue-500/20 text-blue-400'}
              >
                Reviewed
              </Button>
              <Button
                onClick={() => setFilterStatus('resolved')}
                variant={filterStatus === 'resolved' ? 'default' : 'outline'}
                size="sm"
                className={filterStatus === 'resolved' ? 'bg-green-500' : 'border-green-500/20 text-green-400'}
              >
                Resolved
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">
            Property Alerts ({filteredAlerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse bg-[#0f1419] rounded-lg h-32" />
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No Alerts Found</p>
              <p className="text-gray-400 text-sm mt-1">
                {alerts.length === 0 
                  ? 'Your properties are being monitored. Alerts will appear here if suspicious activity is detected.'
                  : 'Try adjusting your filters to see more alerts.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`bg-[#0f1419] rounded-lg p-4 border-2 ${
                    alert.status === 'new' ? 'border-red-500/30' :
                    alert.status === 'resolved' ? 'border-green-500/20' :
                    'border-cyan-500/10'
                  } hover:border-cyan-500/30 transition-all`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {alert.severity === 'critical' || alert.severity === 'high' ? (
                          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                        ) : (
                          <FileText className="w-5 h-5 text-cyan-400" />
                        )}
                        <h3 className="text-white font-bold">{alert.property_address}</h3>
                        <Badge className={`${getSeverityColor(alert.severity)} border text-xs`}>
                          {alert.severity}
                        </Badge>
                        <Badge className={`${getStatusColor(alert.status)} border text-xs`}>
                          {alert.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm">
                        <p className="text-gray-300">
                          <strong>Filing Type:</strong> {alert.filing_type}
                        </p>
                        <p className="text-gray-300">
                          <strong>Filed By:</strong> {alert.filing_party}
                        </p>
                        <p className="text-gray-300">
                          <strong>Filing Date:</strong> {format(new Date(alert.filing_date), 'MMM dd, yyyy')}
                        </p>
                        {alert.document_amount && (
                          <p className="text-gray-300">
                            <strong>Amount:</strong> {alert.document_amount}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Alert created: {format(new Date(alert.alert_date || alert.created_date), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => setSelectedAlert(alert)}
                        size="sm"
                        variant="outline"
                        className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Details
                      </Button>

                      {alert.acris_url && (
                        <Button
                          onClick={() => window.open(alert.acris_url, '_blank')}
                          size="sm"
                          variant="outline"
                          className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          ACRIS
                        </Button>
                      )}

                      {alert.status === 'new' && (
                        <>
                          <Button
                            onClick={() => handleReviewAlert(alert)}
                            size="sm"
                            variant="outline"
                            className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                          >
                            Mark Reviewed
                          </Button>
                          <Button
                            onClick={() => handleReportFraud(alert)}
                            size="sm"
                            className="bg-red-500 hover:bg-red-600"
                          >
                            <Flag className="w-4 h-4 mr-2" />
                            Report Fraud
                          </Button>
                        </>
                      )}

                      {alert.status === 'reviewed' && (
                        <>
                          <Button
                            onClick={() => handleResolveAlert(alert)}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Resolve
                          </Button>
                          <Button
                            onClick={() => handleMarkFalseAlarm(alert)}
                            size="sm"
                            variant="outline"
                            className="border-gray-500/20 text-gray-400"
                          >
                            False Alarm
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Detail Dialog */}
      {selectedAlert && (
        <AlertDetailDialog
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onUpdate={(data) => updateAlertMutation.mutate({ id: selectedAlert.id, data })}
        />
      )}

      {/* Report Fraud Dialog */}
      {fraudAlert && (
        <ReportFraudDialog
          alert={fraudAlert}
          open={showFraudDialog}
          onClose={() => {
            setShowFraudDialog(false);
            setFraudAlert(null);
          }}
        />
      )}
    </div>
  );
}