import { defineStore } from "pinia";

export const useGPSStore = defineStore("gps", {
  state: () => ({
    // Connection state
    connectionStatus: {
      connected: false,
      port: null,
      error: null,
    },

    // Current GPS data
    currentPosition: null,
    currentNavigation: null,
    currentSatellites: null,

    // Recording state
    isRecording: false,
    currentSession: null,
    recordedPositions: [],

    // Historical data
    sessions: [],

    // Available serial ports
    availablePorts: [],

    // Settings
    settings: {
      autoConnect: false,
      preferredPort: "",
      baudRate: 115200,
      recordingInterval: 1000, // ms
      accuracyThreshold: 10, // meters
    },
  }),

  getters: {
    isConnected: (state) => state.connectionStatus.connected,

    hasValidPosition: (state) => state.currentPosition && state.currentPosition.latitude !== 0 && state.currentPosition.longitude !== 0,

    currentAccuracy: (state) => state.currentPosition?.accuracy || null,

    accuracyLevel: (state) => {
      const acc = state.currentPosition?.accuracy;
      if (!acc) return "unknown";
      if (acc <= 2) return "high";
      if (acc <= 5) return "medium";
      return "low";
    },

    currentSessionStats: (state) => {
      if (!state.currentSession) return null;

      const positions = state.recordedPositions;
      if (positions.length === 0) return null;

      const totalDistance = calculateTotalDistance(positions);
      const speeds = positions.map((_, i) => (i > 0 ? calculateSpeed(positions[i - 1], positions[i]) : 0)).filter((speed) => speed > 0);

      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;
      const avgAccuracy = positions.filter((p) => p.accuracy !== null).reduce((sum, p) => sum + (p.accuracy || 0), 0) / positions.length;

      return {
        duration: Date.now() - new Date(state.currentSession.startTime).getTime(),
        totalPoints: positions.length,
        distance: totalDistance,
        maxSpeed,
        avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      };
    },
  },

  actions: {
    // Connection management
    setConnectionStatus(status) {
      this.connectionStatus = status;
    },

    async loadAvailablePorts() {
      if (process.client && window.electronAPI) {
        try {
          this.availablePorts = await window.electronAPI.listSerialPorts();
        } catch (error) {
          console.error("Failed to load serial ports:", error);
        }
      }
    },

    async connectToGPS(portPath, baudRate = 115200) {
      if (process.client && window.electronAPI) {
        try {
          const success = await window.electronAPI.connectGPS(portPath, baudRate);
          if (success) {
            this.settings.preferredPort = portPath;
            this.settings.baudRate = baudRate;
          }
          return success;
        } catch (error) {
          console.error("Failed to connect to GPS:", error);
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
        } catch (error) {
          console.error("Failed to disconnect from GPS:", error);
        }
      }
    },

    // GPS data handling
    updatePosition(position) {
      this.currentPosition = position;

      if (this.isRecording && this.currentSession) {
        // Only record if accuracy is within threshold
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
    startRecording() {
      if (this.isRecording) return;

      const sessionId = `session_${Date.now()}`;
      this.currentSession = {
        id: sessionId,
        startTime: new Date().toISOString(),
        positions: [],
        totalPoints: 0,
        distance: 0,
        maxSpeed: 0,
        avgAccuracy: 0,
      };

      this.recordedPositions = [];
      this.isRecording = true;

      if (process.client && window.electronAPI) {
        window.electronAPI.startRecording();
      }
    },

    stopRecording() {
      if (!this.isRecording || !this.currentSession) return;

      this.currentSession.endTime = new Date().toISOString();
      this.currentSession.positions = [...this.recordedPositions];
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
      this.isRecording = false;

      if (process.client && window.electronAPI) {
        window.electronAPI.stopRecording();
      }
    },

    clearCurrentSession() {
      this.recordedPositions = [];
      this.currentSession = null;
    },

    deleteSession(sessionId) {
      this.sessions = this.sessions.filter((s) => s.id !== sessionId);
    },

    // Settings
    updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
    },
  },

  persist: {
    storage: persistedState.localStorage,
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
  return degrees * (Math.PI / 180);
}
