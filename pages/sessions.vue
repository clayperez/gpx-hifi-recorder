<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-gray-900 dark:text-white">Recording Sessions</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">View and manage your GPS recording sessions</p>
      </div>

      <div class="flex items-center space-x-3">
        <UButton variant="outline" @click="exportAllSessions" :disabled="gpsStore.sessions.length === 0">
          <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-2" />
          Export All
        </UButton>

        <UButton variant="outline" color="red" @click="clearAllSessions" :disabled="gpsStore.sessions.length === 0">
          <UIcon name="i-heroicons-trash" class="w-4 h-4 mr-2" />
          Clear All
        </UButton>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="card text-center">
        <UIcon name="i-heroicons-folder" class="w-8 h-8 mx-auto mb-2 text-blue-600" />
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ gpsStore.sessions.length }}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
      </div>

      <div class="card text-center">
        <UIcon name="i-heroicons-map" class="w-8 h-8 mx-auto mb-2 text-green-600" />
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalDistance.toFixed(1) }}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Total Distance (km)</p>
      </div>

      <div class="card text-center">
        <UIcon name="i-heroicons-clock" class="w-8 h-8 mx-auto mb-2 text-purple-600" />
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatTotalDuration(totalDuration) }}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Total Duration</p>
      </div>

      <div class="card text-center">
        <UIcon name="i-heroicons-viewfinder-circle" class="w-8 h-8 mx-auto mb-2 text-orange-600" />
        <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ totalPoints }}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Total GPS Points</p>
      </div>
    </div>

    <!-- Sessions List -->
    <div class="card">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Sessions History</h3>

        <div class="flex items-center space-x-3">
          <!-- Search -->
          <UInput v-model="searchQuery" placeholder="Search sessions..." class="w-64">
            <template #leading>
              <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4" />
            </template>
          </UInput>

          <!-- Sort -->
          <USelect v-model="sortBy" :options="sortOptions" class="w-40" />
        </div>
      </div>

      <div v-if="filteredSessions.length === 0" class="text-center py-12 text-gray-500 dark:text-gray-400">
        <UIcon name="i-heroicons-folder" class="w-16 h-16 mx-auto mb-4 opacity-50" />
        <h4 class="text-lg font-medium mb-2">No Sessions Found</h4>
        <p class="text-sm">
          {{ gpsStore.sessions.length === 0 ? "Start recording GPS data to see your sessions here" : "No sessions match your search criteria" }}
        </p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="session in filteredSessions"
          :key="session.id"
          class="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="flex items-center space-x-3 mb-2">
                <h4 class="font-medium text-gray-900 dark:text-white">Session {{ formatSessionId(session.id) }}</h4>
                <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded"> {{ session.totalPoints }} points </span>
                <span v-if="session.distance > 0" class="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                  {{ session.distance.toFixed(2) }} km
                </span>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p class="text-gray-600 dark:text-gray-400">Started</p>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ formatDateTime(session.startTime) }}
                  </p>
                </div>

                <div v-if="session.endTime">
                  <p class="text-gray-600 dark:text-gray-400">Duration</p>
                  <p class="font-medium text-gray-900 dark:text-white">
                    {{ formatDuration(session.startTime, session.endTime) }}
                  </p>
                </div>

                <div v-if="session.maxSpeed > 0">
                  <p class="text-gray-600 dark:text-gray-400">Max Speed</p>
                  <p class="font-medium text-gray-900 dark:text-white">{{ session.maxSpeed.toFixed(1) }} km/h</p>
                </div>

                <div v-if="session.avgAccuracy > 0">
                  <p class="text-gray-600 dark:text-gray-400">Avg Accuracy</p>
                  <p class="font-medium text-gray-900 dark:text-white">±{{ session.avgAccuracy.toFixed(1) }}m</p>
                </div>
              </div>
            </div>

            <div class="flex items-center space-x-2 ml-4">
              <UButton variant="ghost" size="sm" @click="viewSession(session)">
                <UIcon name="i-heroicons-eye" class="w-4 h-4" />
              </UButton>

              <UDropdown :items="getSessionActions(session)">
                <UButton variant="ghost" size="sm">
                  <UIcon name="i-heroicons-ellipsis-vertical" class="w-4 h-4" />
                </UButton>
              </UDropdown>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Details Modal -->
    <UModal v-model="showSessionModal" class="z-50">
      <div v-if="selectedSession" class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Session Details</h3>
          <UButton variant="ghost" size="sm" @click="showSessionModal = false">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </UButton>
        </div>

        <div class="space-y-6">
          <!-- Session Info -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-gray-600 dark:text-gray-400 mb-1">Session ID</p>
              <p class="font-mono text-gray-900 dark:text-white">{{ selectedSession.id }}</p>
            </div>
            <div>
              <p class="text-gray-600 dark:text-gray-400 mb-1">Total Points</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ selectedSession.totalPoints }}</p>
            </div>
            <div>
              <p class="text-gray-600 dark:text-gray-400 mb-1">Start Time</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ formatDateTime(selectedSession.startTime) }}</p>
            </div>
            <div v-if="selectedSession.endTime">
              <p class="text-gray-600 dark:text-gray-400 mb-1">End Time</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ formatDateTime(selectedSession.endTime) }}</p>
            </div>
          </div>

          <!-- Statistics -->
          <div v-if="selectedSession.endTime" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-lg font-bold text-gray-900 dark:text-white">
                {{ selectedSession.distance.toFixed(3) }}
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-400">Distance (km)</p>
            </div>
            <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-lg font-bold text-gray-900 dark:text-white">
                {{ selectedSession.maxSpeed.toFixed(1) }}
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-400">Max Speed (km/h)</p>
            </div>
            <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-lg font-bold text-gray-900 dark:text-white">
                {{ selectedSession.avgAccuracy.toFixed(1) }}
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-400">Avg Accuracy (m)</p>
            </div>
            <div class="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p class="text-lg font-bold text-gray-900 dark:text-white">
                {{ formatDuration(selectedSession.startTime, selectedSession.endTime) }}
              </p>
              <p class="text-xs text-gray-600 dark:text-gray-400">Duration</p>
            </div>
          </div>

          <!-- Coordinate Bounds -->
          <div v-if="sessionBounds" class="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <h4 class="font-medium text-gray-900 dark:text-white mb-3">Coordinate Bounds</h4>
            <div class="grid grid-cols-2 gap-4 text-sm font-mono">
              <div>
                <p class="text-gray-600 dark:text-gray-400">North: {{ sessionBounds.north.toFixed(6) }}°</p>
                <p class="text-gray-600 dark:text-gray-400">South: {{ sessionBounds.south.toFixed(6) }}°</p>
              </div>
              <div>
                <p class="text-gray-600 dark:text-gray-400">East: {{ sessionBounds.east.toFixed(6) }}°</p>
                <p class="text-gray-600 dark:text-gray-400">West: {{ sessionBounds.west.toFixed(6) }}°</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <UButton variant="outline" @click="exportSession(selectedSession, 'gpx')">
              <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-2" />
              Export GPX
            </UButton>
            <UButton variant="outline" @click="exportSession(selectedSession, 'csv')">
              <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-2" />
              Export CSV
            </UButton>
            <UButton variant="outline" @click="exportSession(selectedSession, 'kml')">
              <UIcon name="i-heroicons-arrow-down-tray" class="w-4 h-4 mr-2" />
              Export KML
            </UButton>
          </div>
        </div>
      </div>
    </UModal>
  </div>
</template>

<script setup>
  import { useGPSStore } from "~/stores/gps";

  const gpsStore = useGPSStore();

  // Reactive state
  const searchQuery = ref("");
  const sortBy = ref("newest");
  const showSessionModal = ref(false);
  const selectedSession = ref(null);

  // Computed properties
  const totalDistance = computed(() => gpsStore.sessions.reduce((sum, session) => sum + session.distance, 0));

  const totalDuration = computed(() =>
    gpsStore.sessions.reduce((sum, session) => {
      if (session.endTime) {
        return sum + (new Date(session.endTime).getTime() - new Date(session.startTime).getTime());
      }
      return sum;
    }, 0)
  );

  const totalPoints = computed(() => gpsStore.sessions.reduce((sum, session) => sum + session.totalPoints, 0));

  const filteredSessions = computed(() => {
    let sessions = [...gpsStore.sessions];

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      sessions = sessions.filter((session) => session.id.toLowerCase().includes(query) || formatDateTime(session.startTime).toLowerCase().includes(query));
    }

    // Sort sessions
    switch (sortBy.value) {
      case "newest":
        sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        break;
      case "oldest":
        sessions.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        break;
      case "distance":
        sessions.sort((a, b) => b.distance - a.distance);
        break;
      case "duration":
        sessions.sort((a, b) => {
          const durationA = a.endTime ? new Date(a.endTime).getTime() - new Date(a.startTime).getTime() : 0;
          const durationB = b.endTime ? new Date(b.endTime).getTime() - new Date(b.startTime).getTime() : 0;
          return durationB - durationA;
        });
        break;
      case "points":
        sessions.sort((a, b) => b.totalPoints - a.totalPoints);
        break;
    }

    return sessions;
  });

  const sessionBounds = computed(() => {
    if (!selectedSession.value?.positions?.length) return null;

    const positions = selectedSession.value.positions;
    return {
      north: Math.max(...positions.map((p) => p.latitude)),
      south: Math.min(...positions.map((p) => p.latitude)),
      east: Math.max(...positions.map((p) => p.longitude)),
      west: Math.min(...positions.map((p) => p.longitude)),
    };
  });

  const sortOptions = [
    { label: "Newest First", value: "newest" },
    { label: "Oldest First", value: "oldest" },
    { label: "By Distance", value: "distance" },
    { label: "By Duration", value: "duration" },
    { label: "By Points", value: "points" },
  ];

  // Methods
  const viewSession = (session) => {
    selectedSession.value = session;
    showSessionModal.value = true;
  };

  const getSessionActions = (session) => [
    [
      {
        label: "View Details",
        icon: "i-heroicons-eye",
        click: () => viewSession(session),
      },
    ],
    [
      {
        label: "Export GPX",
        icon: "i-heroicons-arrow-down-tray",
        click: () => exportSession(session, "gpx"),
      },
      {
        label: "Export CSV",
        icon: "i-heroicons-arrow-down-tray",
        click: () => exportSession(session, "csv"),
      },
      {
        label: "Export KML",
        icon: "i-heroicons-arrow-down-tray",
        click: () => exportSession(session, "kml"),
      },
    ],
    [
      {
        label: "Delete Session",
        icon: "i-heroicons-trash",
        click: () => deleteSession(session),
        class: "text-red-600 dark:text-red-400",
      },
    ],
  ];

  const exportSession = (session, format) => {
    // Implementation would generate and download the file
    const toast = useToast();
    toast.add({
      title: "Export Started",
      description: `Generating ${format.toUpperCase()} file for session ${formatSessionId(session.id)}...`,
      color: "blue",
    });
  };

  const exportAllSessions = () => {
    // Implementation would export all sessions
    const toast = useToast();
    toast.add({
      title: "Export Started",
      description: "Generating archive of all sessions...",
      color: "blue",
    });
  };

  const deleteSession = (session) => {
    if (confirm(`Are you sure you want to delete session ${formatSessionId(session.id)}? This cannot be undone.`)) {
      gpsStore.deleteSession(session.id);
      const toast = useToast();
      toast.add({
        title: "Session Deleted",
        description: `Session ${formatSessionId(session.id)} has been deleted`,
        color: "red",
      });
    }
  };

  const clearAllSessions = () => {
    if (confirm("Are you sure you want to delete ALL recording sessions? This cannot be undone.")) {
      gpsStore.sessions.forEach((session) => gpsStore.deleteSession(session.id));
      const toast = useToast();
      toast.add({
        title: "All Sessions Cleared",
        description: "All recording sessions have been deleted",
        color: "red",
      });
    }
  };

  const formatSessionId = (id) => {
    // Extract timestamp from session ID and format nicely
    const match = id.match(/session_(\d+)/);
    if (match) {
      const timestamp = parseInt(match[1]);
      return new Date(timestamp).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return id;
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (startTime, endTime) => {
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  };

  const formatTotalDuration = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };
</script>
