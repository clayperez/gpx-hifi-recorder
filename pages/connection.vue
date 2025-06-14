<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Connection Status -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">GPS Connection Status</h2>
        <UButton variant="outline" size="sm" @click="refreshPorts" :loading="isRefreshing">
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2" />
          Refresh Ports
        </UButton>
      </div>

      <div
        class="flex items-center space-x-4 p-4 rounded-lg"
        :class="[
          gpsStore.isConnected
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800',
        ]"
      >
        <UIcon
          :name="gpsStore.isConnected ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
          class="w-8 h-8"
          :class="gpsStore.isConnected ? 'text-green-600' : 'text-red-600'"
        />
        <div>
          <p class="font-semibold" :class="gpsStore.isConnected ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'">
            {{ gpsStore.isConnected ? "Connected" : "Disconnected" }}
          </p>
          <p class="text-sm" :class="gpsStore.isConnected ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'">
            {{ connectionStatusText }}
          </p>
        </div>
      </div>
    </div>

    <!-- Connection Form -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {{ gpsStore.isConnected ? "Current Connection" : "Connect to GPS Receiver" }}
      </h3>

      <form @submit.prevent="handleConnection" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Serial Port Selection -->
          <div>
            <label for="port" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Serial Port</label>
            <USelect
              v-model="selectedPort"
              :options="portOptions"
              placeholder="Select a serial port"
              :disabled="gpsStore.isConnected || isConnecting"
              class="w-full"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Columbus P-7 Pro should appear as a COM port or USB Serial device</p>
          </div>

          <!-- Baud Rate -->
          <div>
            <label for="baudRate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Baud Rate</label>
            <USelect v-model="selectedBaudRate" :options="baudRateOptions" :disabled="gpsStore.isConnected || isConnecting" class="w-full" />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Default for Columbus P-7 Pro is 115200</p>
          </div>
        </div>

        <!-- Connection Actions -->
        <div class="flex items-center space-x-3 pt-4">
          <UButton v-if="!gpsStore.isConnected" type="submit" class="btn-primary" :loading="isConnecting" :disabled="!selectedPort || isConnecting">
            <UIcon name="i-heroicons-link" class="w-4 h-4 mr-2" />
            Connect
          </UButton>

          <UButton v-else type="button" variant="outline" @click="disconnect" :loading="isDisconnecting">
            <UIcon name="i-heroicons-link-slash" class="w-4 h-4 mr-2" />
            Disconnect
          </UButton>

          <UButton v-if="gpsStore.isConnected" variant="outline" @click="testConnection" :disabled="isTesting">
            <UIcon name="i-heroicons-beaker" class="w-4 h-4 mr-2" />
            Test Connection
          </UButton>
        </div>
      </form>
    </div>

    <!-- Available Ports -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Serial Ports</h3>

      <div v-if="!gpsStore.availablePorts || gpsStore.availablePorts.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 mx-auto mb-2" />
        <p class="text-lg font-medium mb-1">No Serial Ports Found</p>
        <p class="text-sm">
          Make sure your Columbus P-7 Pro is connected via USB and drivers are installed.
          <br />
          Click "Refresh Ports" to scan again.
        </p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="port in gpsStore.availablePorts"
          :key="port.path"
          class="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
          :class="{ 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700': isColumbusDevice(port) }"
        >
          <div class="flex-1">
            <p class="font-mono text-sm text-gray-900 dark:text-white">{{ port.path }}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">{{ port.manufacturer || "Unknown manufacturer" }}</p>
            <div v-if="isColumbusDevice(port)" class="flex items-center space-x-1 mt-1">
              <UIcon name="i-heroicons-star" class="w-3 h-3 text-blue-600" />
              <span class="text-xs text-blue-600 dark:text-blue-400 font-medium">Likely Columbus P-7 Pro</span>
            </div>
          </div>
          <UButton v-if="!gpsStore.isConnected" variant="outline" size="sm" @click="quickConnect(port.path)" :disabled="isConnecting"> Quick Connect </UButton>
        </div>
      </div>
    </div>

    <!-- GPS Settings -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">GPS Settings</h3>

      <div class="space-y-4">
        <div class="flex items-center space-x-3">
          <UCheckbox v-model="gpsStore.settings.autoConnect" />
          <label class="text-sm text-gray-700 dark:text-gray-300">Auto-connect to preferred port on startup</label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Accuracy Threshold (meters)</label>
          <URange v-model="gpsStore.settings.accuracyThreshold" :min="1" :max="20" :step="0.5" @change="updateSettings" class="w-full max-w-md" />
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Only record GPS points with accuracy better than {{ gpsStore.settings.accuracyThreshold }}m
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useGPSStore } from "~/stores/gps";

  const gpsStore = useGPSStore();
  const toast = useToast();

  // Reactive state
  const selectedPort = ref("");
  const selectedBaudRate = ref(115200);
  const isConnecting = ref(false);
  const isDisconnecting = ref(false);
  const isRefreshing = ref(false);
  const isTesting = ref(false);

  // Computed properties
  const connectionStatusText = computed(() => {
    if (gpsStore.isConnected) {
      return `Connected to ${gpsStore.connectionStatus.port}`;
    } else if (gpsStore.connectionStatus.error) {
      return `Error: ${gpsStore.connectionStatus.error}`;
    } else {
      return "Please select a serial port to connect to your GPS receiver";
    }
  });

  const portOptions = computed(() => {
    if (!gpsStore.availablePorts || !Array.isArray(gpsStore.availablePorts)) {
      return [];
    }
    return gpsStore.availablePorts.map((port) => ({
      label: `${port.path} - ${port.manufacturer || "Unknown"}`,
      value: port.path,
    }));
  });

  const baudRateOptions = [
    { label: "9600", value: 9600 },
    { label: "19200", value: 19200 },
    { label: "38400", value: 38400 },
    { label: "57600", value: 57600 },
    { label: "115200", value: 115200 },
    { label: "230400", value: 230400 },
  ];

  // Methods
  const refreshPorts = async () => {
    isRefreshing.value = true;
    try {
      await gpsStore.loadAvailablePorts();
    } catch (error) {
      console.error("Error refreshing ports:", error);
      toast.add({
        title: "Error",
        description: "Failed to refresh serial ports",
        color: "red",
      });
    } finally {
      isRefreshing.value = false;
    }
  };

  const handleConnection = async () => {
    if (!selectedPort.value) {
      toast.add({
        title: "No Port Selected",
        description: "Please select a serial port first",
        color: "yellow",
      });
      return;
    }

    isConnecting.value = true;
    try {
      const success = await gpsStore.connectToGPS(selectedPort.value, selectedBaudRate.value);
      if (success) {
        toast.add({
          title: "Connected",
          description: `Successfully connected to ${selectedPort.value}`,
          color: "green",
        });
      } else {
        toast.add({
          title: "Connection Failed",
          description: "Could not connect to the GPS receiver",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast.add({
        title: "Connection Error",
        description: "An error occurred while connecting",
        color: "red",
      });
    } finally {
      isConnecting.value = false;
    }
  };

  const disconnect = async () => {
    isDisconnecting.value = true;
    try {
      await gpsStore.disconnectFromGPS();
      toast.add({
        title: "Disconnected",
        description: "GPS receiver disconnected",
        color: "yellow",
      });
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.add({
        title: "Disconnect Error",
        description: "An error occurred while disconnecting",
        color: "red",
      });
    } finally {
      isDisconnecting.value = false;
    }
  };

  const quickConnect = async (portPath) => {
    selectedPort.value = portPath;
    selectedBaudRate.value = 115200;
    await handleConnection();
  };

  const testConnection = async () => {
    isTesting.value = true;
    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 2000));
    isTesting.value = false;

    if (gpsStore.hasValidPosition) {
      toast.add({
        title: "Connection Test Passed",
        description: "GPS receiver is providing valid position data",
        color: "green",
      });
    } else {
      toast.add({
        title: "Connection Test Warning",
        description: "Connected but no valid GPS position received",
        color: "yellow",
      });
    }
  };

  const isColumbusDevice = (port) => {
    if (!port) return false;

    const manufacturer = port.manufacturer?.toLowerCase() || "";
    const product = port.product?.toLowerCase() || "";

    return manufacturer.includes("columbus") || manufacturer.includes("victory") || product.includes("p-7") || product.includes("columbus");
  };

  const updateSettings = () => {
    // Settings are automatically updated via v-model
    // This method can be used for additional side effects if needed
  };

  // Initialize on mount
  onMounted(async () => {
    // Initialize GPS event listeners
    gpsStore.initializeGPS();

    // Sync recording status from backend
    await gpsStore.syncRecordingStatus();

    // Load available ports
    await refreshPorts();

    // Set default values if available
    if (gpsStore.settings.preferredPort && gpsStore.availablePorts && gpsStore.availablePorts.some((p) => p.path === gpsStore.settings.preferredPort)) {
      selectedPort.value = gpsStore.settings.preferredPort;
    }
    selectedBaudRate.value = gpsStore.settings.baudRate;
  });
</script>
