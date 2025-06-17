<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">GPS Device Testing</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- GPS Connection Component -->
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">GPS Connection</h2>
        <GPSConnectButton />
      </div>

      <!-- GPS Logging Component -->
      <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">GPS Data Logging</h2>
        <GPSLoggingButton />
      </div>
    </div>

    <!-- Console Output Log / Map View Toggle -->
    <div class="mt-8">
      <!-- Toggle Header -->
      <div class="bg-white dark:bg-gray-800 rounded-t-lg border border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">GPS Data Visualization</h2>

          <!-- Toggle Buttons -->
          <div class="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              @click="activeView = 'console'"
              :class="[
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                activeView === 'console'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
              ]"
            >
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3"></path>
                </svg>
                <span>Console Log</span>
              </div>
            </button>

            <button
              @click="activeView = 'map'"
              :class="[
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                activeView === 'map'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white',
              ]"
            >
              <div class="flex items-center space-x-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"
                  ></path>
                </svg>
                <span>Map View</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- View Content -->
      <div class="border-x border-b border-gray-200 dark:border-gray-700 rounded-b-lg overflow-hidden">
        <!-- Console Output Log -->
        <div v-if="activeView === 'console'">
          <ConsoleOutputLog />
        </div>

        <!-- Map View -->
        <div v-if="activeView === 'map'">
          <MapView />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from "vue";

  // Toggle state for switching between console log and map view
  const activeView = ref("console"); // Default to console view

  // Components will be auto-imported by Nuxt
</script>
