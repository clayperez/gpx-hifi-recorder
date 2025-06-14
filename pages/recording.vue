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

          <UButton
            v-if="!gpsStore.isRecording"
            class="btn-success"
            size="lg"
            @click="handleStartRecording"
            :disabled="!canStartRecording"
            :loading="startingRecording"
          >
            <UIcon name="i-heroicons-play-circle" class="w-5 h-5 mr-2" />
            Start Recording
          </UButton>

          <UButton v-else class="btn-danger" size="lg" @click="handleStopRecording" :loading="stoppingRecording">
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
                <span>GPS accuracy must be better than {{ gpsStore.settings.accuracyThreshold }}m (current: {{ gpsStore.currentAccuracy?.toFixed(1) }}m)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Session Statistics (only show when recording) -->
      <div
        v-if="gpsStore.isRecording && gpsStore.currentSessionStats"
        class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
      >
        <h4 class="font-medium text-blue-800 dark:text-blue-200 mb-3">Current Session</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center">
            <p class="text-sm text-blue-600 dark:text-blue-400">Duration</p>
            <p class="text-lg font-mono text-blue-900 dark:text-blue-100">{{ formatDuration(gpsStore.currentSessionStats.duration) }}</p>
          </div>
          <div class="text-center">
            <p class="text-sm text-blue-600 dark:text-blue-400">Points</p>
            <p class="text-lg font-mono text-blue-900 dark:text-blue-100">{{ gpsStore.currentSessionStats.totalPoints }}</p>
          </div>
          <div class="text-center">
            <p class="text-sm text-blue-600 dark:text-blue-400">Distance</p>
            <p class="text-lg font-mono text-blue-900 dark:text-blue-100">{{ gpsStore.currentSessionStats.distance.toFixed(3) }} km</p>
          </div>
          <div class="text-center">
            <p class="text-sm text-blue-600 dark:text-blue-400">Max Speed</p>
            <p class="text-lg font-mono text-blue-900 dark:text-blue-100">{{ gpsStore.currentSessionStats.maxSpeed.toFixed(1) }} km/h</p>
          </div>
        </div>

        <!-- Recording Rate -->
        <div class="mt-3 text-center">
          <p class="text-sm text-blue-600 dark:text-blue-400">Recording Rate</p>
          <p class="text-lg font-mono text-blue-900 dark:text-blue-100">{{ recordingRate.toFixed(1) }} points/sec</p>
        </div>
      </div>

      <!-- Recording Settings -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recording Settings</h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recording Interval</label>
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
              <label class="text-sm text-gray-700 dark:text-gray-300">Auto-export completed sessions</label>
            </div>

            <div class="flex items-center space-x-3">
              <UCheckbox v-model="includeWaypoints" :disabled="gpsStore.isRecording" />
              <label class="text-sm text-gray-700 dark:text-gray-300">Include waypoints in export</label>
            </div>

            <div class="flex items-center space-x-3">
              <UCheckbox v-model="filterByAccuracy" :disabled="gpsStore.isRecording" />
              <label class="text-sm text-gray-700 dark:text-gray-300">Filter out low-accuracy points</label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Real-time GPS Data -->
    <div class="grid md:grid-cols-2 gap-6">
      <!-- Current Position -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Position</h3>

        <div v-if="gpsStore.hasValidPosition" class="space-y-3">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Latitude</label>
              <p class="text-lg font-mono text-gray-900 dark:text-white">{{ gpsStore.currentPosition.latitude?.toFixed(6) }}°</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Longitude</label>
              <p class="text-lg font-mono text-gray-900 dark:text-white">{{ gpsStore.currentPosition.longitude?.toFixed(6) }}°</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Altitude</label>
              <p class="text-lg font-mono text-gray-900 dark:text-white">{{ gpsStore.currentPosition.altitude?.toFixed(1) || "N/A" }} m</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Accuracy</label>
              <div class="flex items-center space-x-2">
                <span class="text-lg font-mono text-gray-900 dark:text-white">{{ gpsStore.currentPosition.accuracy?.toFixed(1) || "N/A" }} m</span>
                <span
                  v-if="gpsStore.currentPosition.accuracy"
                  :class="getAccuracyClass(gpsStore.currentPosition.accuracy)"
                  class="px-2 py-1 rounded-full text-xs font-medium"
                >
                  {{ gpsStore.accuracyLevel }}
                </span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">UTC Time</label>
              <p class="text-sm font-mono text-gray-900 dark:text-white">{{ gpsStore.currentPosition.utcTime || "N/A" }}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Satellites</label>
              <p class="text-sm font-mono text-gray-900 dark:text-white">{{ gpsStore.currentPosition.satellites || "N/A" }}</p>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-6">
          <UIcon name="i-heroicons-satellite-dish" class="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p class="text-gray-500 dark:text-gray-400">Waiting for GPS fix...</p>
        </div>
      </div>

      <!-- Recent Positions -->
      <div class="card">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Positions</h3>

        <div v-if="recentPositions.length > 0" class="space-y-2 max-h-64 overflow-y-auto">
          <div
            v-for="position in recentPositions"
            :key="position.timestamp"
            class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div class="flex-1">
              <p class="text-xs font-mono text-gray-600 dark:text-gray-400">{{ formatTime(position.timestamp) }}</p>
              <p class="text-sm font-mono text-gray-900 dark:text-white">{{ position.latitude?.toFixed(6) }}, {{ position.longitude?.toFixed(6) }}</p>
            </div>
            <div class="text-right">
              <span v-if="position.accuracy" :class="getAccuracyClass(position.accuracy)" class="px-2 py-1 rounded-full text-xs font-medium">
                {{ position.accuracy.toFixed(1) }}m
              </span>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-6">
          <UIcon name="i-heroicons-clock" class="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p class="text-gray-500 dark:text-gray-400">No recorded positions yet</p>
        </div>
      </div>
    </div>

    <!-- Waypoints Section -->
    <div v-if="gpsStore.isRecording" class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Waypoints</h3>
        <UButton variant="outline" @click="showWaypointModal = true" :disabled="!gpsStore.hasValidPosition">
          <UIcon name="i-heroicons-map-pin" class="w-4 h-4 mr-2" />
          Add Waypoint
        </UButton>
      </div>

      <div v-if="gpsStore.waypoints.length > 0" class="space-y-2">
        <div v-for="waypoint in gpsStore.waypoints" :key="waypoint.id" class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">{{ waypoint.type }}</p>
            <p v-if="waypoint.note" class="text-sm text-gray-600 dark:text-gray-400">{{ waypoint.note }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-500">{{ formatTime(waypoint.timestamp) }}</p>
          </div>
          <UButton variant="ghost" color="red" size="sm" @click="deleteWaypoint(waypoint.id)">
            <UIcon name="i-heroicons-trash" class="w-4 h-4" />
          </UButton>
        </div>
      </div>

      <div v-else class="text-center py-4">
        <p class="text-gray-500 dark:text-gray-400">No waypoints added yet</p>
      </div>
    </div>

    <!-- Export Options -->
    <div v-if="gpsStore.recordedPositions.length > 0" class="card">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Current Session</h3>

      <div class="flex items-center space-x-3">
        <UButton variant="outline" @click="exportAsGPX" :disabled="gpsStore.isRecording">
          <UIcon name="i-heroicons-document-arrow-down" class="w-4 h-4 mr-2" />
          Export GPX
        </UButton>

        <UButton variant="outline" @click="exportAsCSV" :disabled="gpsStore.isRecording">
          <UIcon name="i-heroicons-table-cells" class="w-4 h-4 mr-2" />
          Export CSV
        </UButton>

        <UButton variant="outline" @click="exportAsKML" :disabled="gpsStore.isRecording">
          <UIcon name="i-heroicons-globe-alt" class="w-4 h-4 mr-2" />
          Export KML
        </UButton>

        <UButton v-if="gpsStore.recordedPositions.length > 0" variant="outline" color="red" @click="clearSession" :disabled="gpsStore.isRecording">
          <UIcon name="i-heroicons-trash" class="w-4 h-4 mr-2" />
          Clear Session
        </UButton>
      </div>
    </div>

    <!-- Waypoint Modal -->
    <UModal v-model="showWaypointModal">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Waypoint</h3>

        <form @submit.prevent="addWaypoint" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
            <USelect v-model="waypointForm.type" :options="waypointTypeOptions" required />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Note (optional)</label>
            <UTextarea v-model="waypointForm.note" placeholder="Additional information..." />
          </div>

          <div class="flex justify-end space-x-3">
            <UButton variant="outline" @click="closeWaypointModal">Cancel</UButton>
            <UButton type="submit" :disabled="!waypointForm.type">Add Waypoint</UButton>
          </div>
        </form>
      </div>
    </UModal>
  </div>
</template>

<script setup>
  import { useGPSStore } from "~/stores/gps";

  const gpsStore = useGPSStore();
  const toast = useToast();

  // Local reactive state
  const recordingInterval = ref(1000);
  const autoExport = ref(false);
  const includeWaypoints = ref(true);
  const filterByAccuracy = ref(true);
  const showWaypointModal = ref(false);
  const startingRecording = ref(false);
  const stoppingRecording = ref(false);

  const waypointForm = ref({
    type: "",
    note: "",
  });

  // Waypoint type options
  const waypointTypeOptions = [
    { label: "Aid Station", value: "Aid Station" },
    { label: "Repair", value: "Repair" },
    { label: "Hazard", value: "Hazard" },
    { label: "Control", value: "Control" },
  ];

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
  const handleStartRecording = async () => {
    startingRecording.value = true;
    try {
      const success = await gpsStore.startRecording();
      if (success) {
        toast.add({
          title: "Recording Started",
          description: "GPS recording session has begun",
          color: "green",
        });
      } else {
        toast.add({
          title: "Failed to Start Recording",
          description: "Could not start GPS recording. Check connection and GPS fix.",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.add({
        title: "Recording Error",
        description: "An error occurred while starting recording",
        color: "red",
      });
    } finally {
      startingRecording.value = false;
    }
  };

  const handleStopRecording = async () => {
    stoppingRecording.value = true;
    try {
      const success = await gpsStore.stopRecording();
      if (success) {
        toast.add({
          title: "Recording Stopped",
          description: "GPS recording session has ended",
          color: "yellow",
        });

        if (autoExport.value && gpsStore.sessions.length > 0) {
          exportAsGPX(); // Auto-export the completed session
        }
      } else {
        toast.add({
          title: "Failed to Stop Recording",
          description: "Could not stop GPS recording",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
      toast.add({
        title: "Recording Error",
        description: "An error occurred while stopping recording",
        color: "red",
      });
    } finally {
      stoppingRecording.value = false;
    }
  };

  const addWaypoint = () => {
    if (!gpsStore.hasValidPosition || !waypointForm.value.type) return;

    const waypoint = gpsStore.addWaypoint(waypointForm.value.type, waypointForm.value.note);

    if (waypoint) {
      toast.add({
        title: "Waypoint Added",
        description: `${waypointForm.value.type} waypoint added at current GPS position`,
        color: "green",
      });

      closeWaypointModal();
    }
  };

  const deleteWaypoint = (waypointId) => {
    if (confirm("Are you sure you want to delete this waypoint?")) {
      gpsStore.deleteWaypoint(waypointId);
      toast.add({
        title: "Waypoint Deleted",
        description: "Waypoint has been removed",
        color: "yellow",
      });
    }
  };

  const clearSession = () => {
    if (confirm("Are you sure you want to clear the current session? This cannot be undone.")) {
      gpsStore.clearCurrentSession();
      toast.add({
        title: "Session Cleared",
        description: "Current recording session has been cleared",
        color: "yellow",
      });
    }
  };

  const closeWaypointModal = () => {
    showWaypointModal.value = false;
    waypointForm.value = { type: "", note: "" };
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
    toast.add({
      title: "Export Started",
      description: "Generating GPX file...",
      color: "blue",
    });
  };

  const exportAsCSV = () => {
    // Implementation would generate and download CSV file
    toast.add({
      title: "Export Started",
      description: "Generating CSV file...",
      color: "blue",
    });
  };

  const exportAsKML = () => {
    // Implementation would generate and download KML file
    toast.add({
      title: "Export Started",
      description: "Generating KML file...",
      color: "blue",
    });
  };

  // Initialize GPS store and settings on mount
  onMounted(() => {
    // Initialize GPS event listeners
    gpsStore.initializeGPS();

    // Initialize settings
    recordingInterval.value = gpsStore.settings.recordingInterval;
  });

  // Cleanup on unmount
  onUnmounted(() => {
    if (process.client && window.electronAPI) {
      window.electronAPI.removeAllListeners("gps-data");
      window.electronAPI.removeAllListeners("gps-connection-status");
      window.electronAPI.removeAllListeners("recording-status-changed");
      window.electronAPI.removeAllListeners("gps-position-recorded");
    }
  });
</script>
