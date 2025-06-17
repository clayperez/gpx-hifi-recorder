<template>
  <div class="flex flex-col gap-2">
    <button
      @click="toggleLogging"
      :disabled="!isGPSConnected"
      class="px-4 py-2 rounded font-semibold text-white transition-colors"
      :class="isLogging ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-400'"
    >
      {{ isLogging ? "Stop Logging" : "Start Logging" }}
    </button>

    <div v-if="loggingStatus" class="text-sm" :class="isLogging ? 'text-green-600' : 'text-gray-600'">
      {{ loggingStatus }}
    </div>

    <!-- GPS Data Display -->
    <div v-if="latestGPSData" class="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded">
      <h4 class="font-semibold mb-2">Latest GPS Data:</h4>
      <div class="text-sm font-mono space-y-1">
        <div>Lat: {{ latestGPSData.latitude?.toFixed(8) || "N/A" }}°</div>
        <div>Lon: {{ latestGPSData.longitude?.toFixed(8) || "N/A" }}°</div>
        <div>Elevation: {{ latestGPSData.elevation?.toFixed(2) || "N/A" }} m</div>
        <div>Satellites: {{ latestGPSData.satellites || 0 }}</div>
        <div>Speed: {{ latestGPSData.speed?.toFixed(2) || "N/A" }} km/h</div>
        <div>Quality: {{ latestGPSData.quality || "N/A" }}</div>
        <div>Time: {{ formatTime(latestGPSData.timestamp) }}</div>
      </div>
    </div>

    <!-- Log Counter -->
    <div v-if="isLogging" class="text-sm text-blue-600">Data points logged: {{ logCount }}</div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
  import { useGPSStore } from "~/stores/gps";

  const gpsStore = useGPSStore();
  const loggingStatus = ref("");
  const logCount = ref(0);

  // Debug logging helper - dynamically checks localStorage for debug toggle
  const debugLog = (...args) => {
    const debugMode = localStorage.getItem("gps-debug") === "true";

    if (debugMode) {
      console.log(...args);
    }
  };

  // Use computed properties to get reactive data from store
  const isLogging = computed(() => gpsStore.isRecording);
  const isGPSConnected = computed(() => gpsStore.isConnected);
  const latestGPSData = computed(() => gpsStore.currentPosition);

  onMounted(() => {
    // Ensure event listeners are set up
    gpsStore.setupEventListeners();

    // Update status when store changes
    updateStatus();
  });

  onBeforeUnmount(() => {
    // Clean up is handled by the store plugin
  });

  // Watch for changes in GPS data to update log count
  watch(latestGPSData, (newData, oldData) => {
    if (newData && isLogging.value) {
      logCount.value++;
    }
  });

  // Watch for connection status changes
  watch(isGPSConnected, (connected) => {
    debugLog("🔗 Connection status changed:", connected);
    if (!connected && isLogging.value) {
      loggingStatus.value = "Logging stopped - GPS disconnected";
    }
  });

  // Watch for recording status changes
  watch(isLogging, (recording, wasRecording) => {
    updateStatus();
    if (recording && !wasRecording) {
      logCount.value = 0; // Reset counter when starting new recording
      debugLog("🔄 Reset log counter for new recording");
    }
  });

  function updateStatus() {
    loggingStatus.value = gpsStore.isRecording ? "Recording GPS data..." : "Recording stopped";
  }

  async function toggleLogging() {
    try {
      if (isLogging.value) {
        await gpsStore.stopRecording();
        debugLog("Stopped GPS data logging");
      } else {
        await gpsStore.startRecording();
        logCount.value = 0;
        debugLog("Started GPS data logging");
      }
      updateStatus();
    } catch (error) {
      console.error("Logging error:", error);
      loggingStatus.value = `Logging error: ${error.message}`;
    }
  }

  function formatTime(timestamp) {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleTimeString();
  }
</script>
