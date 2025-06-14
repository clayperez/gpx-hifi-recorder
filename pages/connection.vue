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
            <label for="port" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"> Serial Port </label>
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
            <label for="baudRate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"> Baud Rate </label>
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

      <div v-if="gpsStore.availablePorts.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
        <UIcon name="i-heroicons-usb" class="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No serial ports detected</p>
        <p class="text-sm mt-1">Make sure your GPS receiver is connected via USB</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="port in gpsStore.availablePorts"
          :key="port.path"
          class="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div class="flex-1">
            <div class="flex items-center space-x-3">
              <UIcon name="i-heroicons-usb" class="w-5 h-5 text-gray-400" />
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ port.path }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ port.manufacturer || "Unknown Manufacturer" }}
                </p>
                <p v-if="port.productId" class="text-xs text-gray-400 dark:text-gray-500">PID: {{ port.productId }} | VID: {{ port.vendorId }}</p>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <span v-if="isColumbusDevice(port)" class="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
              Columbus Device
            </span>
            <span
              v-if="gpsStore.connectionStatus.port === port.path"
              class="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded"
            >
              Connected
            </span>
            <UButton v-if="!gpsStore.isConnected" size="sm" variant="outline" @click="quickConnect(port.path)" :disabled="isConnecting">
              Quick Connect
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Device Information -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Columbus P-7 Pro Information</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 class="font-medium text-gray-900 dark:text-white mb-3">Specifications</h4>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-gray-600 dark:text-gray-400">Accuracy:</dt>
              <dd class="font-medium text-gray-900 dark:text-white">±0.5m (50% CEP)</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-600 dark:text-gray-400">Update Rate:</dt>
              <dd class="font-medium text-gray-900 dark:text-white">5Hz</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-600 dark:text-gray-400">Altitude Accuracy:</dt>
              <dd class="font-medium text-gray-900 dark:text-white">±15m</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-gray-600 dark:text-gray-400">Constellations:</dt>
              <dd class="font-medium text-gray-900 dark:text-white">GPS, GLONASS, Galileo, BeiDou</dd>
            </div>
          </dl>
        </div>

        <div>
          <h4 class="font-medium text-gray-900 dark:text-white mb-3">Connection Types</h4>
          <div class="space-y-3">
            <div class="flex items-center space-x-3">
              <UIcon name="i-heroicons-usb" class="w-5 h-5 text-blue-600" />
              <div>
                <p class="font-medium text-gray-900 dark:text-white">USB Serial</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">Direct USB connection (recommended)</p>
              </div>
            </div>
            <div class="flex items-center space-x-3">
              <UIcon name="i-heroicons-signal" class="w-5 h-5 text-blue-600" />
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Bluetooth</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">SPP 2.1 and BLE 5.1 support</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Connection Settings -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Connection Settings</h3>

      <div class="space-y-4">
        <div class="flex items-center space-x-3">
          <UCheckbox v-model="gpsStore.settings.autoConnect" @change="updateSettings" />
          <div>
            <label class="font-medium text-gray-900 dark:text-white">Auto-connect on startup</label>
            <p class="text-sm text-gray-600 dark:text-gray-400">Automatically connect to the last used GPS device when the app starts</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"> Accuracy Threshold (meters) </label>
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

  const portOptions = computed(() =>
    gpsStore.availablePorts.map((port) => ({
      label: `${port.path} - ${port.manufacturer || "Unknown"}`,
      value: port.path,
    }))
  );

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
    } finally {
      isRefreshing.value = false;
    }
  };

  const handleConnection = async () => {
    if (!selectedPort.value) return;

    isConnecting.value = true;
    try {
      const success = await gpsStore.connectToGPS(selectedPort.value, selectedBaudRate.value);
      if (success) {
        const toast = useToast();
        toast.add({
          title: "Connected",
          description: `Successfully connected to ${selectedPort.value}`,
          color: "green",
        });
      } else {
        const toast = useToast();
        toast.add({
          title: "Connection Failed",
          description: "Could not connect to the GPS receiver",
          color: "red",
        });
      }
    } catch (error) {
      const toast = useToast();
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
      const toast = useToast();
      toast.add({
        title: "Disconnected",
        description: "GPS receiver disconnected",
        color: "yellow",
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

    const toast = useToast();
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
    await refreshPorts();

    // Set default values if available
    if (gpsStore.settings.preferredPort && gpsStore.availablePorts.some((p) => p.path === gpsStore.settings.preferredPort)) {
      selectedPort.value = gpsStore.settings.preferredPort;
    }
    selectedBaudRate.value = gpsStore.settings.baudRate;
  });
</script>
