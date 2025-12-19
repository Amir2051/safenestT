import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet markers in React
const customIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function TrackingMap({ clicks }) {
  // Filter clicks with valid coordinates
  const markers = clicks.filter(c => c.latitude && c.longitude);

  if (markers.length === 0) {
    return (
      <div className="h-[300px] w-full bg-[#0f1419] rounded-lg border border-cyan-500/20 flex items-center justify-center text-gray-500 text-sm">
        No geolocation data available for map visualization.
      </div>
    );
  }

  // Calculate center (average of all points or default to first)
  const center = [
    markers.reduce((sum, m) => sum + m.latitude, 0) / markers.length,
    markers.reduce((sum, m) => sum + m.longitude, 0) / markers.length
  ];

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-cyan-500/20 relative z-0">
      <MapContainer 
        center={center} 
        zoom={2} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((click, idx) => (
          <Marker 
            key={idx} 
            position={[click.latitude, click.longitude]} 
            icon={customIcon}
          >
            <Popup>
              <div className="text-sm">
                <p><strong>IP:</strong> {click.ip_address}</p>
                <p><strong>Location:</strong> {click.city}, {click.country}</p>
                <p><strong>Time:</strong> {new Date(click.timestamp).toLocaleString()}</p>
                <p><strong>Device:</strong> {click.device_type} ({click.os})</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}