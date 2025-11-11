import React, { useState, useEffect, useRef } from "react";
import { Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const [searchValue, setSearchValue] = useState('');

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
      fields: ['geometry', 'formatted_address', 'name', 'place_id', 'types']
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
      setSearchValue(place.formatted_address || place.name || '');
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

    const pinElement = document.createElement('div');
    pinElement.style.cssText = `
      width: 32px;
      height: 32px;
      background: ${getGeofenceColor(zoneType)};
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const innerDot = document.createElement('div');
    innerDot.style.cssText = `
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
    `;
    pinElement.appendChild(innerDot);

    const newMarker = new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position,
      title: 'Geofence Center',
      content: pinElement
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
      strokeWeight: 3,
      fillColor: color,
      fillOpacity: 0.2,
      strokeDashArray: zoneType === 'restricted_zone' ? '10 5' : undefined
    });

    setCircle(newCircle);

    // Center map with proper zoom
    const bounds = new window.google.maps.LatLngBounds();
    const radiusInKm = radius / 1000;
    const latOffset = radiusInKm / 111;
    const lngOffset = radiusInKm / (111 * Math.cos(position.lat * Math.PI / 180));
    
    bounds.extend({ lat: position.lat + latOffset, lng: position.lng + lngOffset });
    bounds.extend({ lat: position.lat - latOffset, lng: position.lng - lngOffset });
    bounds.extend({ lat: position.lat + latOffset, lng: position.lng - lngOffset });
    bounds.extend({ lat: position.lat - latOffset, lng: position.lng + lngOffset });
    
    map.fitBounds(bounds, { padding: 50 });

  }, [map, selectedLocation, radius, zoneType]);

  const getGeofenceColor = (type) => {
    switch (type) {
      case 'safe_zone': return '#10b981'; // green
      case 'restricted_zone': return '#ef4444'; // red
      case 'alert_zone': return '#eab308'; // yellow
      default: return '#3b82f6'; // blue
    }
  };

  const getZoneTypeName = (type) => {
    switch (type) {
      case 'safe_zone': return '🟢 Safe Zone';
      case 'restricted_zone': return '🔴 Restricted Zone';
      case 'alert_zone': return '🟡 Alert Zone';
      default: return 'Zone';
    }
  };

  return (
    <div className="space-y-3">
      {/* Enhanced Search box with Google Places */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          ref={autocompleteRef}
          type="text"
          placeholder="Search for any location, address, or place..."
          className="w-full pl-10 pr-32 py-3 bg-[#0f1419] border-2 border-cyan-500/20 text-white rounded-lg focus:outline-none focus:border-cyan-500/50 placeholder-gray-500"
          disabled={!mapLoaded}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <Badge className="bg-cyan-500/20 text-cyan-400 text-xs border-cyan-500/50">
            Google Places
          </Badge>
        </div>
      </div>

      {/* Zone Type Indicator */}
      {selectedLocation && (
        <div className="p-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-cyan-300 text-sm font-semibold">
              {getZoneTypeName(zoneType)}
            </p>
            <p className="text-gray-400 text-xs">
              Radius: {radius}m
            </p>
          </div>
        </div>
      )}

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
      <div className="space-y-2">
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <p className="text-cyan-300 text-xs text-center">
            🔍 <strong>Search above</strong> for any address, landmark, or business worldwide
          </p>
        </div>
        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-purple-300 text-xs text-center">
            👆 Or <strong>click anywhere on the map</strong> to drop a pin
          </p>
        </div>
      </div>

      {/* Selected Location Info */}
      {selectedLocation && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-green-400 text-xs font-semibold mb-1">📍 Pin Location:</p>
          <p className="text-green-300 text-xs font-mono">
            {selectedLocation.lat.toFixed(6)}, {selectedLocation.lon.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
}