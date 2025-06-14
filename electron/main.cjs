const { app, BrowserWindow, ipcMain } = require("electron");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const path = require("path");

let mainWindow;
let gpsPort = null;
let isRecording = false;
let recordingInterval = null;
let currentGPSData = null;

const isDev = process.env.NODE_ENV === "development";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
    titleBarStyle: "default",
    frame: true, // Keep native frame for better UX
    show: false,
    icon: process.platform === "linux" ? path.join(__dirname, "../resources/icon.png") : undefined,
  });

  const url = isDev ? "http://localhost:3000" : `file://${path.join(__dirname, "../.output/public/index.html")}`;

  mainWindow.loadURL(url);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
}

// Serial port operations
async function listSerialPorts() {
  try {
    const ports = await SerialPort.list();
    return ports.map((port) => ({
      path: port.path,
      manufacturer: port.manufacturer || "Unknown",
      vendorId: port.vendorId,
      productId: port.productId,
    }));
  } catch (error) {
    console.error("Error listing serial ports:", error);
    return [];
  }
}

async function connectToGPS(portPath, baudRate = 115200) {
  try {
    if (gpsPort && gpsPort.isOpen) {
      await disconnectFromGPS();
    }

    gpsPort = new SerialPort({
      path: portPath,
      baudRate: baudRate,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      autoOpen: false,
    });

    const parser = gpsPort.pipe(new ReadlineParser({ delimiter: "\r\n" }));

    return new Promise((resolve, reject) => {
      gpsPort.open((err) => {
        if (err) {
          console.error("Error opening port:", err);
          reject(err);
          return;
        }

        console.log(`Connected to GPS on ${portPath} at ${baudRate} baud`);

        parser.on("data", (data) => {
          try {
            // Store raw data for debugging
            rawGPSDataBuffer.push({
              timestamp: new Date().toISOString(),
              data: data,
            });

            // Keep buffer size manageable
            if (rawGPSDataBuffer.length > MAX_RAW_DATA_BUFFER) {
              rawGPSDataBuffer.shift();
            }

            // Send raw data to frontend for debugging
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("raw-gps-data", { timestamp: new Date().toISOString(), data });
            }

            // Log raw NMEA data for debugging
            console.log("Raw NMEA:", data);

            const parsedData = parseNMEAData(data);
            if (parsedData) {
              console.log("Parsed GPS data:", parsedData);
              currentGPSData = parsedData;

              // Always send GPS data for live monitoring
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("gps-data", parsedData);
              }

              // Only record data if recording is active
              if (isRecording && parsedData.type === "position" && parsedData.latitude && parsedData.longitude) {
                recordGPSPosition(parsedData);
              }
            }
          } catch (error) {
            console.error("Error parsing NMEA data:", error, "Raw data:", data);
          }
        });

        parser.on("error", (error) => {
          console.error("Parser error:", error);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("gps-connection-status", { connected: false, error: error.message });
          }
        });

        gpsPort.on("error", (error) => {
          console.error("Serial port error:", error);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("gps-connection-status", { connected: false, error: error.message });
          }
        });

        gpsPort.on("close", () => {
          console.log("GPS port closed");
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("gps-connection-status", { connected: false });
          }
          // Stop recording if port is closed
          if (isRecording) {
            stopRecording();
          }
        });

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("gps-connection-status", { connected: true, port: portPath, baudRate });
        }

        resolve(true);
      });
    });
  } catch (error) {
    console.error("Failed to connect to GPS:", error);
    throw error;
  }
}

async function disconnectFromGPS() {
  return new Promise((resolve) => {
    if (gpsPort && gpsPort.isOpen) {
      // Stop recording if active
      if (isRecording) {
        stopRecording();
      }

      gpsPort.close((err) => {
        if (err) {
          console.error("Error closing GPS port:", err);
        } else {
          console.log("GPS disconnected");
        }
        gpsPort = null;
        currentGPSData = null;

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("gps-connection-status", { connected: false });
        }
        resolve();
      });
    } else {
      gpsPort = null;
      currentGPSData = null;
      resolve();
    }
  });
}

// Raw GPS data storage for debugging
let rawGPSDataBuffer = [];
const MAX_RAW_DATA_BUFFER = 100;

// Recording operations
function startRecording() {
  if (isRecording) {
    console.log("Recording already active");
    return { success: false, message: "Recording already active" };
  }

  if (!gpsPort || !gpsPort.isOpen) {
    console.log("GPS not connected");
    return { success: false, message: "GPS not connected" };
  }

  if (!currentGPSData || !currentGPSData.latitude || !currentGPSData.longitude) {
    console.log("No valid GPS position available");
    return { success: false, message: "No valid GPS position available" };
  }

  isRecording = true;
  console.log("GPS recording started");

  // Notify frontend
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("recording-status-changed", { isRecording: true });
  }

  return { success: true, message: "Recording started" };
}

function stopRecording() {
  if (!isRecording) {
    console.log("Recording not active");
    return { success: false, message: "Recording not active" };
  }

  isRecording = false;

  // Clear any recording intervals if they exist
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }

  console.log("GPS recording stopped");

  // Notify frontend
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("recording-status-changed", { isRecording: false });
  }

  return { success: true, message: "Recording stopped" };
}

function getRecordingStatus() {
  return {
    isRecording,
    hasGPSConnection: gpsPort && gpsPort.isOpen,
    hasValidPosition: currentGPSData && currentGPSData.latitude && currentGPSData.longitude,
    currentPosition: currentGPSData,
  };
}

function recordGPSPosition(gpsData) {
  // This function can be expanded to save to file or database
  // For now, we just log that recording is happening
  console.log(`Recording GPS position: ${gpsData.latitude}, ${gpsData.longitude} at ${gpsData.timestamp}`);

  // Send recorded position to frontend
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("gps-position-recorded", gpsData);
  }
}

// Debug functions
function sendTestCommand(command) {
  if (!gpsPort || !gpsPort.isOpen) {
    return { success: false, message: "GPS not connected" };
  }

  try {
    gpsPort.write(command + "\r\n");
    console.log("Sent test command:", command);
    return { success: true, message: `Sent: ${command}` };
  } catch (error) {
    console.error("Error sending test command:", error);
    return { success: false, message: error.message };
  }
}

function getRawGPSData() {
  return {
    buffer: rawGPSDataBuffer,
    currentData: currentGPSData,
    connectionStatus: {
      connected: gpsPort && gpsPort.isOpen,
      hasValidPosition: currentGPSData && currentGPSData.latitude && currentGPSData.longitude,
    },
  };
}

// NMEA parsing functions (enhanced for Columbus P-7 Pro)
function parseNMEAData(sentence) {
  if (!sentence || typeof sentence !== "string") return null;

  sentence = sentence.trim();
  if (!sentence.startsWith("$")) return null;

  const parts = sentence.split(",");
  const messageType = parts[0];

  try {
    switch (messageType) {
      case "$GPGGA":
      case "$GNGGA":
        return parseGGA(parts);
      case "$GPRMC":
      case "$GNRMC":
        return parseRMC(parts);
      case "$GPVTG":
      case "$GNVTG":
        return parseVTG(parts);
      case "$GPGSV":
      case "$GNGSV":
      case "$GLGSV":
      case "$GAGSV":
        return parseGSV(parts);
      default:
        // Log unknown message types for debugging
        console.log("Unknown NMEA message:", messageType);
        return null;
    }
  } catch (error) {
    console.error("Error parsing NMEA sentence:", sentence, error);
    return null;
  }
}

function parseGGA(parts) {
  if (parts.length < 15) {
    console.log("GGA sentence too short:", parts.length, parts);
    return null;
  }

  const utcTime = parts[1];
  const latitude = convertDMSToDD(parts[2], parts[3]);
  const longitude = convertDMSToDD(parts[4], parts[5]);
  const quality = parseInt(parts[6]) || 0;
  const satellites = parseInt(parts[7]) || 0;
  const hdop = parseFloat(parts[8]) || null;
  const altitude = parseFloat(parts[9]) || null;
  const geoidHeight = parseFloat(parts[11]) || null;

  // Quality check - 0 means invalid fix
  if (quality === 0) {
    console.log("GGA: Invalid fix quality");
    return null;
  }

  if (!latitude || !longitude) {
    console.log("GGA: Invalid coordinates", { latitude, longitude });
    return null;
  }

  const accuracy = calculateAccuracy(hdop, quality);

  console.log("GGA parsed successfully:", { latitude, longitude, quality, satellites, accuracy });

  return {
    type: "position",
    timestamp: new Date().toISOString(),
    utcTime,
    latitude,
    longitude,
    altitude,
    accuracy,
    quality,
    satellites,
    hdop,
    geoidHeight,
  };
}

function parseRMC(parts) {
  if (parts.length < 12) {
    console.log("RMC sentence too short:", parts.length);
    return null;
  }

  const utcTime = parts[1];
  const status = parts[2];
  const latitude = convertDMSToDD(parts[3], parts[4]);
  const longitude = convertDMSToDD(parts[5], parts[6]);
  const speed = parseFloat(parts[7]) || 0; // knots
  const course = parseFloat(parts[8]) || 0; // degrees
  const date = parts[9];

  // Status check - A = valid, V = invalid
  if (status !== "A") {
    console.log("RMC: Invalid status", status);
    return null;
  }

  if (!latitude || !longitude) {
    console.log("RMC: Invalid coordinates");
    return null;
  }

  return {
    type: "navigation",
    timestamp: new Date().toISOString(),
    utcTime,
    date,
    latitude,
    longitude,
    speed: speed * 1.852, // Convert knots to km/h
    course,
  };
}

function parseVTG(parts) {
  if (parts.length < 9) return null;

  const course = parseFloat(parts[1]) || 0;
  const speedKnots = parseFloat(parts[5]) || 0;
  const speedKmh = parseFloat(parts[7]) || 0;

  return {
    type: "navigation",
    timestamp: new Date().toISOString(),
    course,
    speed: speedKmh || speedKnots * 1.852,
  };
}

function parseGSV(parts) {
  if (parts.length < 4) return null;

  const totalMessages = parseInt(parts[1]) || 0;
  const messageNumber = parseInt(parts[2]) || 0;
  const totalSatellites = parseInt(parts[3]) || 0;

  return {
    type: "satellites",
    timestamp: new Date().toISOString(),
    totalMessages,
    messageNumber,
    totalSatellites,
  };
}

function convertDMSToDD(dms, direction) {
  if (!dms || !direction) {
    console.log("DMS conversion failed: missing data", { dms, direction });
    return null;
  }

  try {
    const dmsFloat = parseFloat(dms);
    if (isNaN(dmsFloat)) {
      console.log("DMS conversion failed: invalid number", dms);
      return null;
    }

    const degrees = Math.floor(dmsFloat / 100);
    const minutes = dmsFloat % 100;
    let dd = degrees + minutes / 60;

    if (direction === "S" || direction === "W") {
      dd = dd * -1;
    }

    console.log("DMS converted:", { dms, direction, result: dd });
    return dd;
  } catch (error) {
    console.error("DMS conversion error:", error, { dms, direction });
    return null;
  }
}

function calculateAccuracy(hdop, quality) {
  // Estimate accuracy based on HDOP and fix quality
  // Columbus P-7 Pro specs: 0.5m CEP(50%), 1.5m CEP(95%)
  let baseAccuracy = 1.0;

  switch (quality) {
    case 0:
      return null; // Invalid
    case 1:
      baseAccuracy = 3.0;
      break; // GPS fix (SPS)
    case 2:
      baseAccuracy = 1.0;
      break; // DGPS fix
    case 3:
      baseAccuracy = 0.5;
      break; // PPS fix
    case 4:
      baseAccuracy = 0.3;
      break; // RTK
    case 5:
      baseAccuracy = 0.5;
      break; // Float RTK
    case 6:
      baseAccuracy = 2.0;
      break; // Estimated
    default:
      baseAccuracy = 5.0;
  }

  const hdopMultiplier = hdop && hdop > 0 ? hdop : 1;
  const estimatedAccuracy = baseAccuracy * hdopMultiplier;

  return Math.round(estimatedAccuracy * 10) / 10;
}

// IPC Handlers
ipcMain.handle("list-serial-ports", listSerialPorts);
ipcMain.handle("connect-gps", async (event, portPath, baudRate) => {
  return await connectToGPS(portPath, baudRate);
});
ipcMain.handle("disconnect-gps", disconnectFromGPS);
ipcMain.handle("start-recording", startRecording);
ipcMain.handle("stop-recording", stopRecording);
ipcMain.handle("get-recording-status", getRecordingStatus);

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (gpsPort && gpsPort.isOpen) {
    disconnectFromGPS();
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
