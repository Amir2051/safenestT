import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Link2, Copy, Globe, Smartphone, Monitor, Clock, MapPin,
  Download, Loader2, Eye, Shield, AlertTriangle, Check, Tablet, Map as MapIcon,
  Server, Lock, Network
} from "lucide-react";
import { toast } from "sonner";
import TrackingMap from "./TrackingMap";

export default function TrackingToolsPanel({ caseId, caseTitle }) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: trackingData, isLoading } = useQuery({
    queryKey: ['tracking-data', caseId],
    queryFn: async () => {
      const response = await base44.functions.invoke('trackingService', {
        endpoint: 'get-tracking-data',
        case_id: caseId
      });
      return response.data;
    },
    enabled: !!caseId,
    refetchInterval: 10000
  });

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('trackingService', {
        endpoint: 'generate',
        case_id: caseId
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tracking-data', caseId] });
      copyToClipboard(data.url);
      toast.success('Tracking link generated and copied!');
    },
    onError: (error) => {
      toast.error('Failed to generate link: ' + error.message);
    }
  });

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for when clipboard API is not available
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportToPDF = () => {
    const trackingLink = trackingData?.tracking_links?.[0];
    if (!trackingLink || !trackingLink.clicks?.length) {
      toast.error('No tracking data to export');
      return;
    }

    // Create printable HTML content
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Technical Evidence Report - ${caseTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1a1a2e; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
          h2 { color: #4f46e5; margin-top: 30px; }
          .meta { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background: #4f46e5; color: white; }
          tr:nth-child(even) { background: #f9fafb; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>🔒 Technical Evidence Report</h1>
        <div class="meta">
          <p><strong>Case:</strong> ${caseTitle}</p>
          <p><strong>Case ID:</strong> ${caseId}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Tracking Code:</strong> ${trackingLink.tracking_code}</p>
          <p><strong>Total Clicks Recorded:</strong> ${trackingLink.total_clicks}</p>
        </div>

        <div class="warning">
          ⚠️ This document contains automatically captured technical evidence. All IP addresses and device information were collected when the tracking link was accessed.
        </div>

        <h2>📊 Click Events Log</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Timestamp</th>
              <th>IP Address</th>
              <th>Country</th>
              <th>City/Region</th>
              <th>Device</th>
              <th>Browser</th>
              <th>OS</th>
            </tr>
          </thead>
          <tbody>
            ${trackingLink.clicks.map((click, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${new Date(click.timestamp).toLocaleString()}</td>
                <td><strong>${click.ip_address}</strong></td>
                <td>${click.country}</td>
                <td>${click.city}, ${click.region}</td>
                <td>${click.device_type}</td>
                <td>${click.browser}</td>
                <td>${click.os}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>📝 Raw User Agent Strings</h2>
        ${trackingLink.clicks.map((click, idx) => `
          <p><strong>Click ${idx + 1}:</strong> ${click.user_agent}</p>
        `).join('')}

        <div class="footer">
          <p>This report was automatically generated by SafeNestT Security Platform.</p>
          <p>For law enforcement use. Document ID: ${trackingLink.tracking_code}-${Date.now()}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const trackingLink = trackingData?.tracking_links?.[0];
  const clicks = trackingLink?.clicks || [];

  const getDeviceIcon = (device) => {
    if (device === 'Mobile') return <Smartphone className="w-4 h-4" />;
    if (device === 'Tablet') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/30">
      <CardHeader className="border-b border-purple-500/20">
        <CardTitle className="text-white flex items-center gap-2">
          <Network className="w-5 h-5 text-purple-400" />
          Network Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Generate/Copy Link Section */}
        <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h4 className="text-white font-semibold flex items-center gap-2">
                <Link2 className="w-4 h-4 text-purple-400" />
                Network Intelligence Link
              </h4>
              <p className="text-gray-400 text-xs mt-1">
                Generate a secure link to gather threat attribution data
              </p>
            </div>
            
            {!trackingLink ? (
              <div className="flex flex-col items-end gap-2">
                 <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-[10px] text-yellow-200 max-w-md">
                    ⚠️ Compliance Notice: This link collects network metadata for security investigations. 
                    Ensure you have authorization before deployment.
                 </div>
                 <Button
                  onClick={() => generateLinkMutation.mutate()}
                  disabled={generateLinkMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {generateLinkMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Initializing...</>
                  ) : (
                    <><Link2 className="w-4 h-4 mr-2" />Generate Link</>
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  const url = `${window.location.origin}/TrackingPage?t=${trackingLink.tracking_code}`;
                  copyToClipboard(url);
                  toast.success('Link copied!');
                }}
                variant="outline"
                className="border-purple-500/30 text-purple-400"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            )}
          </div>

          {trackingLink && (
            <div className="mt-3 p-2 bg-[#0f1419] rounded font-mono text-xs text-cyan-400 break-all">
              {`${window.location.origin}/TrackingPage?t=${trackingLink.tracking_code}`}
            </div>
          )}
        </div>

        {/* Technical Evidence Section */}
        {trackingLink && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                Technical Evidence (Auto Logged)
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                  {clicks.length} clicks
                </Badge>
              </h4>
              
              {clicks.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportToPDF}
                  className="border-green-500/30 text-green-400"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              )}
            </div>

            {clicks.length === 0 ? (
              <div className="p-6 bg-[#0f1419] rounded-lg border border-gray-700/50 text-center">
                <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No clicks recorded yet</p>
                <p className="text-gray-500 text-xs mt-1">
                  Send the tracking link to the scammer to capture their data
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Map Visualization */}
                <div>
                  <h5 className="text-gray-300 font-medium mb-3 flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-cyan-400" />
                    Geographical Visualization
                  </h5>
                  <TrackingMap clicks={clicks} />
                </div>

                <div className="space-y-3">
                {clicks.map((click, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/50 font-mono">
                            {click.ip_address}
                          </Badge>
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                            <Globe className="w-3 h-3 mr-1" />
                            {click.country}
                          </Badge>
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                            {getDeviceIcon(click.device_type)}
                            <span className="ml-1">{click.device_type}</span>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                          <div>
                            <span className="text-gray-500">City:</span>
                            <p className="text-white">{click.city}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Region:</span>
                            <p className="text-white">{click.region}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Browser:</span>
                            <p className="text-white">{click.browser}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">OS:</span>
                            <p className="text-white">{click.os}</p>
                          </div>
                        </div>

                        {/* Enhanced Network Intelligence Data */}
                        <div className="bg-[#151a23] p-3 rounded border border-cyan-500/10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Server className="w-3 h-3 text-cyan-400" />
                                        <span className="text-xs text-cyan-400 font-semibold">ISP / Organization</span>
                                    </div>
                                    <p className="text-white text-xs">{click.organization || click.isp || 'Unknown'}</p>
                                    <p className="text-gray-500 text-[10px]">{click.asn || ''}</p>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Lock className="w-3 h-3 text-red-400" />
                                        <span className="text-xs text-red-400 font-semibold">Risk Indicators</span>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {click.privacy?.vpn && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] h-5">VPN Detected</Badge>}
                                        {click.privacy?.proxy && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] h-5">Proxy Detected</Badge>}
                                        {click.privacy?.hosting && <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px] h-5">Hosting Provider</Badge>}
                                        {click.privacy?.tor && <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] h-5">Tor Node</Badge>}
                                        {!click.privacy?.vpn && !click.privacy?.proxy && !click.privacy?.hosting && !click.privacy?.tor && (
                                            <span className="text-green-500 text-xs flex items-center gap-1"><Check className="w-3 h-3" /> No Proxies Detected</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {new Date(click.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}