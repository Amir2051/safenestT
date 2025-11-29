import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, Upload, Activity, AlertTriangle, ChevronRight, Lock } from "lucide-react";
import { createPageUrl } from "@/utils";
import RecentAlertsCard from "@/components/dashboard/RecentAlertsCard";

export default function VictimPortal() {
  return (
    <div className="min-h-screen bg-[#000000] text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Victim Support Portal
            </h1>
            <p className="text-gray-400 mt-2">
              Securely report scams, track your case, and submit evidence.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-900/20 border border-green-500/30 rounded-full">
            <Lock className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400 font-medium">Encrypted Connection</span>
          </div>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#0f1419] border-cyan-500/20 hover:border-cyan-500/50 transition-all group">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                <AlertTriangle className="w-6 h-6 text-cyan-400" />
              </div>
              <CardTitle className="text-white">Report a Scam</CardTitle>
              <CardDescription className="text-gray-400">
                File a new report for crypto fraud, phishing, or theft.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl('ReportScam')}>
                <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white group-hover:translate-x-1 transition-all">
                  Start Report <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-[#0f1419] border-purple-500/20 hover:border-purple-500/50 transition-all group">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Track Case Status</CardTitle>
              <CardDescription className="text-gray-400">
                View the timeline and status of your submitted cases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl('MyCases')}>
                <Button variant="outline" className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                  View My Cases
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-[#0f1419] border-blue-500/20 hover:border-blue-500/50 transition-all group">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                <Upload className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-white">Upload Evidence</CardTitle>
              <CardDescription className="text-gray-400">
                Securely submit documents, screenshots, and logs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={createPageUrl('MyCases')}>
                <Button variant="outline" className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                  Submit Files
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Status & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-[#1a2332] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                Security Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <h4 className="text-red-400 font-semibold text-sm">Immediate Action Required</h4>
                  <p className="text-gray-300 text-sm mt-1">If you suspect your wallet is compromised, revoke all permissions and transfer remaining funds to a cold wallet immediately.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-blue-400 font-semibold text-sm">Document Everything</h4>
                  <p className="text-gray-300 text-sm mt-1">Save all chat logs, transaction hashes, and website URLs. Do not delete any communication.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-1">
            <RecentAlertsCard />
          </div>
        </div>
      </div>
    </div>
  );
}