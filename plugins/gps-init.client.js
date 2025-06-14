export default defineNuxtPlugin(async () => {
  // Only run on client side
  if (process.server) return;

  const { useGPSStore } = await import("~/stores/gps");
  const gpsStore = useGPSStore();

  // Initialize GPS event listeners
  gpsStore.initializeGPS();

  // Sync recording status from backend to prevent incorrect initial state
  await gpsStore.syncRecordingStatus();

  console.log("GPS store initialized:", {
    isConnected: gpsStore.isConnected,
    isRecording: gpsStore.isRecording,
    hasValidPosition: gpsStore.hasValidPosition,
  });
});
