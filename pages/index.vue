<template>
  <div>
    <!-- Hero Section -->
    <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 mb-8 rounded-lg">
      <div class="text-center">
        <h1 class="text-4xl font-bold mb-4">GPX HiFi Recorder</h1>
        <p class="text-xl mb-6">Professional GPS tracking with Columbus P-7 Pro GNSS Receiver</p>
        <div class="flex justify-center space-x-4">
          <NuxtLink to="/test" class="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Test Components
          </NuxtLink>
          <button @click="startFullApp" class="bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-900 transition-colors">
            Launch Full App
          </button>
        </div>
      </div>
    </div>

    <!-- Dashboard Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <!-- Quick Stats Card -->
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 dark:bg-green-900 rounded-full">
            <svg class="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              ></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">GPS Status</h3>
            <p class="text-gray-600 dark:text-gray-400">{{ gpsStatus }}</p>
          </div>
        </div>
      </div>

      <!-- Recording Status Card -->
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center">
          <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
            <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              ></path>
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recording</h3>
            <p class="text-gray-600 dark:text-gray-400">{{ recordingStatus }}</p>
          </div>
        </div>
      </div>

      <!-- Last Position Card -->
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center">
          <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
            <svg class="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"
              ></path>
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Last Position</h3>
            <p class="text-gray-600 dark:text-gray-400 text-sm">{{ lastPosition }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Overview -->
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
      <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Features</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="space-y-4">
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">Serial Communication</h3>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Connect directly to Columbus P-7 Pro via USB/Serial</p>
            </div>
          </div>
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">Real-time Tracking</h3>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Live GPS position updates and statistics</p>
            </div>
          </div>
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">GPX Recording</h3>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Standard GPX format for maximum compatibility</p>
            </div>
          </div>
        </div>
        <div class="space-y-4">
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">Interactive Map</h3>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Leaflet.js powered mapping with track visualization</p>
            </div>
          </div>
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">Points of Interest</h3>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Mark important locations with custom categories</p>
            </div>
          </div>
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">GeoJSON Export</h3>
              <p class="text-gray-600 dark:text-gray-400 text-sm">Export tracks and POIs in standard GeoJSON format</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Getting Started -->
    <div class="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Getting Started</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="text-center">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-blue-600 dark:text-blue-400 font-bold">1</span>
          </div>
          <h3 class="font-semibold mb-2 text-gray-900 dark:text-white">Connect Device</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">Connect your Columbus P-7 Pro via USB and select the correct port</p>
        </div>
        <div class="text-center">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-blue-600 dark:text-blue-400 font-bold">2</span>
          </div>
          <h3 class="font-semibold mb-2 text-gray-900 dark:text-white">Start Recording</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">Begin logging GPS data and watch your track appear on the map</p>
        </div>
        <div class="text-center">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
            <span class="text-blue-600 dark:text-blue-400 font-bold">3</span>
          </div>
          <h3 class="font-semibold mb-2 text-gray-900 dark:text-white">Export Data</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">Save your tracks and POIs in GPX or GeoJSON format</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted, onBeforeUnmount, computed, watch } from "vue";
  import { useGPSStore } from "~/stores/gps";

  const gpsStore = useGPSStore();
  const gpsStatus = ref("Disconnected");
  const recordingStatus = ref("Not Recording");
  const lastPosition = ref("No position data");

  // Debug logging helper - dynamically checks localStorage for debug toggle
  const debugLog = (...args) => {
    const debugMode = localStorage.getItem("gps-debug") === "true";

    if (debugMode) {
      console.log(...args);
    }
  };

  // Use computed properties for reactive data
  const isConnected = computed(() => gpsStore.isConnected);
  const isRecording = computed(() => gpsStore.isRecording);
  const currentPosition = computed(() => gpsStore.currentPosition);

  onMounted(() => {
    // Ensure event listeners are set up
    gpsStore.setupEventListeners();

    // Set up initial status
    updateStatus();
  });

  onBeforeUnmount(() => {
    // Clean up is handled by the store plugin
  });

  // Watch for changes in GPS store
  watch(isConnected, () => updateStatus());
  watch(isRecording, () => updateStatus());
  watch(currentPosition, (data) => {
    if (data && data.latitude && data.longitude) {
      lastPosition.value = `${data.latitude.toFixed(8)}°, ${data.longitude.toFixed(8)}°`;
    }
  });

  function updateStatus() {
    gpsStatus.value = gpsStore.isConnected ? "Connected" : "Disconnected";
    recordingStatus.value = gpsStore.isRecording ? "Recording Active" : "Not Recording";
  }

  function startFullApp() {
    // This could navigate to a full app view or toggle a modal
    debugLog("Starting full app...");
    // For now, just navigate to test page
    navigateTo("/test");
  }
</script>
