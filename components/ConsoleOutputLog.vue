<template>
  <div class="bg-black text-green-400 p-4 rounded-lg">
    <h3 class="text-lg font-semibold mb-2">GPS Data Stream</h3>

    <!-- Status indicator -->
    <div class="mb-3 text-sm">
      <span :class="isLogging ? 'text-green-300' : 'text-gray-500'">
        {{ isLogging ? "🟢 LOGGING ACTIVE" : "⚫ LOGGING STOPPED" }}
      </span>
      <span v-if="logEntries.length > 0" class="ml-4 text-gray-400"> {{ logEntries.length }} data points </span>
    </div>

    <!-- Table header -->
    <div class="font-mono text-xs">
      <div class="grid grid-cols-7 gap-2 pb-2 border-b border-green-600 text-green-300 font-semibold">
        <div>LAT</div>
        <div>LON</div>
        <div>SATS</div>
        <div>ELEV(m)</div>
        <div>SPD(km/h)</div>
        <div>QUAL</div>
        <div>TIME</div>
      </div>

      <!-- Scrollable data area -->
      <div
        ref="logContainer"
        @scroll="handleScroll"
        class="h-64 overflow-y-auto mt-2 space-y-1"
        style="scrollbar-width: thin; scrollbar-color: #22c55e #000000"
      >
        <!-- No data message -->
        <div v-if="logEntries.length === 0" class="text-center text-gray-500 py-8">
          <div>No GPS data received yet</div>
          <div class="text-xs mt-1">
            {{ isConnected ? "Waiting for GPS fix..." : "Connect GPS device first" }}
          </div>
        </div>

        <!-- Data rows -->
        <div
          v-for="(entry, index) in logEntries"
          :key="entry.id"
          class="grid grid-cols-7 gap-2 py-1 text-xs hover:bg-green-900 hover:bg-opacity-20 transition-colors"
          :class="index === logEntries.length - 1 ? 'text-green-300 font-semibold' : 'text-green-400'"
        >
          <div>{{ entry.latitude }}</div>
          <div>{{ entry.longitude }}</div>
          <div>{{ entry.satellites }}</div>
          <div>{{ entry.elevation }}</div>
          <div>{{ entry.speed }}</div>
          <div>{{ entry.quality }}</div>
          <div>{{ formatTime(entry.timestamp) }}</div>
        </div>
      </div>

      <!-- Control buttons -->
      <div class="flex justify-between items-center mt-3 pt-2 border-t border-green-600">
        <div class="text-xs text-gray-400">Auto-scroll: {{ autoScroll ? "ON" : "OFF" }}</div>
        <div class="space-x-2">
          <button @click="scrollToBottom" class="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 rounded transition-colors">Scroll to Bottom</button>
          <button @click="toggleAutoScroll" class="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 rounded transition-colors">
            {{ autoScroll ? "Disable Auto-scroll" : "Enable Auto-scroll" }}
          </button>
          <button @click="clearLog" class="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 rounded transition-colors">Clear Log</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch, nextTick, onMounted } from "vue";
  import { useGPSStore } from "~/stores/gps";

  // Debug logging helper - dynamically checks localStorage for debug toggle
  function debugLog(...args) {
    const debugMode = localStorage.getItem("gps-debug") === "true";

    if (debugMode) {
      console.log(...args);
    }
  }

  const gpsStore = useGPSStore();
  const logContainer = ref(null);
  const autoScroll = ref(true);

  // Use shared log entries from GPS store instead of local array
  const logEntries = computed(() => gpsStore.logEntries);

  // Computed properties for reactive data
  const isLogging = computed(() => gpsStore.isRecording);
  const isConnected = computed(() => gpsStore.isConnected);
  const currentPosition = computed(() => gpsStore.currentPosition);

  // Ensure auto-scroll is working when component mounts
  onMounted(() => {
    debugLog("📺 Console: Component mounted, auto-scroll enabled");
    // Scroll to bottom if there are already entries
    if (logEntries.value.length > 0) {
      nextTick(() => {
        scrollToBottom();
      });
    }
  });

  // Watch for changes to log entries to handle auto-scrolling
  watch(
    logEntries,
    () => {
      if (autoScroll.value) {
        nextTick(() => {
          scrollToBottom();
        });
      }
    },
    { deep: true, flush: "post" }
  );

  // Also watch the length of log entries as a fallback
  watch(
    () => logEntries.value.length,
    (newLength, oldLength) => {
      debugLog(`📺 Console: Log entries length changed from ${oldLength} to ${newLength}, auto-scroll: ${autoScroll.value}`);
      if (autoScroll.value && newLength > (oldLength || 0)) {
        nextTick(() => {
          scrollToBottom();
        });
      }
    }
  );

  function formatTime(timestamp) {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function scrollToBottom() {
    if (logContainer.value) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        const { scrollHeight, clientHeight } = logContainer.value;
        debugLog(`📺 Console: Scrolling to bottom - scrollHeight: ${scrollHeight}, clientHeight: ${clientHeight}`);
        logContainer.value.scrollTop = logContainer.value.scrollHeight;
      });
    }
  }

  function handleScroll() {
    if (!logContainer.value) return;

    // Check if user has scrolled to the bottom
    const { scrollTop, scrollHeight, clientHeight } = logContainer.value;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5;

    // If user scrolled away from bottom, disable auto-scroll
    // If user scrolled back to bottom, re-enable auto-scroll
    if (!isAtBottom && autoScroll.value) {
      debugLog("📺 Console: User scrolled up, temporarily disabling auto-scroll");
    } else if (isAtBottom && !autoScroll.value) {
      debugLog("📺 Console: User scrolled to bottom, re-enabling auto-scroll");
      autoScroll.value = true;
    }
  }

  function toggleAutoScroll() {
    autoScroll.value = !autoScroll.value;
    if (autoScroll.value) {
      scrollToBottom();
    }
  }

  function clearLog() {
    gpsStore.clearLogEntries();
    debugLog("📺 Console log: Cleared all entries");
  }
</script>

<style scoped>
  /* Custom scrollbar for webkit browsers */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: #000000;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #22c55e;
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #16a34a;
  }
</style>
