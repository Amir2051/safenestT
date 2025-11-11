import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents, useMap } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Battery, BatteryCharging, Zap } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Custom marker icons
const createMarkerIcon = (color, label, isStationary = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative;">
        <div style="
          width: 36px; 
          height: 36px; 
          background: linear-gradient(135deg, ${color}dd, ${color}); 
          border: 3px solid white; 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          font-weight: bold;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          font-size: 16px;
        ">
          ${label}
        </div>
        ${isStationary ? '<div style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: #eab308; border: 2px solid white; border-radius: 50%;"></div>' : ''}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

// Component to update map view when locations change
function MapUpdater({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map(loc => [loc.latitude, loc.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [locations, map]);

  return null;
}

export default function InteractiveMap({ 
  locations, 
  geofences, 
  selectedMember, 
  routeHistory,
  onLocationSelect,
  members 
}) {
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // NYC default
  const [mapZoom, setMapZoom] = useState(12);

  useEffect(() => {
    if (locations.length > 0) {
      const firstLoc = locations[0];
      setMapCenter([firstLoc.latitude, firstLoc.longitude]);
    }
  }, [locations]);

  const getTimeSince = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const getGeofenceColor = (zoneType) => {
    switch (zoneType) {
      case 'safe_zone': return '#10b981'; // green
      case 'restricted_zone': return '#ef4444'; // red
      case 'alert_zone': return '#eab308'; // yellow
      default: return '#3b82f6'; // blue
    }
  };

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border-2 border-cyan-500/20">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapUpdater locations={locations} />

        {/* Render Geofences */}
        {geofences.map((fence) => (
          <Circle
            key={fence.id}
            center={[fence.center_latitude, fence.center_longitude]}
            radius={fence.radius_meters}
            pathOptions={{
              color: getGeofenceColor(fence.zone_type),
              fillColor: getGeofenceColor(fence.zone_type),
              fillOpacity: 0.1,
              weight: 2,
              dashArray: fence.zone_type === 'restricted_zone' ? '10, 10' : null
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold mb-1">{fence.zone_name}</p>
                <p className="text-xs text-gray-600 mb-1">
                  Type: {fence.zone_type.replace('_', ' ')}
                </p>
                <p className="text-xs text-gray-600">
                  Radius: {fence.radius_meters}m
                </p>
                <p className="text-xs text-gray-600">
                  Monitoring: {fence.monitored_members?.length || 0} members
                </p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Render Route History as Polyline */}
        {routeHistory.length > 1 && (
          <Polyline
            positions={routeHistory.map(loc => [loc.latitude, loc.longitude])}
            pathOptions={{
              color: '#a855f7',
              weight: 3,
              opacity: 0.7,
              dashArray: '10, 5'
            }}
          />
        )}

        {/* Render Route History Points */}
        {routeHistory.length > 0 && routeHistory.map((loc, idx) => (
          <Circle
            key={`history-${loc.id}`}
            center={[loc.latitude, loc.longitude]}
            radius={10}
            pathOptions={{
              color: '#a855f7',
              fillColor: '#a855f7',
              fillOpacity: 0.6,
              weight: 2
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold mb-1">
                  {new Date(loc.timestamp).toLocaleString()}
                </p>
                <p className="text-gray-600">
                  Point {idx + 1} of {routeHistory.length}
                </p>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Render Current Locations */}
        {locations.map((location) => {
          const member = members.find(m => m.member_email === location.user_id);
          const isSelected = selectedMember?.id === location.id;
          
          return (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={createMarkerIcon(
                isSelected ? '#06b6d4' : '#3b82f6',
                member?.member_name?.[0]?.toUpperCase() || '?',
                location.is_stationary
              )}
              eventHandlers={{
                click: () => onLocationSelect(location)
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {member?.member_name?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-sm">{member?.member_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-600">{getTimeSince(location.timestamp)}</p>
                    </div>
                  </div>

                  {location.address && (
                    <div className="flex items-start gap-1 mb-2">
                      <MapPin className="w-3 h-3 text-cyan-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-700">{location.address}</p>
                    </div>
                  )}

                  {location.battery_level !== null && (
                    <div className="flex items-center gap-1 mb-2">
                      {location.is_charging ? (
                        <BatteryCharging className="w-3 h-3 text-green-500" />
                      ) : (
                        <Battery className={`w-3 h-3 ${
                          location.battery_level < 20 ? 'text-red-500' : 'text-gray-600'
                        }`} />
                      )}
                      <span className="text-xs text-gray-700">
                        {location.battery_level}%
                      </span>
                    </div>
                  )}

                  {location.speed_kmh !== null && location.speed_kmh > 5 && (
                    <div className="flex items-center gap-1 mb-2">
                      <Zap className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-gray-700">
                        {Math.round(location.speed_kmh)} km/h
                      </span>
                    </div>
                  )}

                  {location.is_stationary && (
                    <Badge className="bg-yellow-500/20 text-yellow-700 text-xs mb-2">
                      Stationary
                    </Badge>
                  )}

                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs bg-cyan-500 hover:bg-cyan-600"
                      onClick={() => {
                        const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <Navigation className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-7 text-xs bg-blue-500 hover:bg-blue-600"
                      onClick={() => {
                        const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <Navigation className="w-3 h-3 mr-1" />
                      Navigate
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}