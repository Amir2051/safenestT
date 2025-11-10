
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home, Shield, AlertTriangle, Plus, FileText,
  CheckCircle, Clock, MapPin, Bell, Eye, Lock, Users, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import AddPropertyDialog from "../components/title/AddPropertyDialog.jsx";
import PropertyCard from "../components/title/PropertyCard.jsx";
import TitleSecurityScore from "../components/title/TitleSecurityScore.jsx";
import TitleLockControl from "../components/title/TitleLockControl.jsx";
import MonitoringStatusCard from "../components/title/MonitoringStatusCard.jsx";
import ReferralShareWidget from "../components/referrals/ReferralShareWidget.jsx";

export default function TitleProtection() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [referrerName, setReferrerName] = useState(null);

  const queryClient = useQueryClient();

  const { data: properties = [], isLoading: propertiesLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
    enabled: !!user,
    initialData: [],
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['title-alerts'],
    queryFn: () => base44.entities.TitleAlert.filter({ property_owner: user?.email, status: 'new' }, '-alert_date', 20),
    enabled: !!user,
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(async (userData) => {
      setUser(userData);

      // Check for referral in URL
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');

      if (refCode) {
        // Find referrer to show welcome message
        try {
          const referrers = await base44.entities.User.filter({ referral_code: refCode.toUpperCase() });
          if (referrers.length > 0) {
            setReferrerName(referrers[0].full_name);
          }
        } catch (error) {
          console.error("Failed to fetch referrer:", error);
        }
      }
    }).catch((error) => {
      console.error("Failed to fetch user data:", error);
      // Handle authentication error, e.g., redirect to login or show a message
    });
  }, []);

  // Title Protection is FREE for everyone!
  const isAdmin = user?.role === 'admin';

  const verifiedProperties = properties.filter(p => p.verification_status).length;
  const monitoredProperties = properties.filter(p => p.monitoring_enabled).length;
  const lockedProperties = properties.filter(p => p.is_locked).length;
  const newAlerts = alerts.filter(a => a.status === 'new').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

  const avgScore = properties.length > 0
    ? Math.round(properties.reduce((sum, p) => sum + (p.title_security_score || 100), 0) / properties.length)
    : 100;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Referral Welcome Banner */}
      {referrerName && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
          <CardContent className="p-6 relative">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  🎉 Welcome! You were referred by {referrerName}
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </h2>
                <p className="text-purple-300 mb-3">
                  Add your first property to unlock Title Protection and help {referrerName} earn rewards!
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 border">
                    🏠 FREE Title Protection
                  </Badge>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 border">
                    ⚖️ FREE Legal Support
                  </Badge>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50 border">
                    🤖 AI Monitoring
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Home className="w-8 h-8 text-cyan-400" />
            Title Protection
            {isAdmin && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50 border">
                ADMIN
              </Badge>
            )}
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 border animate-pulse">
              100% FREE
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">
            AI-powered property monitoring with real-time threat detection • Free for everyone!
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {/* Free Features Banner */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-green-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">
                🎉 Title Protection - Completely FREE!
              </h3>
              <p className="text-green-300 text-sm">
                Unlimited properties • Daily scans • Title Lock • AI threat detection • No credit card required
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Your Referral Link - Show after user has properties */}
      {properties.length > 0 && (
        <ReferralShareWidget user={user} />
      )}

      {/* 2FA Requirement Banner - Not for admins */}
      {!user?.two_factor_enabled && properties.length > 0 && !isAdmin && (
        <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Lock className="w-10 h-10 text-orange-400" />
                <div>
                  <p className="text-white font-semibold">🔒 Enable Two-Factor Authentication</p>
                  <p className="text-orange-300 text-sm">
                    Two-factor authentication is required for Title Protection. Secure your account now.
                  </p>
                </div>
              </div>
              <Link to={createPageUrl("Settings")}>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  Enable 2FA
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Home className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-3xl font-bold text-white">{properties.length}</p>
            <p className="text-sm text-gray-400">Total Properties</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-green-400">{avgScore}</p>
            <p className="text-sm text-gray-400">Avg Security Score</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Lock className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-purple-400">{lockedProperties}</p>
            <p className="text-sm text-gray-400">Title Locked</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-3xl font-bold text-cyan-400">{monitoredProperties}</p>
            <p className="text-sm text-gray-400">Monitored</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Bell className="w-8 h-8 text-red-400" />
              {newAlerts > 0 && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  {newAlerts}
                </Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-red-400">{newAlerts}</p>
            <p className="text-sm text-gray-400">New Alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts > 0 && (
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-10 h-10 text-red-400 animate-pulse" />
                <div>
                  <p className="text-white font-semibold">
                    ⚠️ {criticalAlerts} Critical Alert{criticalAlerts > 1 ? 's' : ''} Require Immediate Attention
                  </p>
                  <p className="text-red-300 text-sm">
                    Suspicious property filings detected. Review immediately to protect your ownership.
                  </p>
                </div>
              </div>
              <Link to={createPageUrl("ViewAlerts")}>
                <Button className="bg-red-500 hover:bg-red-600">
                  View Alerts
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monitoring Status + Property Detail Side by Side - Always show if properties exist */}
      {properties.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MonitoringStatusCard properties={properties} />

          {selectedProperty ? (
            <>
              <TitleSecurityScore property={selectedProperty} />
              <TitleLockControl property={selectedProperty} user={user} />
            </>
          ) : (
            <div className="lg:col-span-2">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardContent className="p-12 text-center">
                  <Lock className="w-16 h-16 text-cyan-400 mx-auto mb-4 opacity-50" />
                  <p className="text-white font-semibold text-lg">Select a Property</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Click on any property card below to view security score and Title Lock controls
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-cyan-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-white font-bold mb-2">🤖 AI-Powered Title Protection - 100% FREE</h3>
              <ul className="space-y-1 text-sm text-cyan-300">
                <li>• <strong>Real-Time Monitoring:</strong> Daily scans of NYC ACRIS database for all users</li>
                <li>• <strong>AI Threat Detection:</strong> Identifies irregular ownership changes and suspicious filings</li>
                <li>• <strong>Title Security Score:</strong> 0-100 score updated after each scan</li>
                <li>• <strong>Title Lock:</strong> Digitally lock property to prevent unauthorized changes (FREE!)</li>
                <li>• <strong>Auto-Lock Timer:</strong> Set lock duration from 7 days to permanent</li>
                <li>• <strong>Unlimited Properties:</strong> Add as many properties as you need</li>
                <li>• <strong>Legal Support:</strong> Auto-generated reports with attorney contacts</li>
                <li>• <strong>Instant Alerts:</strong> Email + push notifications for any suspicious activity</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Properties */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              My Properties
            </span>
            {properties.length > 0 && (
              <Link to={createPageUrl("ViewAlerts")}>
                <Button variant="outline" size="sm" className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10">
                  <Bell className="w-4 h-4 mr-2" />
                  View All Alerts
                </Button>
              </Link>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {propertiesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-[#0f1419] rounded-lg h-32" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <Home className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No Properties Added Yet</p>
              <p className="text-gray-400 text-sm mt-1 mb-6">
                Start protecting your property with AI-powered monitoring - completely FREE!
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Property
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => setSelectedProperty(property)}
                  className={`cursor-pointer transition-all ${
                    selectedProperty?.id === property.id ? 'ring-2 ring-cyan-500/50 rounded-lg' : ''
                  }`}
                >
                  <PropertyCard property={property} alerts={alerts} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-white font-bold mb-2">AI Threat Detection</h3>
            <p className="text-sm text-gray-400">
              Machine learning identifies suspicious patterns and ownership irregularities
            </p>
            <Badge className="mt-3 bg-green-500/20 text-green-400 border-green-500/50 border">
              FREE
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20 hover:border-green-500/40 transition-all">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-white font-bold mb-2">Title Lock with Timer</h3>
            <p className="text-sm text-gray-400">
              Digitally lock your property with auto-expiry options from 7 days to permanent
            </p>
            <Badge className="mt-3 bg-green-500/20 text-green-400 border-green-500/50 border">
              FREE
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20 hover:border-purple-500/40 transition-all">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-white font-bold mb-2">Legal Support</h3>
            <p className="text-sm text-gray-400">
              Auto-generated reports with verified attorney contacts
            </p>
            <Badge className="mt-3 bg-green-500/20 text-green-400 border-green-500/50 border">
              FREE
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Add Property Dialog */}
      <AddPropertyDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
