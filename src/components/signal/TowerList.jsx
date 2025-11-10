import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Signal, Radio, Flag } from "lucide-react";

export default function TowerList({ currentTower, signalHistory, onReport }) {
  const getSignalStrength = (rssi) => {
    if (rssi >= -70) return { label: 'Excellent', color: 'text-green-400', bars: 5 };
    if (rssi >= -85) return { label: 'Good', color: 'text-cyan-400', bars: 4 };
    if (rssi >= -95) return { label: 'Fair', color: 'text-yellow-400', bars: 3 };
    if (rssi >= -105) return { label: 'Weak', color: 'text-orange-400', bars: 2 };
    return { label: 'Very Weak', color: 'text-red-400', bars: 1 };
  };

  const getConnectionColor = (type) => {
    if (type === '5G') return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
    if (type === '4G') return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';
    if (type === '3G') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    return 'bg-red-500/20 text-red-400 border-red-500/50';
  };

  const getStatusColor = (status) => {
    if (status === 'normal') return 'bg-green-500/20 text-green-400 border-green-500/50';
    if (status === 'anomaly') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    return 'bg-red-500/20 text-red-400 border-red-500/50';
  };

  const recentTowers = signalHistory.slice(-5).reverse();

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Nearby Towers
          </div>
          {currentTower && (
            <Button
              onClick={onReport}
              size="sm"
              variant="outline"
              className="border-red-500/20 text-red-400"
            >
              <Flag className="w-4 h-4 mr-2" />
              Report
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentTower ? (
          <div className="space-y-4">
            {/* Current Tower */}
            <div className="p-4 bg-cyan-500/10 border-2 border-cyan-500/30 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Radio className="w-5 h-5 text-cyan-400" />
                    <h4 className="text-white font-bold">Current Tower</h4>
                  </div>
                  <p className="text-xs text-gray-400">Cell ID: {currentTower.cell_id}</p>
                </div>
                <Badge className={`${getConnectionColor(currentTower.connection_type)} border`}>
                  {currentTower.connection_type}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Carrier</p>
                  <p className="text-white font-semibold">{currentTower.carrier_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Signal Strength</p>
                  <p className={`font-semibold ${getSignalStrength(currentTower.rssi).color}`}>
                    {getSignalStrength(currentTower.rssi).label}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">MCC/MNC</p>
                  <p className="text-white font-mono text-xs">{currentTower.mcc}/{currentTower.mnc}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">RSSI</p>
                  <p className="text-white font-mono text-xs">{currentTower.rssi} dBm</p>
                </div>
              </div>

              {/* Signal Bars Visual */}
              <div className="flex items-center gap-1 mt-3">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <div
                    key={bar}
                    className={`w-2 rounded-sm transition-all ${
                      bar <= getSignalStrength(currentTower.rssi).bars
                        ? getSignalStrength(currentTower.rssi).color.replace('text-', 'bg-')
                        : 'bg-gray-700'
                    }`}
                    style={{ height: `${bar * 4 + 8}px` }}
                  />
                ))}
                <span className="text-xs text-gray-400 ml-2">
                  {currentTower.rssi} dBm
                </span>
              </div>
            </div>

            {/* Recent Tower History */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-2">Recent Towers</h4>
              <div className="space-y-2">
                {recentTowers.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4 text-center">
                    No tower history yet
                  </p>
                ) : (
                  recentTowers.map((tower, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/20 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Signal className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-white text-sm font-mono">{tower.cell_id}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(tower.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getConnectionColor(tower.connection_type)} border text-xs`}>
                            {tower.connection_type}
                          </Badge>
                          <Badge className={`${getStatusColor(tower.status)} border text-xs`}>
                            {tower.status === 'normal' ? '🟢' : tower.status === 'anomaly' ? '🟠' : '🔴'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Start monitoring to see tower data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}