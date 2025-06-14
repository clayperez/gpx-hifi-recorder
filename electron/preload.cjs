const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Serial port operations
  listSerialPorts: () => ipcRenderer.invoke("list-serial-ports"),
  connectGPS: (portPath, baudRate) => ipcRenderer.invoke("connect-gps", portPath, baudRate),
  disconnectGPS: () => ipcRenderer.invoke("disconnect-gps"),

  // Recording operations
  startRecording: () => ipcRenderer.invoke("start-recording"),
  stopRecording: () => ipcRenderer.invoke("stop-recording"),
  getRecordingStatus: () => ipcRenderer.invoke("get-recording-status"),

  // Debug operations
  sendTestCommand: (command) => ipcRenderer.invoke("send-test-command", command),
  getRawGPSData: () => ipcRenderer.invoke("get-raw-gps-data"),

  // Event listeners
  onGPSData: (callback) => ipcRenderer.on("gps-data", callback),
  onGPSConnectionStatus: (callback) => ipcRenderer.on("gps-connection-status", callback),
  onRecordingStatusChanged: (callback) => ipcRenderer.on("recording-status-changed", callback),
  onGPSPositionRecorded: (callback) => ipcRenderer.on("gps-position-recorded", callback),
  onRawGPSData: (callback) => ipcRenderer.on("raw-gps-data", callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Platform info
  platform: process.platform,
});
