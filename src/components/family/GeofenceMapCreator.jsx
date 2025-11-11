import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Circle, useMapEvents, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function LocationMarker({ onLocationSelect, selectedLocation }) {
  const [position, setPosition] = useState(selectedLocation ? 
    [selectedLocation.lat, selectedLocation.lon] : null
  );

  useMapEvents({
    click(e) {
      const newPos = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      onLocationSelect({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function GeofenceMapCreator({ 
  onLocationSelect, 
  radius, 
  zoneType,
  selectedLocation 
}) {
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // NYC default

  useEffect(() => {
    // Get user's current location for map center
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapCenter([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.log('Using default location');
      }
    );
  }, []);

  const getGeofenceColor = () => {
    switch (zoneType) {
      case 'safe_zone': return '#10b981'; // green
      case 'restricted_zone': return '#ef4444'; // red
      case 'alert_zone': return '#eab308'; // yellow
      default: return '#3b82f6'; // blue
    }
  };

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border-2 border-cyan-500/20">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <LocationMarker 
          onLocationSelect={onLocationSelect}
          selectedLocation={selectedLocation}
        />

        {selectedLocation && (
          <Circle
            center={[selectedLocation.lat, selectedLocation.lon]}
            radius={radius}
            pathOptions={{
              color: getGeofenceColor(),
              fillColor: getGeofenceColor(),
              fillOpacity: 0.2,
              weight: 2,
              dashArray: zoneType === 'restricted_zone' ? '10, 10' : null
            }}
          />
        )}
      </MapContainer>
      
      <div className="mt-2 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded text-center">
        <p className="text-cyan-300 text-xs">
          👆 Click anywhere on the map to drop a pin
        </p>
      </div>
    </div>
  );
}