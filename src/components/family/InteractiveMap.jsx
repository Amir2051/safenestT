import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Battery, BatteryCharging, Zap, Loader2, Search } from "lucide-react";

export default function InteractiveMap({ 
  locations, 
  geofences, 
  selectedMember, 
  routeHistory,
  onLocationSelect,
  members,
  myCurrentLocation
}) {
  const mapRef = useRef(null);
  const autocompleteInputRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [myLocationMarker, setMyLocationMarker] = useState(null);
  const [circles, setCircles] = useState([]);
  const [polyline, setPolyline] = useState(null);
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

    return () => {
      // Cleanup on unmount
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || map) return;

    // Use myCurrentLocation, then first family location, then NYC default
    const center = myCurrentLocation 
      ? { lat: myCurrentLocation.latitude, lng: myCurrentLocation.longitude }
      : locations.length > 0 
      ? { lat: locations[0].latitude, lng: locations[0].longitude }
      : { lat: 40.7128, lng: -74.0060 }; // NYC default

    const googleMap = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: myCurrentLocation ? 15 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      mapId: 'DEMO_MAP_ID'
    });

    setMap(googleMap);
  }, [mapLoaded, mapRef.current, myCurrentLocation]);

  // Initialize Places Autocomplete
  useEffect(() => {
    if (!map || !window.google || !autocompleteInputRef.current || autocomplete) return;

    const auto = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
      fields: ['geometry', 'formatted_address', 'name', 'place_id']
    });

    auto.addListener('place_changed', () => {
      const place = auto.getPlace();
      
      if (!place.geometry?.location) {
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      // Center map on selected place
      if (place.geometry.viewport) {
        map.fitBounds(place.geometry.viewport);
      } else {
        map.setCenter({ lat, lng });
        map.setZoom(15);
      }

      // Add temporary marker for searched place
      const placeMarker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat, lng },
        title: place.name || place.formatted_address
      });

      const infowindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">
              ${place.name || 'Selected Location'}
            </h3>
            <p style="font-size: 12px; color: #666; margin: 4px 0;">
              ${place.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}
            </p>
            <div style="margin-top: 12px;">
              <a 
                href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}"
                target="_blank"
                style="
                  display: inline-block;
                  background: #06b6d4;
                  color: white;
                  padding: 6px 12px;
                  border-radius: 6px;
                  text-decoration: none;
                  font-size: 12px;
                  font-weight: 600;
                "
              >
                Get Directions
              </a>
            </div>
          </div>
        `
      });

      infowindow.open(map, placeMarker);

      // Remove marker after 10 seconds
      setTimeout(() => {
        placeMarker.setMap(null);
      }, 10000);
    });

    setAutocomplete(auto);
  }, [map, autocompleteInputRef.current]);

  // Update "You" marker when myCurrentLocation changes
  useEffect(() => {
    if (!map || !window.google || !myCurrentLocation) return;

    // Clear existing "You" marker
    if (myLocationMarker) {
      myLocationMarker.setMap(null);
    }

    // Create new "You" marker
    const marker = new window.google.maps.marker.AdvancedMarkerElement({
      map,
      position: { lat: myCurrentLocation.latitude, lng: myCurrentLocation.longitude },
      title: 'You (Current Location)',
      content: createMyLocationMarkerContent()
    });

    const infowindow = new window.google.maps.InfoWindow({
      content: createMyLocationInfoWindowContent(myCurrentLocation)
    });

    marker.addListener('click', () => {
      infowindow.open(map, marker);
    });

    setMyLocationMarker(marker);

    // Center map on user's location initially
    if (!locations.length) {
      map.setCenter({ lat: myCurrentLocation.latitude, lng: myCurrentLocation.longitude });
      map.setZoom(15);
    }

  }, [map, myCurrentLocation]);

  // Update markers when locations change
  useEffect(() => {
    if (!map || !window.google) return;

    // Clear existing markers
    markers.forEach(m => m.setMap(null));

    // Create new markers
    const newMarkers = locations.map((location, idx) => {
      const member = members.find(m => m.member_email === location.user_id);
      const isSelected = selectedMember?.id === location.id;

      const marker = new window.google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: location.latitude, lng: location.longitude },
        title: member?.member_name || 'Unknown',
        content: createMarkerContent(location, member, isSelected)
      });

      const infowindow = new window.google.maps.InfoWindow({
        content: createInfoWindowContent(location, member)
      });

      marker.addListener('click', () => {
        onLocationSelect(location);
        infowindow.open(map, marker);
      });

      return marker;
    });

    setMarkers(newMarkers);

    // Auto-fit bounds
    if (locations.length > 0 || myCurrentLocation) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // Add current location
      if (myCurrentLocation) {
        bounds.extend({ lat: myCurrentLocation.latitude, lng: myCurrentLocation.longitude });
      }
      
      // Add family locations
      locations.forEach(loc => {
        bounds.extend({ lat: loc.latitude, lng: loc.longitude });
      });
      
      // Add geofences
      geofences.forEach(fence => {
        bounds.extend({ lat: fence.center_latitude, lng: fence.center_longitude });
      });
      
      map.fitBounds(bounds, { padding: 50 });
    }

  }, [map, locations, selectedMember, members, myCurrentLocation]);

  // Update geofences
  useEffect(() => {
    if (!map || !window.google) return;

    // Clear existing circles
    circles.forEach(c => c.setMap(null));

    // Create new geofence circles
    const newCircles = geofences.map((fence) => {
      const color = getGeofenceColor(fence.zone_type);
      
      const circle = new window.google.maps.Circle({
        map,
        center: { lat: fence.center_latitude, lng: fence.center_longitude },
        radius: fence.radius_meters,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.15,
        clickable: true
      });

      const infowindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${fence.zone_name}</h3>
            <p style="font-size: 12px; color: #666; margin: 2px 0;">
              Type: ${fence.zone_type.replace('_', ' ')}
            </p>
            <p style="font-size: 12px; color: #666; margin: 2px 0;">
              Radius: ${fence.radius_meters}m
            </p>
            <p style="font-size: 12px; color: #666; margin: 2px 0;">
              Monitoring: ${fence.monitored_members?.length || 0} members
            </p>
          </div>
        `
      });

      circle.addListener('click', () => {
        infowindow.setPosition({ lat: fence.center_latitude, lng: fence.center_longitude });
        infowindow.open(map);
      });

      return circle;
    });

    setCircles(newCircles);
  }, [map, geofences]);

  // Update route history
  useEffect(() => {
    if (!map || !window.google) return;

    // Clear existing polyline
    if (polyline) {
      polyline.setMap(null);
    }

    // Create route history polyline
    if (routeHistory.length > 1) {
      const path = routeHistory.map(loc => ({
        lat: loc.latitude,
        lng: loc.longitude
      }));

      const newPolyline = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#a855f7',
        strokeOpacity: 0.7,
        strokeWeight: 3,
        map
      });

      setPolyline(newPolyline);

      // Add small markers for each history point
      routeHistory.forEach((loc, idx) => {
        new window.google.maps.Circle({
          map,
          center: { lat: loc.latitude, lng: loc.longitude },
          radius: 10,
          strokeColor: '#a855f7',
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: '#a855f7',
          fillOpacity: 0.6,
          clickable: true
        }).addListener('click', () => {
          new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 4px;">
                <p style="font-size: 11px; font-weight: bold; margin-bottom: 2px;">
                  ${new Date(loc.timestamp).toLocaleString()}
                </p>
                <p style="font-size: 10px; color: #666;">
                  Point ${idx + 1} of ${routeHistory.length}
                </p>
              </div>
            `
          }).open(map, { 
            position: { lat: loc.latitude, lng: loc.longitude }
          });
        });
      });
    }

  }, [map, routeHistory]);

  const createMyLocationMarkerContent = () => {
    const div = document.createElement('div');
    div.style.cssText = `
      position: relative;
    `;
    
    const markerDiv = document.createElement('div');
    markerDiv.style.cssText = `
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #10b981, #059669);
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
      font-size: 16px;
      cursor: pointer;
      transition: transform 0.2s;
      animation: pulse 2s infinite;
    `;
    markerDiv.innerHTML = '📍';
    markerDiv.onmouseenter = () => markerDiv.style.transform = 'scale(1.1)';
    markerDiv.onmouseleave = () => markerDiv.style.transform = 'scale(1)';

    div.appendChild(markerDiv);

    const badge = document.createElement('div');
    badge.style.cssText = `
      position: absolute;
      top: -8px;
      right: -8px;
      background: #10b981;
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: bold;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    badge.textContent = 'YOU';
    div.appendChild(badge);

    return div;
  };

  const createMyLocationInfoWindowContent = (location) => {
    return `
      <div style="padding: 12px; min-width: 220px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
          ">
            📍
          </div>
          <div>
            <p style="font-weight: bold; margin: 0; font-size: 14px; color: #10b981;">
              Your Current Location
            </p>
            <p style="font-size: 11px; color: #059669; margin: 0;">
              Live • Just now
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 6px; margin-bottom: 6px;">
          <span style="font-size: 12px; color: #666;">📍</span>
          <p style="font-size: 12px; color: #333; margin: 0;">
            ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
          </p>
        </div>

        ${location.battery_level !== null ? `
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 12px;">
              ${location.is_charging ? '🔋' : '🔋'}
            </span>
            <span style="font-size: 12px; color: ${location.battery_level < 20 ? '#ef4444' : '#666'};">
              ${location.battery_level}% ${location.is_charging ? '(Charging)' : ''}
            </span>
          </div>
        ` : ''}

        <div style="
          background: #d1fae5;
          color: #065f46;
          padding: 6px 8px;
          border-radius: 4px;
          font-size: 11px;
          margin-bottom: 8px;
          display: inline-block;
        ">
          Visible only to you (not shared yet)
        </div>

        <p style="font-size: 10px; color: #999; margin-top: 8px; margin-bottom: 0;">
          Accuracy: ±${Math.round(location.accuracy)}m
        </p>
      </div>
    `;
  };

  const createMarkerContent = (location, member, isSelected) => {
    const div = document.createElement('div');
    div.style.cssText = `
      position: relative;
    `;
    
    const markerDiv = document.createElement('div');
    markerDiv.style.cssText = `
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, ${isSelected ? '#06b6d4' : '#3b82f6'}dd, ${isSelected ? '#06b6d4' : '#3b82f6'});
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 16px;
      cursor: pointer;
      transition: transform 0.2s;
    `;
    markerDiv.textContent = member?.member_name?.[0]?.toUpperCase() || '?';
    markerDiv.onmouseenter = () => markerDiv.style.transform = 'scale(1.1)';
    markerDiv.onmouseleave = () => markerDiv.style.transform = 'scale(1)';

    div.appendChild(markerDiv);

    if (location.is_stationary) {
      const badge = document.createElement('div');
      badge.style.cssText = `
        position: absolute;
        top: -4px;
        right: -4px;
        width: 14px;
        height: 14px;
        background: #eab308;
        border: 2px solid white;
        border-radius: 50%;
      `;
      div.appendChild(badge);
    }

    return div;
  };

  const createInfoWindowContent = (location, member) => {
    const statusColor = getStatusColor(location.timestamp);
    
    return `
      <div style="padding: 12px; min-width: 220px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #06b6d4, #3b82f6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
          ">
            ${member?.member_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p style="font-weight: bold; margin: 0; font-size: 14px;">
              ${member?.member_name || 'Unknown'}
            </p>
            <p style="font-size: 11px; color: ${statusColor}; margin: 0;">
              ${getTimeSince(location.timestamp)}
            </p>
          </div>
        </div>

        ${location.address ? `
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 12px; color: #666;">📍</span>
            <p style="font-size: 12px; color: #333; margin: 0;">
              ${location.address}
            </p>
          </div>
        ` : ''}

        ${location.battery_level !== null ? `
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 12px;">
              ${location.is_charging ? '🔋' : '🔋'}
            </span>
            <span style="font-size: 12px; color: ${location.battery_level < 20 ? '#ef4444' : '#666'};">
              ${location.battery_level}% ${location.is_charging ? '(Charging)' : ''}
            </span>
          </div>
        ` : ''}

        ${location.speed_kmh !== null && location.speed_kmh > 5 ? `
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span>⚡</span>
            <span style="font-size: 12px; color: #eab308;">
              Moving • ${Math.round(location.speed_kmh)} km/h
            </span>
          </div>
        ` : ''}

        ${location.is_stationary ? `
          <div style="
            background: #fef3c7;
            color: #92400e;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            margin-bottom: 8px;
            display: inline-block;
          ">
            Stationary
          </div>
        ` : ''}

        <div style="display: flex; gap: 6px; margin-top: 12px;">
          <a 
            href="https://www.google.com/maps?q=${location.latitude},${location.longitude}"
            target="_blank"
            style="
              flex: 1;
              text-align: center;
              background: #06b6d4;
              color: white;
              padding: 6px;
              border-radius: 6px;
              text-decoration: none;
              font-size: 12px;
              font-weight: 600;
            "
          >
            View
          </a>
          <a 
            href="https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}"
            target="_blank"
            style="
              flex: 1;
              text-align: center;
              background: #3b82f6;
              color: white;
              padding: 6px;
              border-radius: 6px;
              text-decoration: none;
              font-size: 12px;
              font-weight: 600;
            "
          >
            Navigate
          </a>
        </div>

        <p style="font-size: 10px; color: #999; margin-top: 8px; margin-bottom: 0;">
          Accuracy: ±${location.accuracy}m
        </p>
      </div>
    `;
  };

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

  const getStatusColor = (timestamp) => {
    const diffMins = (new Date() - new Date(timestamp)) / 60000;
    if (diffMins < 5) return '#10b981'; // green
    if (diffMins < 30) return '#eab308'; // yellow
    return '#ef4444'; // red
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
    <div className="w-full space-y-3">
      {/* Google Places Search Bar */}
      {mapLoaded && (
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input
            ref={autocompleteInputRef}
            type="text"
            placeholder="Search for any location, address, or place..."
            className="w-full pl-10 pr-4 py-3 bg-[#0f1419] border-2 border-cyan-500/20 text-white rounded-lg focus:outline-none focus:border-cyan-500/50 placeholder-gray-500"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Badge className="bg-cyan-500/20 text-cyan-400 text-xs border-cyan-500/50">
              Google Places
            </Badge>
          </div>
        </div>
      )}

      {/* Map Container */}
      {!mapLoaded ? (
        <div className="w-full h-[500px] bg-[#0f1419] rounded-lg border-2 border-cyan-500/20 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading Google Maps...</p>
          </div>
        </div>
      ) : (
        <div 
          ref={mapRef} 
          className="w-full h-[500px] rounded-lg border-2 border-cyan-500/20"
        />
      )}
    </div>
  );
}