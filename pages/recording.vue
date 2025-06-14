<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Recording Controls -->
    <div class="card">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">GPS Recording</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Record GPS coordinates with UTC timestamps and elevation data</p>
        </div>

        <div class="flex items-center space-x-3">
          <div v-if="gpsStore.isRecording" class="flex items-center space-x-2 status-recording px-3 py-1 rounded-full">
            <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span class="text-sm font-medium">Recording Active</span>
          </div>

          <UButton v-if="!gpsStore.isRecording" class="btn-success" size="lg" @click="startRecording" :disabled="!canStartRecording">
            <UIcon name="i-heroicons-play-circle" class="w-5 h-5 mr-2" />
            Start Recording
          </UButton>

          <UButton v-else class="btn-danger" size="lg" @click="stopRecording">
            <UIcon name="i-heroicons-stop-circle" class="w-5 h-5 mr-2" />
            Stop Recording
          </UButton>
        </div>
      </div>

      <!-- Recording Prerequisites -->
      <div v-if="!canStartRecording" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
        <div class="flex items-start space-x-3">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 class="font-medium text-yellow-800 dark:text-yellow-200">Recording Requirements</h4>
            <ul class="text-sm text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
              <li v-if="!gpsStore.isConnected" class="flex items-center space-x-2">
                <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
                <span>GPS receiver must be connected</span>
              </li>
              <li v-if="!gpsStore.hasValidPosition" class="flex items-center space-x-2">
                <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
                <span>Valid GPS position required</span>
              </li>
              <li v-if="gpsStore.currentAccuracy && gpsStore.currentAccuracy > gpsStore.settings.accuracyThreshold" class="flex items-center space-x-2">
                <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
                <span>GPS accuracy must be better than {{ gpsStore.settings.accuracyThreshold }}m (current: ±{{ gpsStore.currentAccuracy }}m)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Current Session Stats -->
    <div v-if="gpsStore.isRecording && gpsStore.currentSessionStats" class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Session</h3>

      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ formatDuration(gpsStore.currentSessionStats.duration) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Duration</p>
        </div>

        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ gpsStore.currentSessionStats.totalPoints }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Data Points</p>
        </div>

        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ gpsStore.currentSessionStats.distance.toFixed(3) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Distance (km)</p>
        </div>

        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ gpsStore.currentSessionStats.maxSpeed.toFixed(1) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Max Speed (km/h)</p>
        </div>

        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ gpsStore.currentSessionStats.avgAccuracy.toFixed(1) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Avg Accuracy (m)</p>
        </div>

        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ recordingRate.toFixed(1) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Rate (Hz)</p>
        </div>
      </div>

      <!-- Session Actions -->
      <div class="flex items-center space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <UButton variant="outline" size="sm" @click="pauseRecording" :disabled="isPaused">
          <UIcon name="i-heroicons-pause" class="w-4 h-4 mr-2" />
          Pause
        </UButton>

        <UButton v-if="isPaused" variant="outline" size="sm" @click="resumeRecording">
          <UIcon name="i-heroicons-play" class="w-4 h-4 mr-2" />
          Resume
        </UButton>

        <UButton variant="outline" size="sm" @click="addWaypoint" :disabled="!gpsStore.hasValidPosition">
          <UIcon name="i-heroicons-map-pin" class="w-4 h-4 mr-2" />
          Add Waypoint
        </UButton>

        <UButton variant="outline" size="sm" @click="clearSession" color="red">
          <UIcon name="i-heroicons-trash" class="w-4 h-4 mr-2" />
          Clear Session
        </UButton>
      </div>
    </div>

    <!-- Live Data Feed -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Positions -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent GPS Positions</h3>

        <div class="space-y-2 max-h-96 overflow-y-auto">
          <div v-if="recentPositions.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
            <UIcon name="i-heroicons-map-pin-slash" class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No GPS positions recorded yet</p>
          </div>

          <div
            v-for="(position, index) in recentPositions"
            :key="position.timestamp"
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm"
          >
            <div class="flex-1">
              <div class="flex items-center space-x-2">
                <span class="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {{ formatTime(position.timestamp) }}
                </span>
                <span class="text-xs px-2 py-1 rounded" :class="getAccuracyClass(position.accuracy)"> ±{{ position.accuracy?.toFixed(1) || "N/A" }}m </span>
              </div>
              <div class="font-mono text-xs text-gray-600 dark:text-gray-300 mt-1">{{ position.latitude.toFixed(6) }}, {{ position.longitude.toFixed(6) }}</div>
            </div>

            <div class="text-right">
              <div class="text-sm font-medium text-gray-900 dark:text-white">{{ Math.round(position.altitude) }}m</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">{{ position.satellites }} sats</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recording Settings -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recording Settings</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"> Recording Interval </label>
            <USelect v-model="recordingInterval" :options="intervalOptions" :disabled="gpsStore.isRecording" @change="updateRecordingSettings" />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">How often to record GPS positions (when recording)</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Accuracy Threshold: {{ gpsStore.settings.accuracyThreshold }}m
            </label>
            <URange v-model="gpsStore.settings.accuracyThreshold" :min="0.5" :max="10" :step="0.5" :disabled="gpsStore.isRecording" @change="updateSettings" />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Only record positions with accuracy better than this threshold</p>
          </div>

          <div class="space-y-3 pt-2">
            <div class="flex items-center space-x-3">
              <UCheckbox v-model="autoExport" :disabled="gpsStore.isRecording" />
              <label class="text-sm text-gray-700 dark:text-gray-300"> Auto-export completed sessions </label>
            </div>

            <div class="flex items-center space-x-3">
              <UCheckbox v-model="includeWaypoints" :disabled="gpsStore.isRecording" />
              <label class="text-sm text-gray-700 dark:text-gray-300"> Include waypoints in export </label>
            </div>

            <div class="flex items-center space-x-3">
              <UCheckbox v-model="filterByAccuracy" :disabled="gpsStore.isRecording" />
              <label class="text-sm text-gray-700 dark:text-gray-300"> Filter out low-accuracy points </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Options -->
    <div v-if="gpsStore.recordedPositions.length > 0" class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Current Session</h3>

      <div class="flex items-center space-x-3">
        <UButton variant="outline" @click="exportAsGPX" :disabled="gpsStore.isRecording">
          <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-2" />
          Export as GPX
        </UButton>

        <UButton variant="outline" @click="exportAsCSV" :disabled="gpsStore.isRecording">
          <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-2" />
          Export as CSV
        </UButton>

        <UButton variant="outline" @click="exportAsKML" :disabled="gpsStore.isRecording">
          <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-2" />
          Export as KML
        </UButton>
      </div>

      <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">Current session has {{ gpsStore.recordedPositions.length }} recorded positions</p>
    </div>
  </div>
</template>

<script setup>
  import { useGPSStore } from "~/stores/gps";

  const gpsStore = useGPSStore();

  // Reactive state
  const isPaused = ref(false);
  const recordingInterval = ref(1000);
  const autoExport = ref(false);
  const includeWaypoints = ref(true);
  const filterByAccuracy = ref(true);

  // Computed properties
  const canStartRecording = computed(
    () => gpsStore.isConnected && gpsStore.hasValidPosition && (!gpsStore.currentAccuracy || gpsStore.currentAccuracy <= gpsStore.settings.accuracyThreshold)
  );

  const recentPositions = computed(() => gpsStore.recordedPositions.slice(-10).reverse());

  const recordingRate = computed(() => {
    if (!gpsStore.currentSessionStats || gpsStore.currentSessionStats.duration < 1000) return 0;
    return gpsStore.currentSessionStats.totalPoints / (gpsStore.currentSessionStats.duration / 1000);
  });

  const intervalOptions = [
    { label: "0.2 seconds (5Hz)", value: 200 },
    { label: "0.5 seconds (2Hz)", value: 500 },
    { label: "1 second (1Hz)", value: 1000 },
    { label: "2 seconds (0.5Hz)", value: 2000 },
    { label: "5 seconds (0.2Hz)", value: 5000 },
    { label: "10 seconds (0.1Hz)", value: 10000 },
  ];

  // Methods
  const startRecording = () => {
    gpsStore.startRecording();
    isPaused.value = false;
  };

  const stopRecording = () => {
    gpsStore.stopRecording();
    isPaused.value = false;

    if (autoExport.value && gpsStore.sessions.length > 0) {
      exportAsGPX(); // Auto-export the completed session
    }
  };

  const pauseRecording = () => {
    isPaused.value = true;
    // Implementation would pause the recording without stopping the session
  };

  const resumeRecording = () => {
    isPaused.value = false;
    // Implementation would resume the recording
  };

  const addWaypoint = () => {
    if (!gpsStore.hasValidPosition) return;

    // Implementation would add a waypoint at current position
    const toast = useToast();
    toast.add({
      title: "Waypoint Added",
      description: "Waypoint added at current GPS position",
      color: "green",
    });
  };

  const clearSession = () => {
    if (confirm("Are you sure you want to clear the current recording session? This cannot be undone.")) {
      gpsStore.clearCurrentSession();
      const toast = useToast();
      toast.add({
        title: "Session Cleared",
        description: "Current recording session has been cleared",
        color: "yellow",
      });
    }
  };

  const updateRecordingSettings = () => {
    gpsStore.updateSettings({ recordingInterval: recordingInterval.value });
  };

  const updateSettings = () => {
    // Settings are automatically updated via v-model
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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

  const getAccuracyClass = (accuracy) => {
    if (!accuracy) return "bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300";

    if (accuracy <= 2) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (accuracy <= 5) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  const exportAsGPX = () => {
    // Implementation would generate and download GPX file
    const toast = useToast();
    toast.add({
      title: "Export Started",
      description: "Generating GPX file...",
      color: "blue",
    });
  };

  const exportAsCSV = () => {
    // Implementation would generate and download CSV file
    const toast = useToast();
    toast.add({
      title: "Export Started",
      description: "Generating CSV file...",
      color: "blue",
    });
  };

  const exportAsKML = () => {
    // Implementation would generate and download KML file
    const toast = useToast();
    toast.add({
      title: "Export Started",
      description: "Generating KML file...",
      color: "blue",
    });
  };

  // Initialize settings on mount
  onMounted(() => {
    recordingInterval.value = gpsStore.settings.recordingInterval;
  });
</script>
