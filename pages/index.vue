<template>
  <div class="space-y-6">
    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Connection Status -->
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Connection</p>
            <p class="text-2xl font-bold" :class="gpsStore.isConnected ? 'text-green-600' : 'text-red-600'">
              {{ gpsStore.isConnected ? "Connected" : "Disconnected" }}
            </p>
          </div>
          <UIcon
            :name="gpsStore.isConnected ? 'i-heroicons-wifi' : 'i-heroicons-wifi-slash'"
            class="w-8 h-8"
            :class="gpsStore.isConnected ? 'text-green-600' : 'text-red-600'"
          />
        </div>
      </div>

      <!-- Current Accuracy -->
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Accuracy</p>
            <p class="text-2xl font-bold" :class="accuracyColor">
              {{ gpsStore.currentAccuracy ? `±${gpsStore.currentAccuracy}m` : "N/A" }}
            </p>
          </div>
          <UIcon name="i-heroicons-viewfinder-circle" class="w-8 h-8" :class="accuracyColor" />
        </div>
      </div>

      <!-- Satellites -->
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Satellites</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ gpsStore.currentSatellites?.totalSatellites || 0 }}
            </p>
          </div>
          <UIcon name="i-heroicons-signal" class="w-8 h-8 text-blue-600" />
        </div>
      </div>

      <!-- Recording Status -->
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Recording</p>
            <p class="text-2xl font-bold" :class="gpsStore.isRecording ? 'text-red-600' : 'text-gray-600'">
              {{ gpsStore.isRecording ? "Active" : "Stopped" }}
            </p>
          </div>
          <UIcon name="i-heroicons-play-circle" class="w-8 h-8" :class="gpsStore.isRecording ? 'text-red-600' : 'text-gray-400'" />
        </div>
      </div>
    </div>

    <!-- Current Position Info -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Position Details -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Position</h3>

        <div v-if="gpsStore.hasValidPosition" class="space-y-3">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Latitude</label>
              <p class="text-lg font-mono text-gray-900 dark:text-white">{{ gpsStore.currentPosition.latitude.toFixed(6) }}°</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Longitude</label>
              <p class="text-lg font-mono text-gray-900 dark:text-white">{{ gpsStore.currentPosition.longitude.toFixed(6) }}°</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Altitude</label>
              <p class="text-lg font-mono text-gray-900 dark:text-white">{{ Math.round(gpsStore.currentPosition.altitude) }} m</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">UTC Time</label>
              <p class="text-lg font-mono text-gray-900 dark:text-white">
                {{ formatUTCTime(gpsStore.currentPosition.utcTime) }}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Fix Quality</label>
              <p class="text-lg text-gray-900 dark:text-white">
                {{ getFixQualityText(gpsStore.currentPosition.quality) }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">HDOP</label>
              <p class="text-lg font-mono text-gray-900 dark:text-white">
                {{ gpsStore.currentPosition.hdop.toFixed(2) }}
              </p>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
          <UIcon name="i-heroicons-map-pin-slash" class="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No GPS position available</p>
          <p class="text-sm mt-1">Connect to a GPS receiver to see position data</p>
        </div>
      </div>

      <!-- Navigation Info -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Navigation Data</h3>

        <div v-if="gpsStore.currentNavigation" class="space-y-3">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Speed</label>
              <p class="text-lg font-mono text-gray-900 dark:text-white">{{ gpsStore.currentNavigation.speed.toFixed(1) }} km/h</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Course</label>
              <p class="text-lg font-mono text-gray-900 dark:text-white">{{ Math.round(gpsStore.currentNavigation.course) }}°</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Direction</label>
            <p class="text-lg text-gray-900 dark:text-white">
              {{ getDirectionText(gpsStore.currentNavigation.course) }}
            </p>
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
          <UIcon name="i-heroicons-compass" class="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No navigation data available</p>
          <p class="text-sm mt-1">Start moving to see speed and course information</p>
        </div>
      </div>
    </div>

    <!-- Current Recording Session -->
    <div v-if="gpsStore.isRecording && gpsStore.currentSessionStats" class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Current Recording Session</h3>
        <div class="flex items-center space-x-2 text-red-600">
          <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span class="font-medium">Recording</span>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Duration</label>
          <p class="text-lg font-mono text-gray-900 dark:text-white">
            {{ formatDuration(gpsStore.currentSessionStats.duration) }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Points</label>
          <p class="text-lg font-mono text-gray-900 dark:text-white">
            {{ gpsStore.currentSessionStats.totalPoints }}
          </p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Distance</label>
          <p class="text-lg font-mono text-gray-900 dark:text-white">{{ gpsStore.currentSessionStats.distance.toFixed(3) }} km</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Max Speed</label>
          <p class="text-lg font-mono text-gray-900 dark:text-white">{{ gpsStore.currentSessionStats.maxSpeed.toFixed(1) }} km/h</p>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>

      <div class="flex flex-wrap gap-3">
        <UButton v-if="!gpsStore.isConnected" variant="outline" size="lg" @click="$router.push('/connection')">
          <UIcon name="i-heroicons-cog-6-tooth" class="w-5 h-5 mr-2" />
          Connect GPS
        </UButton>

        <UButton
          v-if="gpsStore.isConnected && !gpsStore.isRecording"
          class="btn-success"
          size="lg"
          @click="startRecording"
          :disabled="!gpsStore.hasValidPosition"
        >
          <UIcon name="i-heroicons-play-circle" class="w-5 h-5 mr-2" />
          Start Recording
        </UButton>

        <UButton v-if="gpsStore.isRecording" class="btn-danger" size="lg" @click="stopRecording">
          <UIcon name="i-heroicons-stop-circle" class="w-5 h-5 mr-2" />
          Stop Recording
        </UButton>

        <UButton variant="outline" size="lg" @click="$router.push('/sessions')">
          <UIcon name="i-heroicons-folder" class="w-5 h-5 mr-2" />
          View Sessions
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useGPSStore } from "~/stores/gps";

  const gpsStore = useGPSStore();

  const accuracyColor = computed(() => {
    switch (gpsStore.accuracyLevel) {
      case "high":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  });

  const startRecording = () => {
    gpsStore.startRecording();
  };

  const stopRecording = () => {
    gpsStore.stopRecording();
  };

  const formatUTCTime = (utcTime) => {
    if (!utcTime || utcTime.length < 6) return utcTime;

    const hours = utcTime.substring(0, 2);
    const minutes = utcTime.substring(2, 4);
    const seconds = utcTime.substring(4, 6);

    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
    }
  };

  const getFixQualityText = (quality) => {
    switch (quality) {
      case 0:
        return "Invalid";
      case 1:
        return "GPS Fix";
      case 2:
        return "DGPS Fix";
      case 3:
        return "PPS Fix";
      case 4:
        return "RTK Fixed";
      case 5:
        return "RTK Float";
      case 6:
        return "Estimated";
      case 7:
        return "Manual";
      case 8:
        return "Simulation";
      default:
        return "Unknown";
    }
  };

  const getDirectionText = (course) => {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(course / 22.5) % 16;
    return directions[index];
  };
</script>
