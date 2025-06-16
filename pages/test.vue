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

    <!-- Console Output Log -->
    <div class="mt-8">
      <ConsoleOutputLog />
    </div>
  </div>
</template>

<script setup>
  // Components will be auto-imported by Nuxt
</script>
