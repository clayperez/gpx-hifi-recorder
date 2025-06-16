const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Device connection
  listPorts: () => ipcRenderer.invoke("list-ports"),
  connectDevice: (port) => ipcRenderer.invoke("connect-device", port),
  disconnectDevice: () => ipcRenderer.invoke("disconnect-device"),

  // Recording controls
  startRecording: () => ipcRenderer.invoke("start-recording"),
  stopRecording: () => ipcRenderer.invoke("stop-recording"),

  // POI management
  addPOI: (type, description) => ipcRenderer.invoke("add-poi", type, description),

  // Event listeners
  onGPSData: (callback) => ipcRenderer.on("gps-data", callback),
  onConnectionStatus: (callback) => ipcRenderer.on("connection-status", callback),
  onRecordingStatus: (callback) => ipcRenderer.on("recording-status", callback),

  // Remove event listeners (cleanup)
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});
