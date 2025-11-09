import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, CheckCircle, Clock, AlertTriangle, Eye, MapPin, FileText, Lock, Shield, Unlock, Image as ImageIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

export default function PropertyCard({ property, alerts }) {
  const [propertyImageUrl, setPropertyImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

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

  // Load property image if deed is uploaded
  useEffect(() => {
    const loadPropertyImage = async () => {
      if (property.deed_file_url) {
        setImageLoading(true);
        try {
          const signedUrl = await base44.integrations.Core.CreateFileSignedUrl({
            file_uri: property.deed_file_url,
            expires_in: 3600
          });
          setPropertyImageUrl(signedUrl.signed_url);
        } catch (error) {
          console.error('Failed to load property image:', error);
        }
        setImageLoading(false);
      }
    };

    loadPropertyImage();
  }, [property.deed_file_url]);

  return (
    <div className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-xl p-6 border-2 transition-all hover:scale-[1.02] ${
      criticalAlerts > 0 ? 'border-red-500/50 shadow-lg shadow-red-500/20' :
      newAlerts > 0 ? 'border-orange-500/30' :
      property.is_locked ? 'border-green-500/30 shadow-lg shadow-green-500/10' :
      'border-cyan-500/10 hover:border-cyan-500/30'
    }`}>
      <div className="flex items-start gap-4">
        {/* Property Profile Picture */}
        <div className="flex flex-col items-center gap-2">
          <div className={`w-24 h-24 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 relative border-2 ${
            property.verification_status 
              ? 'border-green-500/50 shadow-lg shadow-green-500/20'
              : 'border-gray-600'
          }`}>
            {imageLoading ? (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
              </div>
            ) : propertyImageUrl ? (
              <img 
                src={propertyImageUrl} 
                alt={property.address}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `
                    <div class="w-full h-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center">
                      <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                      </svg>
                    </div>
                  `;
                }}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                property.verification_status 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                  : 'bg-gradient-to-br from-gray-600 to-gray-700'
              }`}>
                <Home className="w-12 h-12 text-white" />
              </div>
            )}
            
            {property.is_locked && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full border-2 border-[#0f1419] flex items-center justify-center animate-pulse z-10">
                <Lock className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          
          {/* Upload/View Deed Button */}
          {property.deed_file_url ? (
            <Button
              size="sm"
              variant="outline"
              className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10 text-xs"
              onClick={async () => {
                const signedUrl = await base44.integrations.Core.CreateFileSignedUrl({
                  file_uri: property.deed_file_url,
                  expires_in: 300
                });
                window.open(signedUrl.signed_url, '_blank');
              }}
            >
              <FileText className="w-3 h-3 mr-1" />
              View Deed
            </Button>
          ) : (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 border text-xs">
              <ImageIcon className="w-3 h-3 mr-1" />
              No Image
            </Badge>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">{property.address}</h3>
              <p className="text-sm text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
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
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-500/50 border-2 shadow-lg shadow-green-500/30 px-3 py-1.5 font-bold animate-pulse">
                  <Lock className="w-4 h-4 mr-1" />
                  LOCKED
                </Badge>
              )}
            </div>
          </div>

          {/* Security Score - Prominent */}
          <div className="mb-4 p-5 bg-[#0f1419] rounded-xl border-2 border-cyan-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${
                  score >= 90 ? 'from-green-500 to-emerald-500' :
                  score >= 70 ? 'from-cyan-500 to-blue-500' :
                  score >= 50 ? 'from-yellow-500 to-amber-500' :
                  'from-red-500 to-orange-500'
                } flex items-center justify-center shadow-lg`}>
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Title Security Score</p>
                  <p className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={`${
                  score >= 90 ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                  score >= 70 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' :
                  score >= 50 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                  'bg-red-500/20 text-red-400 border-red-500/50'
                } border text-base px-4 py-2 font-bold`}>
                  {score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'At Risk'}
                </Badge>
                {property.score_last_updated && (
                  <p className="text-xs text-gray-500 mt-2">
                    Updated {format(new Date(property.score_last_updated), 'MMM dd')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <p className="text-xs text-gray-400 mb-1">Borough</p>
              <p className="text-sm text-white font-semibold">{property.borough}</p>
            </div>
            <div className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <p className="text-xs text-gray-400 mb-1">BBL</p>
              <p className="text-sm text-white font-semibold font-mono">{property.borough_block_lot}</p>
            </div>
            <div className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
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
            <div className="mb-4 p-4 bg-red-500/10 border-2 border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                <p className="text-sm text-red-400 font-bold">
                  {newAlerts} New Alert{newAlerts !== 1 ? 's' : ''}
                  {criticalAlerts > 0 && ` (${criticalAlerts} Critical)`}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Link to={`${createPageUrl("ViewAlerts")}?property=${property.id}`} className="flex-1">
              <Button
                size="sm"
                variant="outline"
                className="w-full border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Alerts
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}