// GPS Store Event Listener Management Plugin
// This plugin automatically sets up and cleans up GPS store event listeners
export default defineNuxtPlugin(async (nuxtApp) => {
  const { $pinia } = nuxtApp;

  if (process.client && window.electronAPI) {
    // Import the GPS store
    const { useGPSStore } = await import("~/stores/gps");
    const gpsStore = useGPSStore($pinia);

    // Set up event listeners when the app starts
    gpsStore.setupEventListeners();

    // Clean up event listeners when the app is destroyed
    nuxtApp.hook("app:beforeMount", () => {
      // Clean up any existing listeners first to prevent duplicates
      gpsStore.cleanupEventListeners();
      gpsStore.setupEventListeners();
    });

    // Clean up on page unload
    if (process.client) {
      window.addEventListener("beforeunload", () => {
        gpsStore.cleanupEventListeners();
      });
    }
  }
});
