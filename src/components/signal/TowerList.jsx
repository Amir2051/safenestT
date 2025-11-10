import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Signal, Radio, Flag, AlertTriangle, Shield, RefreshCw } from "lucide-react";

export default function TowerList({ towers = [], onReport, onRefresh, loading }) {
  const [selectedTower, setSelectedTower] = useState(null);

  const getWarningColor = (warningLevel) => {
    switch (warningLevel) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-green-500/20 text-green-400 border-green-500/50';
    }
  };

  const getWarningIcon = (warningLevel) => {
    if (warningLevel === 'critical' || warningLevel === 'high') {
      return <AlertTriangle className="w-4 h-4 animate-pulse" />;
    }
    return <Shield className="w-4 h-4" />;
  };

  const getSignalBars = (signal) => {
    // Signal strength: -50 (excellent) to -110 (no signal)
    if (signal >= -70) return 5;
    if (signal >= -85) return 4;
    if (signal >= -95) return 3;
    if (signal >= -105) return 2;
    return 1;
  };

  const getRadioColor = (radio) => {
    if (radio === '5G' || radio === 'NR') return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    if (radio === '4G' || radio === 'LTE') return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';
    if (radio === '3G' || radio === 'UMTS') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    return 'bg-red-500/20 text-red-400 border-red-500/50'; // 2G
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Nearby Towers ({towers.length})
          </div>
          <Button
            onClick={onRefresh}
            size="sm"
            variant="outline"
            className="border-cyan-500/20 text-cyan-400"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Scan Again
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {towers.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No towers found</p>
            <p className="text-xs text-gray-500 mt-1">Click "Scan Again" to search for towers</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {towers.map((tower, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedTower(selectedTower?.cell_id === tower.cell_id ? null : tower)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedTower?.cell_id === tower.cell_id
                    ? 'bg-cyan-500/20 border-cyan-500/50'
                    : 'bg-[#0f1419] border-cyan-500/10 hover:border-cyan-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Radio className="w-4 h-4 text-cyan-400" />
                      <span className="text-white font-semibold text-sm">
                        {tower.mcc}/{tower.mnc}
                      </span>
                      <Badge className={`${getRadioColor(tower.radio)} border text-xs`}>
                        {tower.radio}
                      </Badge>
                      {tower.is_unverified && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 border text-xs">
                          Unverified
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                      <span>Cell: {tower.cell_id}</span>
                      <span>Samples: {tower.samples}</span>
                    </div>

                    {/* Signal Strength */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((bar) => (
                          <div
                            key={bar}
                            className={`w-1.5 rounded-sm transition-all ${
                              bar <= getSignalBars(tower.signal)
                                ? tower.signal >= -70 ? 'bg-green-400' : 
                                  tower.signal >= -85 ? 'bg-cyan-400' :
                                  tower.signal >= -95 ? 'bg-yellow-400' : 'bg-orange-400'
                                : 'bg-gray-700'
                            }`}
                            style={{ height: `${bar * 3 + 6}px` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {tower.signal} dBm
                      </span>
                    </div>
                  </div>

                  {/* Warning Badge */}
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`${getWarningColor(tower.warning_level)} border`}>
                      {getWarningIcon(tower.warning_level)}
                      <span className="ml-1 text-xs">
                        {tower.warning_level === 'none' ? 'Safe' : 
                         tower.warning_level === 'critical' ? 'Critical' :
                         tower.warning_level === 'high' ? 'High Risk' : 'Medium'}
                      </span>
                    </Badge>
                    {tower.warning_level !== 'none' && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReport(tower);
                        }}
                        size="sm"
                        variant="outline"
                        className="border-red-500/20 text-red-400 h-7 text-xs"
                      >
                        <Flag className="w-3 h-3 mr-1" />
                        Report
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedTower?.cell_id === tower.cell_id && (
                  <div className="mt-3 pt-3 border-t border-cyan-500/20 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">LAC</p>
                        <p className="text-white font-mono">{tower.lac || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">CID</p>
                        <p className="text-white font-mono">{tower.cid || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Range</p>
                        <p className="text-white">{tower.range ? `${tower.range}m` : 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Coordinates</p>
                        <p className="text-white font-mono text-xs">
                          {tower.latitude?.toFixed(4)}, {tower.longitude?.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    {/* Warnings */}
                    {tower.warning_level !== 'none' && (
                      <div className={`p-2 rounded border ${
                        tower.warning_level === 'critical' 
                          ? 'bg-red-500/10 border-red-500/20' 
                          : tower.warning_level === 'high'
                          ? 'bg-orange-500/10 border-orange-500/20'
                          : 'bg-yellow-500/10 border-yellow-500/20'
                      }`}>
                        <p className="text-xs text-gray-300">
                          {tower.is_unverified && !tower.is_known_carrier && (
                            <>⚠️ <strong>Unverified & Unknown Carrier</strong> - This tower has very few samples and isn't in our carrier database. Could be a temporary tower or potential threat.</>
                          )}
                          {tower.is_unverified && tower.is_known_carrier && (
                            <>⚠️ <strong>Low Sample Count</strong> - This tower has fewer than 5 reports. It may be newly deployed or rarely used.</>
                          )}
                          {!tower.is_unverified && !tower.is_known_carrier && (
                            <>ℹ️ <strong>Unknown Carrier</strong> - This tower isn't in our major carrier database. May be a regional provider.</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}