import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Background Location Sharing Service
 * Handles continuous location updates with battery optimization
 */
class LocationSharingService {
  constructor() {
    this.watchId = null;
    this.updateInterval = null;
    this.lastPosition = null;
    this.lastUpdateTime = null;
    this.isActive = false;
    this.consecutiveErrors = 0;
    this.stationaryCheckTimeout = null;
    this.currentSettings = null;
  }

  /**
   * Calculate distance between two coordinates (in meters)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Check if user is stationary (within 50m of last position)
   */
  isStationary(newLat, newLon) {
    if (!this.lastPosition) return false;

    const distance = this.calculateDistance(
      this.lastPosition.latitude,
      this.lastPosition.longitude,
      newLat,
      newLon
    );

    return distance < 50; // 50 meters threshold
  }

  /**
   * Get optimal update interval based on movement and battery
   */
  async getOptimalInterval(isStationary, batteryLevel) {
    const settings = this.currentSettings;
    
    if (!settings.battery_saver_mode) {
      return settings.update_interval_seconds * 1000;
    }

    // Battery optimization logic
    if (batteryLevel < 20) {
      return 600000; // 10 minutes when battery low
    }

    if (isStationary) {
      return 300000; // 5 minutes when not moving
    }

    return settings.update_interval_seconds * 1000; // Default (2 minutes)
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat, lon) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch (error) {
      console.error('Geocoding error:', error);
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  }

  /**
   * Get battery information
   */
  async getBatteryInfo() {
    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        return {
          level: Math.round(battery.level * 100),
          charging: battery.charging
        };
      } catch (e) {
        return { level: null, charging: false };
      }
    }
    return { level: null, charging: false };
  }

  /**
   * Update location in database
   */
  async updateLocation(position, settings) {
    try {
      const { latitude, longitude, accuracy, speed } = position.coords;
      
      // Check if stationary
      const stationary = this.isStationary(latitude, longitude);
      
      // Get battery info
      const battery = await this.getBatteryInfo();
      
      // Get address
      const address = await this.reverseGeocode(latitude, longitude);
      
      // Mark previous locations as not current
      const previousLocations = await base44.entities.FamilyLocation.filter({
        group_id: settings.group_id,
        user_id: settings.user_email,
        is_current: true
      });
      
      for (const loc of previousLocations) {
        await base44.entities.FamilyLocation.update(loc.id, {
          is_current: false
        });
      }
      
      // Calculate speed in km/h
      const speedKmh = speed !== null ? speed * 3.6 : null;
      
      // Create new location record
      await base44.entities.FamilyLocation.create({
        group_id: settings.group_id,
        user_id: settings.user_email,
        member_email: settings.user_email,
        member_name: 'Me', // Will be updated by backend
        latitude,
        longitude,
        accuracy: Math.round(accuracy),
        address,
        share_status: settings.sharing_enabled,
        battery_level: battery.level,
        is_charging: battery.charging,
        is_stationary: stationary,
        speed_kmh: speedKmh,
        timestamp: new Date().toISOString(),
        is_current: true,
        update_interval_seconds: settings.update_interval_seconds,
        last_movement_detected: stationary ? this.lastPosition?.timestamp : new Date().toISOString(),
        device_info: {
          device_type: 'web',
          os: navigator.platform,
          app_version: '1.0',
          permissions_granted: true
        }
      });
      
      // Update settings with last successful update
      await base44.entities.LocationSettings.update(settings.id, {
        last_successful_update: new Date().toISOString(),
        consecutive_failures: 0
      });
      
      // Store for comparison
      this.lastPosition = {
        latitude,
        longitude,
        timestamp: new Date().toISOString()
      };
      
      this.consecutiveErrors = 0;
      
      // Adjust update interval based on movement
      const optimalInterval = await this.getOptimalInterval(stationary, battery.level);
      if (optimalInterval !== settings.update_interval_seconds * 1000) {
        this.restartWithInterval(optimalInterval);
      }
      
      console.log('✅ Location updated:', { latitude, longitude, stationary, interval: optimalInterval });
      
    } catch (error) {
      console.error('Failed to update location:', error);
      this.consecutiveErrors++;
      
      // Update failure count
      if (settings) {
        await base44.entities.LocationSettings.update(settings.id, {
          consecutive_failures: this.consecutiveErrors
        });
      }
      
      if (this.consecutiveErrors >= 3) {
        this.handleConsecutiveFailures();
      }
    }
  }

  /**
   * Handle location error
   */
  handleError(error) {
    console.error('Location error:', error);
    
    let message = 'Location update failed';
    
    switch(error.code) {
      case error.PERMISSION_DENIED:
        message = "Location permission denied. Please enable location access in your browser settings.";
        this.stop();
        break;
      case error.POSITION_UNAVAILABLE:
        message = "Location information unavailable. Please check your GPS.";
        break;
      case error.TIMEOUT:
        message = "Location request timed out. Retrying...";
        break;
    }
    
    this.consecutiveErrors++;
    
    if (this.consecutiveErrors === 1) {
      toast.error(message, { duration: 5000 });
    }
  }

  /**
   * Handle consecutive failures
   */
  handleConsecutiveFailures() {
    toast.error(
      "⚠️ Multiple location updates failed. Please check your GPS and internet connection.",
      { 
        duration: 8000,
        action: {
          label: "Retry",
          onClick: () => this.restart()
        }
      }
    );
  }

  /**
   * Restart service with new interval
   */
  restartWithInterval(interval) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => this.updateLocation(position, this.currentSettings),
        (error) => this.handleError(error),
        {
          enableHighAccuracy: this.currentSettings?.high_accuracy_mode || false,
          timeout: 15000,
          maximumAge: 0
        }
      );
    }, interval);
  }

  /**
   * Start location sharing
   */
  async start(settings) {
    if (this.isActive) {
      console.log('Location sharing already active');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    this.currentSettings = settings;
    this.isActive = true;
    this.consecutiveErrors = 0;

    console.log('🚀 Starting location sharing service...');
    toast.success('📍 Location sharing started', { duration: 3000 });

    // Get immediate location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.updateLocation(position, settings);
      },
      (error) => this.handleError(error),
      {
        enableHighAccuracy: settings.high_accuracy_mode || false,
        timeout: 15000,
        maximumAge: 0
      }
    );

    // Set up periodic updates
    const intervalMs = settings.update_interval_seconds * 1000;
    
    this.updateInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => this.updateLocation(position, settings),
        (error) => this.handleError(error),
        {
          enableHighAccuracy: settings.high_accuracy_mode || false,
          timeout: 15000,
          maximumAge: 0
        }
      );
    }, intervalMs);

    // Optional: Watch position for high-frequency updates
    if (settings.high_accuracy_mode) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          // Only update if moved significantly
          if (!this.isStationary(position.coords.latitude, position.coords.longitude)) {
            this.updateLocation(position, settings);
          }
        },
        (error) => this.handleError(error),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    }
  }

  /**
   * Stop location sharing
   */
  stop() {
    if (!this.isActive) {
      return;
    }

    console.log('🛑 Stopping location sharing service...');

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.stationaryCheckTimeout) {
      clearTimeout(this.stationaryCheckTimeout);
      this.stationaryCheckTimeout = null;
    }

    this.isActive = false;
    this.lastPosition = null;
    
    toast.info('Location sharing stopped', { duration: 2000 });
  }

  /**
   * Restart service
   */
  async restart() {
    this.stop();
    if (this.currentSettings) {
      await this.start(this.currentSettings);
    }
  }

  /**
   * Check if service is active
   */
  getStatus() {
    return {
      isActive: this.isActive,
      lastPosition: this.lastPosition,
      consecutiveErrors: this.consecutiveErrors
    };
  }
}

// Singleton instance
const locationSharingService = new LocationSharingService();

export default locationSharingService;