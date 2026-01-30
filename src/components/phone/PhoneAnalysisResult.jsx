import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, AlertTriangle, CheckCircle2, TrendingUp, 
  Building2, Database, Clock, Info, Flag, ExternalLink
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PhoneAnalysisResult({ analysis, onReport }) {
  const getRiskIcon = () => {
    switch (analysis.risk_classification) {
      case 'LEGITIMATE':
        return <CheckCircle2 className="w-6 h-6 text-green-400" />;
      case 'USE_CAUTION':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'HIGH_RISK':
        return <Shield className="w-6 h-6 text-red-400 animate-pulse" />;
      default:
        return <Info className="w-6 h-6 text-gray-400" />;
    }
  };

  const getRiskColor = () => {
    switch (analysis.risk_classification) {
      case 'LEGITIMATE':
        return 'from-green-500/10 to-emerald-500/10 border-green-500/30';
      case 'USE_CAUTION':
        return 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30';
      case 'HIGH_RISK':
        return 'from-red-500/10 to-pink-500/10 border-red-500/30';
      default:
        return 'from-gray-500/10 to-gray-500/10 border-gray-500/30';
    }
  };

  const getRiskLabel = () => {
    switch (analysis.risk_classification) {
      case 'LEGITIMATE':
        return '🟢 Likely Legitimate';
      case 'USE_CAUTION':
        return '🟡 Use Caution';
      case 'HIGH_RISK':
        return '🔴 High Risk / Reported Abuse';
      default:
        return '⚪ Unknown';
    }
  };

  const getExplanation = () => {
    const explanations = [];
    
    if (analysis.scam_reports?.count > 0) {
      explanations.push(`Reported ${analysis.scam_reports.count} times by ${analysis.scam_reports.sources.length} independent sources`);
    }
    
    if (analysis.business_associations?.detected) {
      explanations.push(`Associated with registered business: ${analysis.business_associations.business_name}`);
    }
    
    if (analysis.behavioral_indicators?.high_volume_calls) {
      explanations.push('High-frequency call pattern detected');
    }
    
    if (analysis.digital_presence_score < 30) {
      explanations.push('Limited digital footprint - minimal public information available');
    }
    
    if (explanations.length === 0) {
      explanations.push('No significant risk indicators detected in public databases');
    }
    
    return explanations;
  };

  return (
    <div className="space-y-6">
      {/* Main Risk Classification */}
      <Card className={`bg-gradient-to-br ${getRiskColor()}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {getRiskIcon()}
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {analysis.phone_number}
                </h3>
                <p className="text-gray-400 text-sm">
                  {analysis.country_code} • {analysis.phone_type}
                </p>
              </div>
            </div>
            <Button
              onClick={onReport}
              variant="outline"
              className="border-red-500/30 text-red-400"
            >
              <Flag className="w-4 h-4 mr-2" />
              Report as Spam
            </Button>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <Badge className={
              analysis.risk_classification === 'LEGITIMATE' ? 'bg-green-500/20 text-green-400 border-green-500/50 text-lg py-2 px-4' :
              analysis.risk_classification === 'USE_CAUTION' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-lg py-2 px-4' :
              'bg-red-500/20 text-red-400 border-red-500/50 text-lg py-2 px-4'
            }>
              {getRiskLabel()}
            </Badge>
            <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">
              Confidence: {analysis.confidence_score}%
            </Badge>
          </div>

          {/* Explainability */}
          <div className="bg-black/20 rounded-lg p-4 border border-white/10">
            <div className="flex items-start gap-2 mb-2">
              <Info className="w-4 h-4 text-cyan-400 mt-0.5" />
              <p className="text-white font-semibold text-sm">Why this classification?</p>
            </div>
            <ul className="space-y-1 text-sm text-gray-300">
              {getExplanation().map((explanation, idx) => (
                <li key={idx}>• {explanation}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Digital Presence Score */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                <h4 className="text-white font-semibold">Digital Presence</h4>
              </div>
              <Badge className={
                analysis.digital_presence_score >= 60 ? 'bg-green-500/20 text-green-400' :
                analysis.digital_presence_score >= 30 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }>
                {analysis.digital_presence_score >= 60 ? 'High' :
                 analysis.digital_presence_score >= 30 ? 'Medium' : 'Low'}
              </Badge>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Score</span>
                <span className="text-white font-mono">{analysis.digital_presence_score}/100</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    analysis.digital_presence_score >= 60 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    analysis.digital_presence_score >= 30 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                    'bg-gradient-to-r from-red-500 to-pink-500'
                  }`}
                  style={{ width: `${analysis.digital_presence_score}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Based on public internet presence and verification sources
            </p>
          </CardContent>
        </Card>

        {/* Scam Reports */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-orange-400" />
                <h4 className="text-white font-semibold">Abuse Reports</h4>
              </div>
              {analysis.scam_reports?.count > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                  {analysis.scam_reports.count} Reports
                </Badge>
              )}
            </div>
            {analysis.scam_reports?.count > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  Found in {analysis.scam_reports.sources.length} public database(s)
                </p>
                <div className="flex flex-wrap gap-1">
                  {analysis.scam_reports.report_types?.map((type, idx) => (
                    <Badge key={idx} className="bg-orange-500/20 text-orange-400 text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                ✓ No abuse reports found in public databases
              </p>
            )}
          </CardContent>
        </Card>

        {/* Business Association */}
        {analysis.business_associations?.detected && (
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h4 className="text-white font-semibold">Business Association</h4>
              </div>
              <div className="space-y-2">
                <p className="text-white font-medium">
                  {analysis.business_associations.business_name}
                </p>
                <Badge className="bg-blue-500/20 text-blue-400">
                  {analysis.business_associations.verification_status}
                </Badge>
                <p className="text-xs text-gray-400 mt-2">
                  Type: {analysis.business_associations.business_type}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Metadata */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-purple-400" />
              <h4 className="text-white font-semibold">Analysis Details</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Analyzed</span>
                <span className="text-white">
                  {new Date(analysis.analysis_timestamp).toLocaleString()}
                </span>
              </div>
              {analysis.cached && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Cache Age</span>
                  <span className="text-white">{analysis.age_days} days</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Sources</span>
                <span className="text-white">{analysis.sources_consulted?.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forensic Notes */}
      <Alert className="bg-gray-500/10 border-gray-500/30">
        <Info className="h-4 w-4 text-gray-400" />
        <AlertDescription className="text-gray-300 text-xs">
          <strong>Forensic Notes:</strong> {analysis.forensic_notes}
        </AlertDescription>
      </Alert>
    </div>
  );
}