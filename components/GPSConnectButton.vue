<template>
  <div class="flex flex-col gap-2">
    <select v-model="selectedPort" class="p-2 border rounded dark:bg-gray-700 dark:text-white" :disabled="isConnected">
      <option value="">Select GPS Port</option>
      <option v-for="port in availablePorts" :key="port.path" :value="port.path">{{ port.path }} - {{ port.manufacturer || "Unknown" }}</option>
    </select>

    <button
      @click="toggleConnection"
      :disabled="!selectedPort && !isConnected"
      class="px-4 py-2 rounded font-semibold text-white transition-colors"
      :class="isConnected ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400'"
    >
      {{ isConnected ? "Disconnect GPS" : "Connect GPS" }}
    </button>

    <div v-if="connectionStatus" class="text-sm" :class="isConnected ? 'text-green-600' : 'text-red-600'">
      {{ connectionStatus }}
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
  import { useGPSStore } from "~/stores/gps";

  const gpsStore = useGPSStore();
  const selectedPort = ref("");
  const availablePorts = ref([]);
  const connectionStatus = ref("");

  // Debug logging helper - dynamically checks localStorage for debug toggle
  const debugLog = (...args) => {
    const debugMode = localStorage.getItem("gps-debug") === "true";

    if (debugMode) {
      console.log(...args);
    }
  };

  // Use computed properties to get reactive data from store
  const isConnected = computed(() => gpsStore.isConnected);

  onMounted(async () => {
    await refreshPorts();

    // Ensure event listeners are set up
    gpsStore.setupEventListeners();

    // Update connection status when store changes
    updateStatus();
  });

  onBeforeUnmount(() => {
    // Clean up is handled by the store plugin, but we can still clean up component-specific listeners
    // The store handles the main GPS event listeners
  });

  // Watch for connection status changes
  watch(isConnected, () => {
    updateStatus();
  });

  function updateStatus() {
    connectionStatus.value = gpsStore.isConnected ? "GPS Device Connected" : "GPS Device Disconnected";
  }

  async function refreshPorts() {
    try {
      if (window.electronAPI) {
        availablePorts.value = await window.electronAPI.listPorts();
        debugLog("Available ports:", availablePorts.value);
      }
    } catch (error) {
      console.error("Failed to list ports:", error);
      connectionStatus.value = "Error listing ports";
    }
  }

  async function toggleConnection() {
    try {
      if (gpsStore.isConnected) {
        await gpsStore.disconnectDevice();
        selectedPort.value = "";
        updateStatus();
        debugLog("Disconnected from GPS device");
      } else {
        await gpsStore.connectDevice(selectedPort.value);
        updateStatus();
        debugLog("Connected to GPS device:", selectedPort.value);
      }
    } catch (error) {
      console.error("Connection error:", error);
      connectionStatus.value = `Connection error: ${error.message}`;
    }
  }
</script>
