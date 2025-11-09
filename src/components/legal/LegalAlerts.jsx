import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, Download, ExternalLink, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function LegalAlerts({ alerts, properties, selectedProperty }) {
  const [generating, setGenerating] = useState(null);
  const queryClient = useQueryClient();

  const generateLegalReportMutation = useMutation({
    mutationFn: async (alert) => {
      setGenerating(alert.id);

      const property = properties.find(p => p.id === alert.property_id);
      
      // Generate AI legal analysis
      const legalAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a NYC real estate attorney analyzing a property title alert.

Property: ${property.address}
BBL: ${property.borough_block_lot}
Filing Type: ${alert.filing_type}
Filed By: ${alert.filing_party}
Filing Date: ${alert.filing_date}
Document ID: ${alert.document_id}
Amount: ${alert.document_amount || 'N/A'}

Provide:
1. Legal assessment of the filing
2. Potential risks and implications
3. Immediate recommended actions
4. Legal options available
5. Timeline and deadlines
6. Estimated legal costs

Return detailed JSON analysis.`,
        response_json_schema: {
          type: "object",
          properties: {
            risk_assessment: { type: "string" },
            legal_implications: { type: "array", items: { type: "string" } },
            immediate_actions: { type: "array", items: { type: "string" } },
            legal_options: { type: "array", items: { type: "string" } },
            recommended_timeline: { type: "string" },
            estimated_costs: { type: "string" },
            urgency_level: { type: "string" },
            requires_attorney: { type: "boolean" }
          }
        }
      });

      // Find verified NYC attorneys
      const attorneys = await base44.integrations.Core.InvokeLLM({
        prompt: `Find 3 verified NYC real estate attorneys specializing in title fraud and property disputes.
        
Include:
- Full name
- Firm name
- Bar number
- Specialization
- Phone and email
- Years of experience

Return JSON array.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            attorneys: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  firm: { type: "string" },
                  bar_number: { type: "string" },
                  specialization: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string" },
                  experience_years: { type: "number" },
                  verified: { type: "boolean" }
                }
              }
            }
          }
        }
      });

      // Create legal report
      const report = await base44.entities.TitleAlertReport.create({
        alert_id: alert.id,
        property_id: alert.property_id,
        property_owner: alert.property_owner,
        report_type: 'legal_summary',
        generated_at: new Date().toISOString(),
        property_address: property.address,
        document_id: alert.document_id,
        filing_date: alert.filing_date,
        suspected_issue: `${alert.filing_type} filed by ${alert.filing_party}`,
        risk_level: legalAnalysis.urgency_level,
        acris_link: alert.acris_url,
        ai_analysis: legalAnalysis,
        legal_contacts: attorneys.attorneys
      });

      // Create legal action
      await base44.entities.LegalAction.create({
        property_id: alert.property_id,
        alert_id: alert.id,
        action_type: 'investigation_opened',
        action_date: new Date().toISOString(),
        description: `Legal investigation opened for suspicious ${alert.filing_type}`,
        status: 'pending',
        priority: legalAnalysis.urgency_level === 'critical' ? 'urgent' : 'high',
        next_steps: legalAnalysis.immediate_actions,
        cost_estimate: parseFloat(legalAnalysis.estimated_costs.replace(/[^0-9.]/g, '')) || 0
      });

      // Log audit
      await base44.entities.AuditLog.create({
        action_type: 'settings_updated',
        action_category: 'security',
        description: `Legal report generated for property alert: ${property.address}`,
        metadata: {
          alert_id: alert.id,
          property_id: property.id,
          report_id: report.id
        },
        severity: 'high',
        status: 'success'
      });

      setGenerating(null);
      return report;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['title-alert-reports'] });
      toast.success('✅ Legal report generated with attorney contacts!');
    },
    onError: () => {
      setGenerating(null);
      toast.error('Failed to generate legal report');
    }
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const filteredAlerts = selectedProperty 
    ? alerts.filter(a => a.property_id === selectedProperty.id)
    : alerts;

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Legal Alerts & Recommendations
          </span>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
            {filteredAlerts.length} Total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <p className="text-white font-semibold text-lg">No Legal Alerts</p>
            <p className="text-gray-400 text-sm mt-1">
              All properties are secure. We'll notify you immediately if suspicious activity is detected.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map(alert => {
              const property = properties.find(p => p.id === alert.property_id);
              
              return (
                <div
                  key={alert.id}
                  className={`bg-[#0f1419] rounded-lg p-5 border-2 ${
                    alert.status === 'new' ? 'border-red-500/30' : 'border-cyan-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <h3 className="text-white font-bold">
                          {property?.address || 'Unknown Property'}
                        </h3>
                        <Badge className={`${getSeverityColor(alert.severity)} border text-xs`}>
                          {alert.severity}
                        </Badge>
                        <Badge className={
                          alert.status === 'new' 
                            ? 'bg-red-500/20 text-red-400 border-red-500/50 border' 
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/50 border'
                        }>
                          {alert.status}
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
                      </div>
                    </div>
                  </div>

                  {/* Legal Recommendations */}
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-3">
                    <h4 className="text-yellow-400 font-bold text-sm mb-2">
                      ⚖️ Legal Recommendations:
                    </h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Immediately review the ACRIS document for accuracy</li>
                      <li>• Contact a NYC real estate attorney if filing is unauthorized</li>
                      <li>• File a formal dispute with NYC Department of Finance</li>
                      <li>• Consider filing a police report for deed fraud</li>
                      <li>• Enable Title Lock to prevent further unauthorized changes</li>
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => generateLegalReportMutation.mutate(alert)}
                      disabled={generating === alert.id}
                      size="sm"
                      className="bg-purple-500 hover:bg-purple-600"
                    >
                      {generating === alert.id ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Generate Legal Report
                        </>
                      )}
                    </Button>

                    {alert.acris_url && (
                      <Button
                        onClick={() => window.open(alert.acris_url, '_blank')}
                        size="sm"
                        variant="outline"
                        className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View ACRIS
                      </Button>
                    )}

                    <Button
                      onClick={() => {
                        const url = "https://www1.nyc.gov/site/finance/taxes/property-fraud-report-form.page";
                        window.open(url, '_blank');
                      }}
                      size="sm"
                      variant="outline"
                      className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Report to NYC
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}