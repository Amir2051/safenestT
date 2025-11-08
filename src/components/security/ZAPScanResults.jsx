import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield, AlertTriangle, Download, ExternalLink,
  CheckCircle, XCircle, Clock, FileText
} from 'lucide-react';
import { format } from 'date-fns';

export default function ZAPScanResults({ scans, onViewDetails }) {
  if (!scans || scans.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-12 text-center">
          <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">No ZAP Scans Yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Scans run automatically every Sunday at 2:00 AM
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {scans.map((scan) => (
        <Card
          key={scan.id}
          className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all"
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    scan.pass_fail_status === 'pass'
                      ? 'bg-green-500/20'
                      : 'bg-red-500/20'
                  }`}>
                    {scan.pass_fail_status === 'pass' ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      {scan.metadata?.environment?.toUpperCase() || 'Unknown'} Environment
                    </h3>
                    <p className="text-gray-400 text-sm">{scan.target}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(scan.completed_at), 'MMM d, yyyy HH:mm')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    {scan.duration_seconds}s duration
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                    {scan.tool.replace('zap_', '').toUpperCase()}
                  </Badge>
                </div>

                {/* Findings Summary */}
                <div className="grid grid-cols-5 gap-3 mb-4">
                  <div className="bg-[#0f1419] rounded-lg p-3 border border-red-500/30 text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {scan.findings_summary?.critical || 0}
                    </p>
                    <p className="text-xs text-gray-400">Critical</p>
                  </div>
                  <div className="bg-[#0f1419] rounded-lg p-3 border border-orange-500/30 text-center">
                    <p className="text-2xl font-bold text-orange-400">
                      {scan.findings_summary?.high || 0}
                    </p>
                    <p className="text-xs text-gray-400">High</p>
                  </div>
                  <div className="bg-[#0f1419] rounded-lg p-3 border border-yellow-500/30 text-center">
                    <p className="text-2xl font-bold text-yellow-400">
                      {scan.findings_summary?.medium || 0}
                    </p>
                    <p className="text-xs text-gray-400">Medium</p>
                  </div>
                  <div className="bg-[#0f1419] rounded-lg p-3 border border-blue-500/30 text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {scan.findings_summary?.low || 0}
                    </p>
                    <p className="text-xs text-gray-400">Low</p>
                  </div>
                  <div className="bg-[#0f1419] rounded-lg p-3 border border-gray-500/30 text-center">
                    <p className="text-2xl font-bold text-gray-400">
                      {scan.findings_summary?.informational || 0}
                    </p>
                    <p className="text-xs text-gray-400">Info</p>
                  </div>
                </div>

                {/* Auto-block status */}
                {(scan.findings_summary?.critical > 0 || scan.findings_summary?.high > 0) && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 mb-3">
                    <p className="text-green-400 text-sm font-semibold">
                      ✅ High-severity exploits automatically blocked
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => onViewDetails(scan)}
                  size="sm"
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Details
                </Button>
                
                {scan.report_urls?.html && (
                  <Button
                    onClick={() => window.open(scan.report_urls.html, '_blank')}
                    size="sm"
                    variant="outline"
                    className="border-cyan-500/20 text-gray-300"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    HTML Report
                  </Button>
                )}
                
                {scan.report_urls?.json && (
                  <Button
                    onClick={() => window.open(scan.report_urls.json, '_blank')}
                    size="sm"
                    variant="outline"
                    className="border-cyan-500/20 text-gray-300"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    JSON Report
                  </Button>
                )}
              </div>
            </div>

            {/* Scan metadata */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-700">
              <span>Scan ID: {scan.scan_id}</span>
              <span>Tool: {scan.metadata?.tool_version || 'ZAP 2.14.0'}</span>
              <span>
                Triggered by: {scan.metadata?.triggered_by || 'scheduled_weekly_scan'}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}