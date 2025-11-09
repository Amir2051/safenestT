import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Scale, FileText, Shield, Users, AlertTriangle, 
  Download, Upload, Clock, CheckCircle, Phone, Home,
  Award, Lock, ExternalLink, Calendar, DollarSign
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import LegalAlerts from "../components/legal/LegalAlerts.jsx";
import DocumentTemplates from "../components/legal/DocumentTemplates.jsx";
import DocumentStorage from "../components/legal/DocumentStorage.jsx";
import AttorneyConsultations from "../components/legal/AttorneyConsultations.jsx";
import LegalAuditTrail from "../components/legal/LegalAuditTrail.jsx";

export default function LegalSupport() {
  const [user, setUser] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const queryClient = useQueryClient();

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
    enabled: !!user,
    initialData: [],
  });

  const { data: titleAlerts = [] } = useQuery({
    queryKey: ['title-alerts'],
    queryFn: () => base44.entities.TitleAlert.list('-alert_date', 50),
    enabled: !!user,
    initialData: [],
  });

  const { data: legalActions = [] } = useQuery({
    queryKey: ['legal-actions'],
    queryFn: () => base44.entities.LegalAction.list('-action_date', 50),
    enabled: !!user,
    initialData: [],
  });

  const { data: legalDocuments = [] } = useQuery({
    queryKey: ['legal-documents'],
    queryFn: () => base44.entities.LegalDocument.list('-created_date', 100),
    enabled: !!user,
    initialData: [],
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['attorney-consultations'],
    queryFn: () => base44.entities.AttorneyConsultation.list('-requested_date', 50),
    enabled: !!user,
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  // Filter data for selected property
  const propertyAlerts = selectedProperty 
    ? titleAlerts.filter(a => a.property_id === selectedProperty.id)
    : titleAlerts;
  
  const propertyActions = selectedProperty
    ? legalActions.filter(a => a.property_id === selectedProperty.id)
    : legalActions;

  const propertyDocuments = selectedProperty
    ? legalDocuments.filter(d => d.property_id === selectedProperty.id)
    : legalDocuments;

  const propertyConsultations = selectedProperty
    ? consultations.filter(c => c.property_id === selectedProperty.id)
    : consultations;

  // Calculate stats
  const criticalAlerts = titleAlerts.filter(a => 
    (a.severity === 'critical' || a.severity === 'high') && a.status === 'new'
  ).length;

  const pendingActions = legalActions.filter(a => 
    a.status === 'pending' || a.status === 'in_progress'
  ).length;

  const activeConsultations = consultations.filter(c => 
    c.status === 'scheduled' || c.status === 'in_progress'
  ).length;

  const totalDocuments = legalDocuments.length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Scale className="w-8 h-8 text-purple-400" />
          Legal Support Center
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 border animate-pulse">
            FREE
          </Badge>
        </h1>
        <p className="text-gray-400 mt-1">
          Comprehensive legal protection for your property titles • Integrated with NYC ACRIS monitoring
        </p>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                🏛️ Complete Legal Protection Suite
              </h3>
              <ul className="space-y-1 text-sm text-purple-300">
                <li>• <strong>Real-Time Legal Alerts:</strong> AI-powered threat detection with legal recommendations</li>
                <li>• <strong>Document Templates:</strong> Pre-written dispute notices, cease & desist letters, affidavits</li>
                <li>• <strong>Secure Document Storage:</strong> AES-256 encrypted vault for all legal documents</li>
                <li>• <strong>Licensed Attorneys:</strong> Connect with verified NYC real estate attorneys</li>
                <li>• <strong>Complete Audit Trail:</strong> Every action logged for legal reference</li>
                <li>• <strong>Auto-Generated Reports:</strong> Legal reports with evidence and attorney contacts</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              {criticalAlerts > 0 && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  {criticalAlerts}
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-red-400">{criticalAlerts}</p>
            <p className="text-sm text-gray-400">Critical Legal Alerts</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
            <p className="text-3xl font-bold text-yellow-400">{pendingActions}</p>
            <p className="text-sm text-gray-400">Pending Actions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-purple-400">{activeConsultations}</p>
            <p className="text-sm text-gray-400">Active Consultations</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-3xl font-bold text-cyan-400">{totalDocuments}</p>
            <p className="text-sm text-gray-400">Legal Documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Property Selector */}
      {properties.length > 0 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Home className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-semibold">Filter by Property:</span>
              <div className="flex gap-2 flex-wrap flex-1">
                <Button
                  size="sm"
                  onClick={() => setSelectedProperty(null)}
                  variant={!selectedProperty ? "default" : "outline"}
                  className={!selectedProperty ? "bg-cyan-500" : "border-cyan-500/20 text-cyan-400"}
                >
                  All Properties
                </Button>
                {properties.map(property => (
                  <Button
                    key={property.id}
                    size="sm"
                    onClick={() => setSelectedProperty(property)}
                    variant={selectedProperty?.id === property.id ? "default" : "outline"}
                    className={selectedProperty?.id === property.id 
                      ? "bg-cyan-500" 
                      : "border-cyan-500/20 text-cyan-400"}
                  >
                    {property.address.split(',')[0]}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20 grid grid-cols-5 w-full lg:w-auto">
          <TabsTrigger value="alerts" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-white">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white">
            <Upload className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="attorneys" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Attorneys
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-white">
            <Lock className="w-4 h-4 mr-2" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="mt-6">
          <LegalAlerts 
            alerts={propertyAlerts} 
            properties={properties}
            selectedProperty={selectedProperty}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <DocumentTemplates 
            properties={properties}
            alerts={titleAlerts}
            selectedProperty={selectedProperty}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentStorage 
            documents={propertyDocuments}
            properties={properties}
            selectedProperty={selectedProperty}
          />
        </TabsContent>

        <TabsContent value="attorneys" className="mt-6">
          <AttorneyConsultations 
            consultations={propertyConsultations}
            properties={properties}
            selectedProperty={selectedProperty}
          />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <LegalAuditTrail 
            actions={propertyActions}
            properties={properties}
            selectedProperty={selectedProperty}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to={createPageUrl("TitleProtection")}>
              <Button variant="outline" className="w-full border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 h-auto py-4">
                <div className="flex flex-col items-center gap-2">
                  <Home className="w-6 h-6" />
                  <span className="font-semibold">View Properties</span>
                  <span className="text-xs text-gray-400">Manage title protection</span>
                </div>
              </Button>
            </Link>

            <Link to={createPageUrl("ViewAlerts")}>
              <Button variant="outline" className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 h-auto py-4">
                <div className="flex flex-col items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  <span className="font-semibold">View All Alerts</span>
                  <span className="text-xs text-gray-400">Review suspicious activity</span>
                </div>
              </Button>
            </Link>

            <Button 
              variant="outline" 
              className="w-full border-purple-500/20 text-purple-400 hover:bg-purple-500/10 h-auto py-4"
              onClick={() => {
                const url = "https://www1.nyc.gov/site/finance/taxes/property-fraud-report-form.page";
                window.open(url, '_blank');
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <ExternalLink className="w-6 h-6" />
                <span className="font-semibold">Report Fraud to NYC</span>
                <span className="text-xs text-gray-400">Official city reporting</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Legal Resources */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Legal Resources & Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                NYC Bar Association
              </h4>
              <p className="text-sm text-gray-400 mb-2">
                Find licensed real estate attorneys in NYC
              </p>
              <a 
                href="https://www.nycbar.org/get-legal-help/lawyer-referral-service/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 text-sm hover:underline flex items-center gap-1"
              >
                Visit Website <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                NYC ACRIS System
              </h4>
              <p className="text-sm text-gray-400 mb-2">
                Search property records and filings
              </p>
              <a 
                href="https://a836-acris.nyc.gov/DS/DocumentSearch/Index" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-400 text-sm hover:underline flex items-center gap-1"
              >
                Search ACRIS <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                NYC Sheriff's Office
              </h4>
              <p className="text-sm text-gray-400 mb-2">
                Report property fraud and deed theft
              </p>
              <a 
                href="https://www.nysheriffs.org/fraud-prevention" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-400 text-sm hover:underline flex items-center gap-1"
              >
                Report Fraud <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                <Phone className="w-5 h-5 text-yellow-400" />
                NYC 311 Help
              </h4>
              <p className="text-sm text-gray-400 mb-2">
                Get assistance with property issues
              </p>
              <a 
                href="tel:311" 
                className="text-yellow-400 text-sm hover:underline flex items-center gap-1"
              >
                Call 311
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}