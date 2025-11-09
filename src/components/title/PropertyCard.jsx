import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, CheckCircle, Clock, AlertTriangle, Eye, MapPin, FileText, Lock, Shield
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function PropertyCard({ property, alerts }) {
  const propertyAlerts = alerts.filter(a => a.property_id === property.id);
  const newAlerts = propertyAlerts.filter(a => a.status === 'new').length;
  const criticalAlerts = propertyAlerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  
  const score = property.title_security_score || 100;
  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-cyan-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`bg-[#0f1419] rounded-lg p-6 border-2 ${
      criticalAlerts > 0 ? 'border-red-500/30' :
      newAlerts > 0 ? 'border-orange-500/30' :
      'border-cyan-500/10'
    } hover:border-cyan-500/30 transition-all`}>
      <div className="flex items-start gap-4">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
          property.verification_status 
            ? 'bg-gradient-to-br from-green-500 to-emerald-500'
            : 'bg-gradient-to-br from-gray-600 to-gray-700'
        }`}>
          <Home className="w-7 h-7 text-white" />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-white font-bold text-lg">{property.address}</h3>
              <p className="text-sm text-gray-400">
                {property.city}, {property.state} {property.zip_code}
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {property.verification_status ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50 border">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 border">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              )}
              {property.monitoring_enabled && (
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 border">
                  <Eye className="w-3 h-3 mr-1" />
                  {property.scan_frequency === 'daily' ? 'Daily Scan' : 'Weekly Scan'}
                </Badge>
              )}
              {property.is_locked && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50 border animate-pulse">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </Badge>
              )}
            </div>
          </div>

          {/* Security Score */}
          <div className="mb-4 p-4 bg-[#1a2332] rounded-lg border border-cyan-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-xs text-gray-400">Title Security Score</p>
                  <p className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={`${
                  score >= 90 ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                  score >= 70 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' :
                  score >= 50 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                  'bg-red-500/20 text-red-400 border-red-500/50'
                } border text-sm px-3 py-1`}>
                  {score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'At Risk'}
                </Badge>
                {property.score_last_updated && (
                  <p className="text-xs text-gray-500 mt-1">
                    Updated {format(new Date(property.score_last_updated), 'MMM dd')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-[#1a2332] rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Borough</p>
              <p className="text-sm text-white font-semibold">{property.borough}</p>
            </div>
            <div className="p-3 bg-[#1a2332] rounded-lg">
              <p className="text-xs text-gray-400 mb-1">BBL</p>
              <p className="text-sm text-white font-semibold font-mono">{property.borough_block_lot}</p>
            </div>
            <div className="p-3 bg-[#1a2332] rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Last Checked</p>
              <p className="text-sm text-white font-semibold">
                {property.last_checked 
                  ? format(new Date(property.last_checked), 'MMM dd, HH:mm')
                  : 'Never'}
              </p>
            </div>
          </div>

          {property.owner_names && property.owner_names.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">Registered Owners:</p>
              <div className="flex flex-wrap gap-2">
                {property.owner_names.filter(name => name).map((name, idx) => (
                  <Badge key={idx} className="bg-purple-500/20 text-purple-400 border-purple-500/50 border text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {propertyAlerts.length > 0 && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-sm text-red-400 font-semibold">
                  {newAlerts} New Alert{newAlerts !== 1 ? 's' : ''}
                  {criticalAlerts > 0 && ` (${criticalAlerts} Critical)`}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Link to={`${createPageUrl("ViewAlerts")}?property=${property.id}`}>
              <Button
                size="sm"
                variant="outline"
                className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Alerts
              </Button>
            </Link>
            {property.deed_file_url && (
              <Button
                size="sm"
                variant="outline"
                className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
                onClick={async () => {
                  const signedUrl = await base44.integrations.Core.CreateFileSignedUrl({
                    file_uri: property.deed_file_url,
                    expires_in: 300
                  });
                  window.open(signedUrl.signed_url, '_blank');
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                View Deed
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}