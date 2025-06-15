const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Add any APIs you want to expose to the renderer
  test: () => "Hello from Electron!",
});
