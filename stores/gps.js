import { defineStore } from "pinia";

// Debug logging helper - dynamically checks localStorage for debug toggle
function debugLog(...args) {
  // Check if we're in client-side and debug mode is enabled
  const debugMode = localStorage.getItem("gps-debug") === "true";

  if (debugMode) {
    console.log(...args);
  }
}

export const useGPSStore = defineStore("gps", {
  state: () => ({
    isConnected: false,
    isRecording: false,
    currentPosition: null,
    track: [], // Array of GPS positions
    pois: [], // Array of Points of Interest
    logEntries: [], // Shared log entries for console and map display
    devicePort: null,
    poiTypes: ["Hazard", "Info", "Traffic Control", "Rest Stop"],
    statistics: {
      distance: 0,
      duration: 0,
      speed: 0,
      elevation: 0,
      satellites: 0,
    },
    eventListenersSetup: false,
    entryCounter: 0, // Counter for log entry IDs
  }),

  actions: {
    setupEventListeners() {
      if (this.eventListenersSetup || !window.electronAPI) {
        debugLog("🔧 Event listeners already setup or electronAPI not available");
        return;
      }

      debugLog("🎧 Setting up GPS store event listeners...");

      // Set up event listeners for GPS data
      window.electronAPI.onGPSData((event, data) => {
        debugLog("📍 GPS Store received GPS data:", data);
        this.updatePosition(data);
      });

      window.electronAPI.onConnectionStatus((event, status) => {
        debugLog("🔗 GPS Store received connection status:", status);
        this.isConnected = status;
      });

      window.electronAPI.onRecordingStatus((event, status) => {
        debugLog("🎥 GPS Store received recording status:", status);
        this.isRecording = status;
      });

      this.eventListenersSetup = true;
      debugLog("✅ GPS store event listeners setup complete");
    },

    cleanupEventListeners() {
      if (!this.eventListenersSetup || !window.electronAPI) return;

      window.electronAPI.removeAllListeners("gps-data");
      window.electronAPI.removeAllListeners("connection-status");
      window.electronAPI.removeAllListeners("recording-status");

      this.eventListenersSetup = false;
    },
    async connectDevice(port) {
      if (this.isConnected) {
        debugLog("Disconnecting existing connection first");
        await this.disconnectDevice();
      }

      try {
        if (!window.electronAPI) {
          throw new Error("Electron API not available");
        }
        await window.electronAPI.connectDevice(port);
        this.devicePort = port;
        this.isConnected = true;
        // Reset statistics when connecting
        this.statistics = {
          distance: 0,
          duration: 0,
          speed: 0,
          elevation: 0,
          satellites: 0,
        };
        this.currentPosition = null;
        this.track = [];
      } catch (error) {
        console.error("Failed to connect:", error);
        this.devicePort = null;
        this.isConnected = false;
        throw error;
      }
    },

    async disconnectDevice() {
      try {
        if (window.electronAPI) {
          await window.electronAPI.disconnectDevice();
        }
      } catch (error) {
        console.error("Failed to disconnect:", error);
      } finally {
        // Always cleanup state even if disconnect fails
        this.devicePort = null;
        this.isConnected = false;
        if (this.isRecording) {
          this.isRecording = false;
        }
      }
    },

    async startRecording() {
      try {
        if (!window.electronAPI) {
          throw new Error("Electron API not available");
        }
        await window.electronAPI.startRecording();
        this.isRecording = true;

        // Clear previous log entries and track when starting new recording
        this.clearLogEntries();
        this.track = [];
      } catch (error) {
        console.error("Failed to start recording:", error);
        throw error;
      }
    },

    async stopRecording() {
      try {
        if (!window.electronAPI) {
          throw new Error("Electron API not available");
        }
        await window.electronAPI.stopRecording();
        this.isRecording = false;
      } catch (error) {
        console.error("Failed to stop recording:", error);
        throw error;
      }
    },

    async addPOI(type, description) {
      if (!this.currentPosition) return;

      const poi = {
        type,
        description,
        position: { ...this.currentPosition },
        timestamp: new Date().toISOString(),
      };

      try {
        if (window.electronAPI) {
          await window.electronAPI.addPOI(type, description);
        }
        this.pois.push(poi);
      } catch (error) {
        console.error("Failed to add POI:", error);
        throw error;
      }
    },

    // Log entry management
    addLogEntry(gpsData) {
      // Only log if this is a meaningful update (has speed data or is significantly different)
      const prevEntry = this.logEntries[this.logEntries.length - 1];
      const shouldLog =
        gpsData.speed !== undefined || // Has speed data (RMC update)
        !prevEntry || // First data point
        gpsData.timestamp !== prevEntry?.timestamp || // Different timestamp
        Math.abs(gpsData.latitude - (prevEntry?.latitude || 0)) > 0.000001 || // Position changed significantly
        Math.abs(gpsData.longitude - (prevEntry?.longitude || 0)) > 0.000001;

      if (shouldLog && this.isRecording) {
        debugLog("📺 GPS Store: Adding log entry");

        const entry = {
          id: ++this.entryCounter,
          latitude: gpsData.latitude?.toFixed(8) || "N/A", // Increased to 8 decimal places for high precision
          longitude: gpsData.longitude?.toFixed(8) || "N/A", // Increased to 8 decimal places for high precision
          satellites: gpsData.satellites || 0,
          elevation: gpsData.elevation?.toFixed(2) || "N/A", // Increased elevation precision to 2 decimal places
          speed: gpsData.speed?.toFixed(2) || "N/A", // Increased speed precision to 2 decimal places
          quality: gpsData.quality || "N/A",
          timestamp: gpsData.timestamp || new Date().toISOString(),
          rawLatitude: gpsData.latitude,
          rawLongitude: gpsData.longitude,
        };

        this.logEntries.push(entry);

        // Keep only the last 100 entries to prevent memory issues
        if (this.logEntries.length > 100) {
          this.logEntries.shift();
        }
      }
    },

    clearLogEntries() {
      debugLog("📺 GPS Store: Clearing log entries");
      this.logEntries = [];
      this.entryCounter = 0;
    },

    updatePosition(position) {
      const prevPosition = this.currentPosition;
      this.currentPosition = position;

      // Add to log entries for shared display
      this.addLogEntry(position);

      // Update statistics
      this.statistics.satellites = position.satellites || 0;
      this.statistics.elevation = position.elevation || 0;

      if (this.isRecording) {
        this.track.push(position);

        // Update duration
        const startTime = new Date(this.track[0].timestamp);
        const currentTime = new Date(position.timestamp);
        this.statistics.duration = (currentTime - startTime) / 1000; // Convert to seconds

        // Update distance and speed if we have at least two points
        if (prevPosition) {
          // Calculate distance between points
          const d = this.calculateDistance(prevPosition.latitude, prevPosition.longitude, position.latitude, position.longitude);

          this.statistics.distance += d;

          // Calculate current speed (km/h)
          const timeDiff = (new Date(position.timestamp) - new Date(prevPosition.timestamp)) / 3600000; // Convert to hours
          if (timeDiff > 0) {
            this.statistics.speed = d / timeDiff;
          }
        }
      }
    },

    // Calculate distance between two points in kilometers using the Haversine formula
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371; // Earth's radius in kilometers
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },

    exportGeoJSON() {
      const feature = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              name: "GPS Track",
              timestamp: new Date().toISOString(),
            },
            geometry: {
              type: "LineString",
              coordinates: this.track.map((pos) => [pos.longitude, pos.latitude]),
            },
          },
          ...this.pois.map((poi) => ({
            type: "Feature",
            properties: {
              type: poi.type,
              description: poi.description,
              timestamp: poi.timestamp,
            },
            geometry: {
              type: "Point",
              coordinates: [poi.position.longitude, poi.position.latitude],
            },
          })),
        ],
      };

      return JSON.stringify(feature, null, 2);
    },
  },
});
