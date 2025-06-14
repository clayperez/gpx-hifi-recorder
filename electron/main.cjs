const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

// Better way to detect development mode
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow;
let gpsPort = null;
let gpsParser = null;
let isRecording = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
    icon: path.join(__dirname, "../resources/icon.png"), // Add your app icon
  });

  if (isDev) {
    console.log("Running in development mode");
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    console.log("Running in production mode");
    const indexPath = path.join(__dirname, "../.output/public/index.html");
    console.log("Looking for build at:", indexPath);

    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      console.error("Production build not found. Run: npm run build");
      mainWindow.loadURL("data:text/html,<h1>Production build not found</h1><p>Run <code>npm run build</code> first</p>");
    }
  }
}

// GPS Serial Port Communication
async function listSerialPorts() {
  try {
    const ports = await SerialPort.list();
    return ports;
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
      flowControl: false,
    });

    gpsParser = gpsPort.pipe(new ReadlineParser({ delimiter: "\r\n" }));

    gpsPort.on("open", () => {
      console.log("GPS port opened successfully");
      mainWindow.webContents.send("gps-connection-status", { connected: true, port: portPath });
    });

    gpsPort.on("error", (err) => {
      console.error("GPS port error:", err);
      mainWindow.webContents.send("gps-connection-status", { connected: false, error: err.message });
    });

    gpsParser.on("data", (data) => {
      // Parse NMEA sentences from Columbus P-7 Pro
      if (data.startsWith("$")) {
        const nmeaData = parseNMEA(data);
        if (nmeaData) {
          mainWindow.webContents.send("gps-data", nmeaData);
        }
      }
    });

    return true;
  } catch (error) {
    console.error("Error connecting to GPS:", error);
    return false;
  }
}

async function disconnectFromGPS() {
  try {
    if (gpsPort && gpsPort.isOpen) {
      await new Promise((resolve) => {
        gpsPort.close(resolve);
      });
    }
    gpsPort = null;
    gpsParser = null;
    mainWindow.webContents.send("gps-connection-status", { connected: false });
    return true;
  } catch (error) {
    console.error("Error disconnecting from GPS:", error);
    return false;
  }
}

// NMEA Parser for Columbus P-7 Pro
function parseNMEA(sentence) {
  const parts = sentence.split(",");
  const messageType = parts[0];

  try {
    switch (messageType) {
      case "$GPGGA": // Global Positioning System Fix Data
      case "$GNGGA": // GNSS Fix Data
        return parseGGA(parts);

      case "$GPRMC": // Recommended Minimum Specific GPS/Transit Data
      case "$GNRMC": // GNSS Recommended Minimum
        return parseRMC(parts);

      case "$GPGSV": // GPS Satellites in View
      case "$GNGSV": // GNSS Satellites in View
        return parseGSV(parts);

      default:
        return null;
    }
  } catch (error) {
    console.error("Error parsing NMEA sentence:", error);
    return null;
  }
}

function parseGGA(parts) {
  if (parts.length < 15) return null;

  const latitude = convertDMSToDD(parts[2], parts[3]);
  const longitude = convertDMSToDD(parts[4], parts[5]);
  const altitude = parseFloat(parts[9]) || 0;
  const quality = parseInt(parts[6]) || 0;
  const satellites = parseInt(parts[7]) || 0;
  const hdop = parseFloat(parts[8]) || 0;

  if (!latitude || !longitude) return null;

  return {
    type: "position",
    timestamp: new Date().toISOString(),
    utcTime: parts[1],
    latitude,
    longitude,
    altitude,
    quality,
    satellites,
    hdop,
    accuracy: calculateAccuracy(hdop, quality),
  };
}

function parseRMC(parts) {
  if (parts.length < 12) return null;

  const status = parts[2];
  if (status !== "A") return null; // Only valid fixes

  const latitude = convertDMSToDD(parts[3], parts[4]);
  const longitude = convertDMSToDD(parts[5], parts[6]);
  const speed = parseFloat(parts[7]) * 1.852 || 0; // Convert knots to km/h
  const course = parseFloat(parts[8]) || 0;

  if (!latitude || !longitude) return null;

  return {
    type: "navigation",
    timestamp: new Date().toISOString(),
    utcTime: parts[1],
    date: parts[9],
    latitude,
    longitude,
    speed,
    course,
  };
}

function parseGSV(parts) {
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
  if (!dms || !direction) return null;

  const degrees = Math.floor(parseFloat(dms) / 100);
  const minutes = parseFloat(dms) % 100;
  let dd = degrees + minutes / 60;

  if (direction === "S" || direction === "W") {
    dd = dd * -1;
  }

  return dd;
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
      break; // GPS fix
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
    default:
      baseAccuracy = 5.0;
  }

  return Math.round(baseAccuracy * (hdop || 1) * 10) / 10;
}

// IPC Handlers
ipcMain.handle("list-serial-ports", listSerialPorts);
ipcMain.handle("connect-gps", async (event, portPath, baudRate) => {
  return await connectToGPS(portPath, baudRate);
});
ipcMain.handle("disconnect-gps", disconnectFromGPS);
ipcMain.handle("start-recording", () => {
  isRecording = true;
  return isRecording;
});
ipcMain.handle("stop-recording", () => {
  isRecording = false;
  return isRecording;
});
ipcMain.handle("get-recording-status", () => isRecording);

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
