import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, TrendingUp } from "lucide-react";
import "leaflet/dist/leaflet.css";

const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export default function GeographicHeatMap({ cases = [] }) {
  const [mapData, setMapData] = useState([]);
  const [locationStats, setLocationStats] = useState({});
  const [center, setCenter] = useState([20, 0]);
  const [zoom, setZoom] = useState(2);

  useEffect(() => {
    if (!cases.length) return;

    // Extract geographic data from cases
    const locations = new Map();
    
    cases.forEach(c => {
      // Check various location fields
      const location = 
        c.scammer_info?.location || 
        c.suspect_details?.primary_suspect?.location ||
        c.address_information?.city ||
        null;

      if (location) {
        if (!locations.has(location)) {
          locations.set(location, {
            name: location,
            cases: [],
            totalLoss: 0,
            // Mock coordinates - in real app, use geocoding API
            lat: 20 + (Math.random() - 0.5) * 100,
            lng: (Math.random() - 0.5) * 180
          });
        }
        const loc = locations.get(location);
        loc.cases.push(c.id);
        loc.totalLoss += c.amount_lost || c.amount_stolen_usd || 0;
      }
    });

    const dataPoints = Array.from(locations.values());
    setMapData(dataPoints);

    // Calculate stats
    const stats = {
      totalLocations: dataPoints.length,
      topLocation: dataPoints.sort((a, b) => b.cases.length - a.cases.length)[0]?.name || 'N/A',
      highestLoss: dataPoints.sort((a, b) => b.totalLoss - a.totalLoss)[0]?.name || 'N/A'
    };
    setLocationStats(stats);
  }, [cases]);

  const getMarkerColor = (totalLoss) => {
    if (totalLoss > 100000) return '#ef4444'; // red
    if (totalLoss > 50000) return '#f97316'; // orange
    if (totalLoss > 10000) return '#eab308'; // yellow
    return '#22c55e'; // green
  };

  const getMarkerSize = (caseCount) => {
    return Math.min(30, 10 + caseCount * 2);
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          Geographic Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-cyan-400" />
              <p className="text-xs text-gray-400">Total Locations</p>
            </div>
            <p className="text-2xl font-bold text-white">{locationStats.totalLocations || 0}</p>
          </div>

          <div className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <p className="text-xs text-gray-400">Top Location</p>
            </div>
            <p className="text-sm font-bold text-orange-400">{locationStats.topLocation}</p>
          </div>

          <div className="p-4 bg-[#0f1419] rounded-lg border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-red-400" />
              <p className="text-xs text-gray-400">Highest Loss</p>
            </div>
            <p className="text-sm font-bold text-red-400">{locationStats.highestLoss}</p>
          </div>

          <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
            <h4 className="text-white font-semibold mb-2 text-xs">Heat Legend</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-[10px] text-gray-300">$100K+</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-[10px] text-gray-300">$50K+</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-[10px] text-gray-300">$10K+</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-[10px] text-gray-300">&lt;$10K</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden border border-cyan-500/20 h-[500px]">
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <MapUpdater center={center} zoom={zoom} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {mapData.map((location, idx) => (
              <CircleMarker
                key={idx}
                center={[location.lat, location.lng]}
                radius={getMarkerSize(location.cases.length)}
                fillColor={getMarkerColor(location.totalLoss)}
                color="#fff"
                weight={2}
                opacity={0.8}
                fillOpacity={0.6}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold text-sm mb-2">{location.name}</h3>
                    <div className="space-y-1">
                      <p className="text-xs">
                        <span className="font-semibold">Cases:</span> {location.cases.length}
                      </p>
                      <p className="text-xs">
                        <span className="font-semibold">Total Loss:</span>{' '}
                        <span className="text-red-600">${location.totalLoss.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}