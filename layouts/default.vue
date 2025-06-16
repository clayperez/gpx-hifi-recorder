<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo/Title -->
          <div class="flex items-center">
            <NuxtLink to="/" class="flex items-center space-x-2">
              <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-sm">GPS</span>
              </div>
              <span class="text-xl font-bold text-gray-900 dark:text-white"> GPX HiFi Recorder </span>
            </NuxtLink>
          </div>

          <!-- Navigation -->
          <nav class="flex items-center space-x-4">
            <NuxtLink
              to="/"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              active-class="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink
              to="/test"
              class="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              active-class="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              Test Components
            </NuxtLink>
          </nav>

          <!-- Dark mode toggle and GPS debug toggle -->
          <div class="flex items-center space-x-2">
            <!-- GPS Debug Toggle -->
            <button
              @click="toggleGPSDebug"
              class="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              :class="{ 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400': isGPSDebugEnabled }"
              title="Toggle GPS Debug Mode"
            >
              <!-- Ladybug icon -->
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C9.8 2 8 3.8 8 6c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2 0-2.2-1.8-4-4-4z" />
                <path
                  d="M12 8c-3.3 0-6 2.7-6 6 0 3.3 2.7 6 6 6s6-2.7 6-6c0-3.3-2.7-6-6-6zm-2 8c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm4 0c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z"
                />
                <circle cx="10" cy="11" r=".5" fill="currentColor" />
                <circle cx="14" cy="11" r=".5" fill="currentColor" />
                <circle cx="10" cy="13" r=".5" fill="currentColor" />
                <circle cx="14" cy="13" r=".5" fill="currentColor" />
                <path d="M6 10c-.6 0-1-.4-1-1s.4-1 1-1h1v2H6zm11 0h1c.6 0 1-.4 1-1s-.4-1-1-1h-1v2z" />
                <path d="M7 14c-.6 0-1-.4-1-1s.4-1 1-1h1v2H7zm10 0h1c.6 0 1-.4 1-1s-.4-1-1-1h-1v2z" />
              </svg>
            </button>

            <!-- Dark Mode Toggle -->
            <button
              @click="toggleDarkMode"
              class="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Toggle dark mode"
            >
              <svg v-if="!isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                ></path>
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="text-center text-sm text-gray-500 dark:text-gray-400">© 2025 GPX HiFi Recorder - Columbus P-7 Pro GPS Tracker</div>
      </div>
    </footer>
  </div>
</template>

<script setup>
  import { ref } from "vue";

  const isDark = ref(false);
  const isGPSDebugEnabled = ref(false);

  // Check for saved theme preference or default to light mode
  if (process.client) {
    isDark.value =
      localStorage.getItem("darkMode") === "true" || (!localStorage.getItem("darkMode") && window.matchMedia("(prefers-color-scheme: dark)").matches);

    // Check for GPS debug preference (disabled by default)
    isGPSDebugEnabled.value = localStorage.getItem("gps-debug") === "true";

    // Apply initial theme
    updateTheme();
  }

  function toggleDarkMode() {
    isDark.value = !isDark.value;
    updateTheme();
    if (process.client) {
      localStorage.setItem("darkMode", isDark.value.toString());
    }
  }

  function toggleGPSDebug() {
    isGPSDebugEnabled.value = !isGPSDebugEnabled.value;
    if (process.client) {
      if (isGPSDebugEnabled.value) {
        localStorage.setItem("gps-debug", "true");
      } else {
        localStorage.removeItem("gps-debug");
      }

      // Show a notification to the user
      console.log(`GPS Debug Mode: ${isGPSDebugEnabled.value ? "ENABLED" : "DISABLED"}`);
      console.log("Reload the page or restart the app to apply debug changes.");
    }
  }

  function updateTheme() {
    if (process.client) {
      if (isDark.value) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }
</script>
