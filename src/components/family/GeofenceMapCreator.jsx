import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

export default function GeofenceMapCreator({ 
  onLocationSelect, 
  radius, 
  zoneType,
  selectedLocation 
}) {
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [circle, setCircle] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);

  // Load Google Maps script
  useEffect(() => {
    if (window.google?.maps) {
      setMapLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAiXcecx82VKrvg7LUGSGheErKCTIMX0_c&libraries=places,marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || map) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const center = { 
          lat: position.coords.latitude, 
          lng: position.coords.longitude 
        };

        const googleMap = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapId: 'DEMO_MAP_ID'
        });

        setMap(googleMap);

        // Click listener
        googleMap.addListener('click', (e) => {
          onLocationSelect({ lat: e.latLng.lat(), lon: e.latLng.lng() });
        });
      },
      () => {
        // Default to NYC
        const center = { lat: 40.7128, lng: -74.0060 };
        
        const googleMap = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          mapId: 'DEMO_MAP_ID'
        });

        setMap(googleMap);

        googleMap.addListener('click', (e) => {
          onLocationSelect({ lat: e.latLng.lat(), lon: e.latLng.lng() });
        });
      }
    );
  }, [mapLoaded, mapRef.current]);

  // Initialize autocomplete
  useEffect(() => {
    if (!map || !window.google || !autocompleteRef.current || autocomplete) return;

    const auto = new window.google.maps.places.Autocomplete(autocompleteRef.current, {
      fields: ['geometry', 'formatted_address', 'name']
    });

    auto.addListener('place_changed', () => {
      const place = auto.getPlace();
      
      if (!place.geometry?.location) {
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      map.setCenter({ lat, lng });
      map.setZoom(15);
      
      onLocationSelect({ lat, lon: lng });
    });

    setAutocomplete(auto);
  }, [map, autocompleteRef.current]);

  // Update marker and circle
  useEffect(() => {
    if (!map || !window.google || !selectedLocation) return;

    const position = { lat: selectedLocation.lat, lng: selectedLocation.lon };

    // Update or create marker
    if (marker) {
      marker.setMap(null);
    }

    const newMarker = new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      title: 'Geofence Center'
    });

    setMarker(newMarker);

    // Update or create circle
    if (circle) {
      circle.setMap(null);
    }

    const color = getGeofenceColor(zoneType);

    const newCircle = new window.google.maps.Circle({
      map,
      center: position,
      radius,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.2
    });

    setCircle(newCircle);

    // Center map
    map.setCenter(position);

  }, [map, selectedLocation, radius, zoneType]);

  const getGeofenceColor = (type) => {
    switch (type) {
      case 'safe_zone': return '#10b981'; // green
      case 'restricted_zone': return '#ef4444'; // red
      case 'alert_zone': return '#eab308'; // yellow
      default: return '#3b82f6'; // blue
    }
  };

  return (
    <div className="space-y-3">
      {/* Search box */}
      <div>
        <input
          ref={autocompleteRef}
          type="text"
          placeholder="Search for an address or place..."
          className="w-full px-4 py-2 bg-[#0f1419] border border-cyan-500/20 text-white rounded-lg focus:outline-none focus:border-cyan-500/50"
          disabled={!mapLoaded}
        />
      </div>

      {/* Map container */}
      {!mapLoaded ? (
        <div className="w-full h-[400px] bg-[#0f1419] rounded-lg border-2 border-cyan-500/20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading Google Maps...</p>
          </div>
        </div>
      ) : (
        <div 
          ref={mapRef} 
          className="w-full h-[400px] rounded-lg border-2 border-cyan-500/20"
        />
      )}

      {/* Instructions */}
      <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
        <p className="text-cyan-300 text-xs text-center">
          👆 Click anywhere on the map to drop a pin, or search for an address above
        </p>
      </div>
    </div>
  );
}