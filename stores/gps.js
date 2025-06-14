import { defineStore } from "pinia";

export const useGPSStore = defineStore("gps", {
  state: () => ({
    // Connection state
    isConnected: false,
    connectionStatus: {
      connected: false,
      port: null,
      baudRate: null,
      error: null,
    },

    // Available serial ports
    availablePorts: [],

    // GPS data
    currentPosition: null,
    currentNavigation: null,
    currentSatellites: null,

    // Recording state
    isRecording: false,
    currentSession: null,
    recordedPositions: [],
    waypoints: [],
    sessions: [],

    // Settings
    settings: {
      recordingInterval: 1000, // milliseconds
      accuracyThreshold: 5.0, // meters
      autoConnect: false,
      preferredPort: "",
      baudRate: 115200,
    },
  }),

  getters: {
    hasValidPosition: (state) => {
      return state.currentPosition && state.currentPosition.latitude && state.currentPosition.longitude;
    },

    currentAccuracy: (state) => {
      return state.currentPosition?.accuracy || null;
    },

    accuracyLevel: (state) => {
      const accuracy = state.currentPosition?.accuracy;
      if (!accuracy) return "unknown";
      if (accuracy <= 2) return "high";
      if (accuracy <= 5) return "medium";
      return "low";
    },

    currentSessionStats() {
      if (!this.isRecording || !this.currentSession) {
        return {
          duration: 0,
          totalPoints: 0,
          distance: 0,
          maxSpeed: 0,
          avgAccuracy: 0,
        };
      }

      const duration = Date.now() - new Date(this.currentSession.startTime).getTime();
      const totalPoints = this.recordedPositions.length;

      let distance = 0;
      let maxSpeed = 0;
      let totalAccuracy = 0;
      let validAccuracies = 0;

      if (totalPoints > 1) {
        for (let i = 1; i < this.recordedPositions.length; i++) {
          const dist = calculateDistance(this.recordedPositions[i - 1], this.recordedPositions[i]);
          distance += dist;

          const speed = calculateSpeed(this.recordedPositions[i - 1], this.recordedPositions[i]);
          if (speed > maxSpeed) maxSpeed = speed;
        }
      }

      // Calculate average accuracy
      this.recordedPositions.forEach((pos) => {
        if (pos.accuracy !== null) {
          totalAccuracy += pos.accuracy;
          validAccuracies++;
        }
      });

      return {
        duration,
        totalPoints,
        distance: Math.round(distance * 1000) / 1000, // Round to 3 decimal places
        maxSpeed: Math.round(maxSpeed * 10) / 10, // Round to 1 decimal place
        avgAccuracy: validAccuracies > 0 ? Math.round((totalAccuracy / validAccuracies) * 10) / 10 : 0,
      };
    },
  },

  actions: {
    // Initialize GPS event listeners
    initializeGPS() {
      if (process.client && window.electronAPI) {
        // Remove existing listeners to prevent duplicates
        window.electronAPI.removeAllListeners("gps-data");
        window.electronAPI.removeAllListeners("gps-connection-status");
        window.electronAPI.removeAllListeners("recording-status-changed");
        window.electronAPI.removeAllListeners("gps-position-recorded");

        // GPS data events
        window.electronAPI.onGPSData((event, data) => {
          this.handleGPSData(data);
        });

        // Connection status events
        window.electronAPI.onGPSConnectionStatus((event, status) => {
          this.connectionStatus = status;
          this.isConnected = status.connected;
        });

        // Recording status events
        window.electronAPI.onRecordingStatusChanged((event, status) => {
          console.log("Recording status changed:", status);
          this.isRecording = status.isRecording;

          // If recording stopped from backend, finalize the session
          if (!status.isRecording && this.currentSession) {
            this.finalizeCurrentSession();
          }
        });

        // Position recording events
        window.electronAPI.onGPSPositionRecorded((event, position) => {
          console.log("Position recorded:", position);
          // Position is already added to recordedPositions via handleGPSData
          // This event just confirms it was recorded by the backend
        });
      }
    },

    // Handle incoming GPS data
    handleGPSData(data) {
      switch (data.type) {
        case "position":
          this.updatePosition(data);
          break;
        case "navigation":
          this.updateNavigation(data);
          break;
        case "satellites":
          this.updateSatellites(data);
          break;
      }
    },

    // Serial port management
    async loadAvailablePorts() {
      if (process.client && window.electronAPI) {
        try {
          this.availablePorts = await window.electronAPI.listSerialPorts();
          return this.availablePorts;
        } catch (error) {
          console.error("Failed to load serial ports:", error);
          this.availablePorts = [];
          return [];
        }
      }
      return [];
    },

    // GPS connection management
    async connectToGPS(portPath, baudRate = 115200) {
      if (process.client && window.electronAPI) {
        try {
          const success = await window.electronAPI.connectGPS(portPath, baudRate);
          if (success) {
            this.connectionStatus.connected = true;
            this.connectionStatus.port = portPath;
            this.connectionStatus.baudRate = baudRate;
            this.connectionStatus.error = null;
            this.isConnected = true;

            // Update settings
            this.settings.preferredPort = portPath;
            this.settings.baudRate = baudRate;
          }
          return success;
        } catch (error) {
          console.error("Failed to connect to GPS:", error);
          this.connectionStatus.error = error.message;
          return false;
        }
      }
      return false;
    },

    async disconnectFromGPS() {
      if (process.client && window.electronAPI) {
        try {
          await window.electronAPI.disconnectGPS();
          this.connectionStatus.connected = false;
          this.isConnected = false;
          this.currentPosition = null;
          this.currentNavigation = null;
          this.currentSatellites = null;

          // Stop recording if active
          if (this.isRecording) {
            this.isRecording = false;
            this.finalizeCurrentSession();
          }
        } catch (error) {
          console.error("Failed to disconnect from GPS:", error);
        }
      }
    },

    // GPS data handling
    updatePosition(position) {
      this.currentPosition = position;

      // If recording and position meets accuracy threshold, add to recorded positions
      if (this.isRecording && this.currentSession) {
        if (!position.accuracy || position.accuracy <= this.settings.accuracyThreshold) {
          this.recordedPositions.push(position);
        }
      }
    },

    updateNavigation(navigation) {
      this.currentNavigation = navigation;
    },

    updateSatellites(satellites) {
      this.currentSatellites = satellites;
    },

    // Recording management
    async startRecording() {
      if (this.isRecording) {
        console.log("Recording already active");
        return false;
      }

      if (process.client && window.electronAPI) {
        try {
          const result = await window.electronAPI.startRecording();

          if (result.success) {
            // Create new session
            const sessionId = `session_${Date.now()}`;
            this.currentSession = {
              id: sessionId,
              startTime: new Date().toISOString(),
              positions: [],
              waypoints: [],
              totalPoints: 0,
              distance: 0,
              maxSpeed: 0,
              avgAccuracy: 0,
            };

            this.recordedPositions = [];
            this.waypoints = [];
            this.isRecording = true;

            console.log("Recording started successfully");
            return true;
          } else {
            console.log("Failed to start recording:", result.message);
            return false;
          }
        } catch (error) {
          console.error("Error starting recording:", error);
          return false;
        }
      }
      return false;
    },

    async stopRecording() {
      if (!this.isRecording) {
        console.log("Recording not active");
        return false;
      }

      if (process.client && window.electronAPI) {
        try {
          const result = await window.electronAPI.stopRecording();

          if (result.success) {
            this.finalizeCurrentSession();
            console.log("Recording stopped successfully");
            return true;
          } else {
            console.log("Failed to stop recording:", result.message);
            return false;
          }
        } catch (error) {
          console.error("Error stopping recording:", error);
          return false;
        }
      }
      return false;
    },

    finalizeCurrentSession() {
      if (!this.currentSession) return;

      this.currentSession.endTime = new Date().toISOString();
      this.currentSession.positions = [...this.recordedPositions];
      this.currentSession.waypoints = [...this.waypoints];
      this.currentSession.totalPoints = this.recordedPositions.length;

      if (this.recordedPositions.length > 1) {
        this.currentSession.distance = calculateTotalDistance(this.recordedPositions);

        const speeds = this.recordedPositions
          .map((_, i) => (i > 0 ? calculateSpeed(this.recordedPositions[i - 1], this.recordedPositions[i]) : 0))
          .filter((speed) => speed > 0);

        this.currentSession.maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

        const accuracies = this.recordedPositions.filter((p) => p.accuracy !== null).map((p) => p.accuracy || 0);

        this.currentSession.avgAccuracy = accuracies.length > 0 ? Math.round((accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length) * 10) / 10 : 0;
      }

      this.sessions.unshift(this.currentSession);
      this.currentSession = null;
      this.recordedPositions = [];
      this.waypoints = [];
      this.isRecording = false;
    },

    clearCurrentSession() {
      this.recordedPositions = [];
      this.waypoints = [];
      this.currentSession = null;
    },

    addWaypoint(type, note = "") {
      if (!this.hasValidPosition) return null;

      const waypoint = {
        id: `waypoint_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: type,
        note: note,
        position: {
          latitude: this.currentPosition.latitude,
          longitude: this.currentPosition.longitude,
          altitude: this.currentPosition.altitude,
          accuracy: this.currentPosition.accuracy,
          utcTime: this.currentPosition.utcTime,
        },
      };

      this.waypoints.push(waypoint);
      return waypoint;
    },

    deleteWaypoint(waypointId) {
      this.waypoints = this.waypoints.filter((w) => w.id !== waypointId);
    },

    deleteSession(sessionId) {
      this.sessions = this.sessions.filter((s) => s.id !== sessionId);
    },

    // Settings
    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
    },

    // Initialize recording status from backend
    async syncRecordingStatus() {
      if (process.client && window.electronAPI) {
        try {
          const status = await window.electronAPI.getRecordingStatus();
          this.isRecording = status.isRecording;
          this.isConnected = status.hasGPSConnection;

          if (status.currentPosition) {
            this.currentPosition = status.currentPosition;
          }

          // If recording but no current session, create one (recovery scenario)
          if (status.isRecording && !this.currentSession) {
            this.currentSession = {
              id: `session_${Date.now()}`,
              startTime: new Date().toISOString(),
              positions: [],
              waypoints: [],
              totalPoints: 0,
              distance: 0,
              maxSpeed: 0,
              avgAccuracy: 0,
            };
          }
        } catch (error) {
          console.error("Failed to sync recording status:", error);
        }
      }
    },
  },

  persist: {
    storage: typeof window !== "undefined" ? localStorage : null,
    pick: ["sessions", "settings"],
  },
});

// Utility functions
function calculateDistance(pos1, pos2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(pos2.latitude - pos1.latitude);
  const dLon = toRad(pos2.longitude - pos1.longitude);
  const lat1 = toRad(pos1.latitude);
  const lat2 = toRad(pos2.latitude);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateTotalDistance(positions) {
  let total = 0;
  for (let i = 1; i < positions.length; i++) {
    total += calculateDistance(positions[i - 1], positions[i]);
  }
  return Math.round(total * 1000) / 1000; // Round to 3 decimal places
}

function calculateSpeed(pos1, pos2) {
  const distance = calculateDistance(pos1, pos2); // km
  const timeDiff = (new Date(pos2.timestamp).getTime() - new Date(pos1.timestamp).getTime()) / 1000; // seconds
  return timeDiff > 0 ? (distance / timeDiff) * 3600 : 0; // km/h
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}
