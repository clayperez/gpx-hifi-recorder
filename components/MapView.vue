<template>
  <div class="bg-black border border-green-500 rounded-lg overflow-hidden">
    <!-- Map Header -->
    <div class="bg-gray-900 px-4 py-2 border-b border-green-500 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span class="text-green-400 font-mono text-sm font-bold">GPS MAP VIEW</span>
      </div>
      <div class="flex items-center space-x-4 text-xs text-green-400 font-mono">
        <span>Points: {{ trackPoints.length }}</span>
        <span v-if="currentPosition"> Lat: {{ currentPosition.latitude?.toFixed(8) || "N/A" }} </span>
        <span v-if="currentPosition"> Lon: {{ currentPosition.longitude?.toFixed(8) || "N/A" }} </span>
      </div>
    </div>

    <!-- Map Container -->
    <div class="relative">
      <div ref="mapContainer" class="h-80 bg-gray-800"></div>

      <!-- Map Overlay Info -->
      <div class="absolute top-2 right-2 bg-black bg-opacity-80 text-green-400 p-2 rounded text-xs font-mono">
        <div v-if="currentPosition">
          <div>📍 Current Position</div>
          <div>Quality: {{ currentPosition.quality || "N/A" }}</div>
          <div>Satellites: {{ currentPosition.satellites || 0 }}</div>
          <div>Elevation: {{ (currentPosition.elevation || 0).toFixed(2) }}m</div>
          <div>Speed: {{ (currentPosition.speed || 0).toFixed(2) }} km/h</div>
        </div>
        <div v-else class="text-gray-500">No GPS data</div>
      </div>
    </div>

    <!-- Map Controls -->
    <div class="bg-gray-900 px-4 py-2 border-t border-green-500 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <button
          @click="centerOnCurrentPosition"
          :disabled="!currentPosition"
          class="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
        >
          Center on GPS
        </button>
        <button
          @click="fitTrackBounds"
          :disabled="trackPoints.length === 0"
          class="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
        >
          Fit Track
        </button>
        <button
          @click="clearTrack"
          :disabled="trackPoints.length === 0"
          class="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs rounded transition-colors"
        >
          Clear Track
        </button>

        <!-- Map Style Selector -->
        <select
          v-model="currentMapStyle"
          @change="switchMapStyle(currentMapStyle)"
          class="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded border border-gray-600 transition-colors"
        >
          <option v-for="(style, key) in mapStyles" :key="key" :value="key">
            {{ style.name }}
          </option>
        </select>
      </div>
      <div class="text-xs text-green-400 font-mono">
        <span v-if="isRecording" class="text-red-400">● REC</span>
        <span v-else class="text-gray-500">○ STOP</span>
        <span class="ml-2 text-gray-400">{{ mapStyles[currentMapStyle].name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from "vue";
  import { useGPSStore } from "~/stores/gps";
  const gpsStore = useGPSStore();
  const mapContainer = ref(null);

  // Map state
  let map = null;
  let trackPolyline = null;
  let currentPositionMarker = null;
  let currentTileLayer = null;

  // Map style options for better performance and user choice
  const mapStyles = {
    vectorLight: {
      name: "Vector Light",
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      options: { subdomains: "abcd", maxZoom: 20, detectRetina: true, crossOrigin: true },
    },
    vectorDark: {
      name: "Vector Dark",
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      options: { subdomains: "abcd", maxZoom: 20, detectRetina: true, crossOrigin: true },
    },
    satellite: {
      name: "Satellite",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      options: { maxZoom: 19, detectRetina: true },
    },
    terrain: {
      name: "Terrain",
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution:
        'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
      options: { maxZoom: 17, detectRetina: true },
    },
  };

  const currentMapStyle = ref("vectorLight");

  // Use shared data from GPS store
  const trackPoints = computed(() => {
    // Convert log entries to track points for the map
    return gpsStore.logEntries.filter((entry) => entry.rawLatitude && entry.rawLongitude).map((entry) => [entry.rawLatitude, entry.rawLongitude]);
  });

  // Debug logging helper - dynamically checks localStorage for debug toggle
  const debugLog = (...args) => {
    const isClient = process.client;
    const isDev = process.dev;
    const debugMode = isDev || (isClient && localStorage.getItem("gps-debug") === "true");

    if (debugMode) {
      console.log(...args);
    }
  };

  // Computed properties for reactive data
  const currentPosition = computed(() => gpsStore.currentPosition);
  const isRecording = computed(() => gpsStore.isRecording);
  const isConnected = computed(() => gpsStore.isConnected);

  onMounted(async () => {
    // Ensure event listeners are set up
    gpsStore.setupEventListeners();

    // Initialize map
    await initializeMap();

    debugLog("🗺️ MapView component mounted");
  });

  onBeforeUnmount(() => {
    // Clean up map
    if (map) {
      map.remove();
      map = null;
    }

    debugLog("🗺️ MapView component unmounted");
  });

  // Watch for GPS position changes
  watch(currentPosition, (newPosition) => {
    if (newPosition && map) {
      updateCurrentPositionMarker(newPosition);
    }
  });

  // Watch for track points changes to update the polyline
  watch(trackPoints, () => {
    updateTrackPolyline();
  });

  // Watch for recording status changes
  watch(isRecording, (recording) => {
    if (!recording) {
      debugLog("🗺️ Recording stopped");
    } else {
      debugLog("🗺️ Recording started - track will be drawn from GPS store data");
    }
  });

  async function initializeMap() {
    if (!process.client) return;

    try {
      // Dynamically import Leaflet for client-side only
      const L = await import("leaflet");

      // Initialize map with a default center (will update when GPS data comes in)
      map = L.map(mapContainer.value, {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true, // Use Canvas for better performance
        maxZoom: 20,
        minZoom: 2,
      }).setView([37.7749, -122.4194], 13); // Default to San Francisco

      // Add initial tile layer
      await switchMapStyle(currentMapStyle.value);

      debugLog("🗺️ Map initialized successfully with vector tiles");

      // If we already have a current position, center on it
      if (currentPosition.value) {
        centerOnCurrentPosition();
      }
    } catch (error) {
      console.error("Failed to initialize map:", error);
    }
  }

  async function switchMapStyle(styleKey) {
    if (!map) return;

    try {
      const L = await import("leaflet");
      const style = mapStyles[styleKey];

      if (!style) {
        console.error("Invalid map style:", styleKey);
        return;
      }

      // Remove current tile layer if it exists
      if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
      }

      // Add new tile layer
      currentTileLayer = L.tileLayer(style.url, {
        attribution: style.attribution,
        ...style.options,
      }).addTo(map);

      currentMapStyle.value = styleKey;
      debugLog(`🗺️ Switched to map style: ${style.name}`);
    } catch (error) {
      console.error("Failed to switch map style:", error);
    }
  }

  async function updateCurrentPositionMarker(position) {
    if (!map || !position.latitude || !position.longitude) return;

    try {
      const L = await import("leaflet");
      const latLng = [position.latitude, position.longitude];

      // Update current position marker
      if (currentPositionMarker) {
        map.removeLayer(currentPositionMarker);
      }

      // Create a custom GPS marker for better visibility
      const gpsIcon = L.divIcon({
        className: "gps-marker",
        html: `
          <div style="
            width: 20px; 
            height: 20px; 
            background: #22c55e; 
            border: 3px solid white; 
            border-radius: 50%; 
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.6);
            animation: pulse 2s infinite;
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      currentPositionMarker = L.marker(latLng, { icon: gpsIcon })
        .addTo(map)
        .bindPopup(
          `
          <div class="text-xs">
            <strong>Current Position</strong><br>
            Lat: ${position.latitude.toFixed(8)}<br>
            Lon: ${position.longitude.toFixed(8)}<br>
            Quality: ${position.quality || "N/A"}<br>
            Satellites: ${position.satellites || 0}<br>
            Elevation: ${(position.elevation || 0).toFixed(2)}m<br>
            Speed: ${(position.speed || 0).toFixed(2)} km/h
          </div>
        `,
          {
            closeButton: false,
            offset: [0, -10],
          }
        );

      debugLog("🗺️ Current position marker updated:", latLng);
    } catch (error) {
      console.error("Failed to update current position marker:", error);
    }
  }

  async function updateTrackPolyline() {
    if (!map || trackPoints.value.length < 2) return;

    try {
      const L = await import("leaflet");

      // Remove existing polyline
      if (trackPolyline) {
        map.removeLayer(trackPolyline);
      }

      // Create new polyline with all track points - optimized for vector maps
      trackPolyline = L.polyline(trackPoints.value, {
        color: "#ef4444", // Red color for the track
        weight: 3,
        opacity: 0.8,
        smoothFactor: 1.0, // Smooth the line
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      debugLog("🗺️ Track polyline updated with", trackPoints.value.length, "points");
    } catch (error) {
      console.error("Failed to update track polyline:", error);
    }
  }

  function centerOnCurrentPosition() {
    if (!map || !currentPosition.value) return;

    const latLng = [currentPosition.value.latitude, currentPosition.value.longitude];
    map.setView(latLng, 16); // Zoom level 16 for close view

    debugLog("🗺️ Centered map on current position:", latLng);
  }

  async function fitTrackBounds() {
    if (!map || trackPoints.value.length === 0) return;

    try {
      const L = await import("leaflet");

      // Create bounds from all track points
      const bounds = trackPoints.value.reduce((bounds, point) => {
        return bounds.extend(point);
      }, L.latLngBounds(trackPoints.value[0], trackPoints.value[0]));

      // Fit the map to show all track points with some padding
      map.fitBounds(bounds, { padding: [20, 20] });

      debugLog("🗺️ Fitted map to track bounds");
    } catch (error) {
      console.error("Failed to fit track bounds:", error);
    }
  }

  function clearTrack() {
    // Clear log entries using GPS store method
    gpsStore.clearLogEntries();

    // Clear the polyline from the map
    if (trackPolyline && map) {
      map.removeLayer(trackPolyline);
      trackPolyline = null;
    }

    debugLog("🗺️ Track cleared from map and GPS store");
  }
</script>

<style scoped>
  /* Import Leaflet CSS dynamically */
  @import url("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");

  /* Custom GPS marker animation */
  :deep(.gps-marker) {
    background: transparent !important;
    border: none !important;
  }

  /* Pulse animation for GPS marker */
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
    }
  }

  /* Improve map controls styling */
  :deep(.leaflet-control-zoom) {
    border: 1px solid #374151 !important;
    border-radius: 6px !important;
  }

  :deep(.leaflet-control-zoom a) {
    background-color: #1f2937 !important;
    color: #22c55e !important;
    border: none !important;
  }

  :deep(.leaflet-control-zoom a:hover) {
    background-color: #374151 !important;
  }

  /* Style the attribution control */
  :deep(.leaflet-control-attribution) {
    background-color: rgba(0, 0, 0, 0.7) !important;
    color: #9ca3af !important;
    font-size: 10px !important;
  }

  :deep(.leaflet-control-attribution a) {
    color: #22c55e !important;
  }
</style>
