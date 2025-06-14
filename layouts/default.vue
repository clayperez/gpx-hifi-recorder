<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="px-6 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">GPS Tracker</h1>
          <div class="flex items-center space-x-2">
            <div :class="['w-3 h-3 rounded-full', gpsStore.isConnected ? 'bg-green-500' : 'bg-red-500']"></div>
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ gpsStore.isConnected ? "Connected" : "Disconnected" }}
            </span>
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <!-- Connection Status -->
          <div v-if="gpsStore.connectionStatus.port" class="text-sm text-gray-600 dark:text-gray-400">Port: {{ gpsStore.connectionStatus.port }}</div>

          <!-- Recording Status -->
          <div v-if="gpsStore.isRecording" class="flex items-center space-x-2 status-recording px-3 py-1 rounded-full">
            <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span class="text-sm font-medium">Recording</span>
          </div>

          <!-- Satellite Count -->
          <div v-if="gpsStore.currentSatellites" class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <UIcon name="i-heroicons-signal" class="w-4 h-4" />
            <span>{{ gpsStore.currentSatellites.totalSatellites }} sats</span>
          </div>

          <!-- Theme Toggle -->
          <UButton variant="ghost" size="sm" square @click="toggleColorMode">
            <UIcon :name="$colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'" class="w-5 h-5" />
          </UButton>
        </div>
      </div>
    </header>

    <!-- Navigation -->
    <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="px-6">
        <div class="flex space-x-8">
          <NuxtLink to="/" class="nav-link" :class="{ 'nav-link-active': $route.path === '/' }">
            <UIcon name="i-heroicons-map" class="w-5 h-5" />
            <span>Dashboard</span>
          </NuxtLink>

          <NuxtLink to="/connection" class="nav-link" :class="{ 'nav-link-active': $route.path === '/connection' }">
            <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5" />
            <span>Connection</span>
          </NuxtLink>

          <NuxtLink to="/recording" class="nav-link" :class="{ 'nav-link-active': $route.path === '/recording' }">
            <UIcon name="i-heroicons-play-circle" class="w-5 h-5" />
            <span>Recording</span>
          </NuxtLink>

          <NuxtLink to="/sessions" class="nav-link" :class="{ 'nav-link-active': $route.path === '/sessions' }">
            <UIcon name="i-heroicons-folder" class="w-5 h-5" />
            <span>Sessions</span>
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 p-6">
      <slot />
    </main>

    <!-- Status Bar -->
    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-3">
      <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <div class="flex items-center space-x-6">
          <!-- Current Position -->
          <div v-if="gpsStore.hasValidPosition" class="flex items-center space-x-2">
            <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
            <span>
              {{ formatCoordinate(gpsStore.currentPosition.latitude, "lat") }},
              {{ formatCoordinate(gpsStore.currentPosition.longitude, "lng") }}
            </span>
          </div>

          <!-- Altitude -->
          <div v-if="gpsStore.currentPosition?.altitude" class="flex items-center space-x-2">
            <UIcon name="i-heroicons-arrow-trending-up" class="w-4 h-4" />
            <span>{{ Math.round(gpsStore.currentPosition.altitude) }}m</span>
          </div>

          <!-- Accuracy -->
          <div v-if="gpsStore.currentAccuracy" class="flex items-center space-x-2">
            <UIcon name="i-heroicons-viewfinder-circle" class="w-4 h-4" />
            <span :class="['px-2 py-1 rounded text-xs font-medium', `gps-accuracy-${gpsStore.accuracyLevel}`]"> ±{{ gpsStore.currentAccuracy }}m </span>
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <!-- UTC Time -->
          <div v-if="gpsStore.currentPosition?.utcTime" class="flex items-center space-x-2">
            <UIcon name="i-heroicons-clock" class="w-4 h-4" />
            <span>UTC {{ formatUTCTime(gpsStore.currentPosition.utcTime) }}</span>
          </div>

          <!-- App Version -->
          <span class="text-xs opacity-75">v{{ $config.public.appVersion }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
  import { useGPSStore } from "~/stores/gps";

  const gpsStore = useGPSStore();
  const colorMode = useColorMode();
  const config = useRuntimeConfig();

  // Initialize GPS event listeners
  onMounted(() => {
    if (process.client && window.electronAPI) {
      // Listen for GPS data
      window.electronAPI.onGPSData((event, data) => {
        switch (data.type) {
          case "position":
            gpsStore.updatePosition(data);
            break;
          case "navigation":
            gpsStore.updateNavigation(data);
            break;
          case "satellites":
            gpsStore.updateSatellites(data);
            break;
        }
      });

      // Listen for connection status changes
      window.electronAPI.onGPSConnectionStatus((event, status) => {
        gpsStore.setConnectionStatus(status);
      });
    }
  });

  onUnmounted(() => {
    if (process.client && window.electronAPI) {
      window.electronAPI.removeAllListeners("gps-data");
      window.electronAPI.removeAllListeners("gps-connection-status");
    }
  });

  const toggleColorMode = () => {
    colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
  };

  const formatCoordinate = (coord, type) => {
    const abs = Math.abs(coord);
    const degrees = Math.floor(abs);
    const minutes = (abs - degrees) * 60;
    const direction = type === "lat" ? (coord >= 0 ? "N" : "S") : coord >= 0 ? "E" : "W";

    return `${degrees}°${minutes.toFixed(4)}'${direction}`;
  };

  const formatUTCTime = (utcTime) => {
    if (!utcTime || utcTime.length < 6) return utcTime;

    const hours = utcTime.substring(0, 2);
    const minutes = utcTime.substring(2, 4);
    const seconds = utcTime.substring(4, 6);

    return `${hours}:${minutes}:${seconds}`;
  };
</script>

<style>
  /* Custom styles using UnoCSS shortcuts */
  .nav-link {
    @apply flex items-center space-x-2 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border-b-2 border-transparent;
  }

  .nav-link-active {
    @apply text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400;
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>
