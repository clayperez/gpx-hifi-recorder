export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ["@unocss/nuxt", "@nuxt/ui", "@pinia/nuxt", "@vueuse/nuxt"],

  css: ["@unocss/reset/tailwind.css"],

  unocss: {
    // UnoCSS options
    shortcuts: {
      // Custom shortcuts for common patterns
      "btn-primary": "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors",
      "btn-secondary": "bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors",
      "btn-success": "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors",
      "btn-danger": "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors",
      card: "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6",
      "input-field": "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
      "status-connected": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      "status-disconnected": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      "status-recording": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    },
    rules: [
      // Custom rules for GPS-specific styling
      [
        /^gps-accuracy-(.+)$/,
        ([, c]) => ({
          "border-color": c === "high" ? "#10b981" : c === "medium" ? "#f59e0b" : "#ef4444",
          "background-color": c === "high" ? "#d1fae5" : c === "medium" ? "#fef3c7" : "#fee2e2",
        }),
      ],
    ],
  },

  ssr: false, // Important for Electron apps

  nitro: {
    preset: "node",
  },

  runtimeConfig: {
    public: {
      appVersion: process.env.npm_package_version || "1.0.0",
    },
  },
});
