const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

// Better way to detect development mode
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const debugMode = false;

let mainWindow;
let gpsPort;
let parser;
let isRecording = false;
let recordingStream = null;
let lastPosition = null;

// Debug logging helper
function debugLog(...args) {
  if (debugMode) {
    console.log(...args);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  if (isDev) {
    debugLog("Running in development mode");
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools();
  } else {
    debugLog("Running in production mode");
    const indexPath = path.join(__dirname, "../.output/public/index.html");
    debugLog("Looking for build at:", indexPath);

    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      console.error("Production build not found. Run: npm run build");
      mainWindow.loadURL("data:text/html,<h1>Production build not found</h1><p>Run <code>npm run build</code> first</p>");
    }
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Handlers
ipcMain.handle("list-ports", async () => {
  try {
    const ports = await SerialPort.list();
    return ports;
  } catch (error) {
    console.error("Error listing ports:", error);
    throw error;
  }
});

ipcMain.handle("connect-device", async (event, port) => {
  try {
    // Make sure any existing connection is closed first
    if (gpsPort) {
      debugLog("Closing existing port connection");
      if (parser) {
        parser.removeAllListeners("data");
      }
      await new Promise((resolve, reject) => {
        gpsPort.close((err) => {
          if (err) {
            console.error("Error closing existing port:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    debugLog("Opening new connection to", port);
    gpsPort = new SerialPort({
      path: port,
      baudRate: 57600,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      rtscts: true,
    });

    // Wait for port to open
    await new Promise((resolve, reject) => {
      gpsPort.on("open", () => {
        debugLog("Port opened successfully");
        resolve();
      });
      gpsPort.on("error", (err) => {
        console.error("Port error:", err);
        reject(err);
      });
    });

    parser = gpsPort.pipe(new ReadlineParser());

    // Debug raw data coming in
    gpsPort.on("data", (data) => {
      //console.log("📡 Raw serial data received:", data.toString());
    });

    // Add error handling for the parser
    gpsPort.on("error", (error) => {
      console.error("🚨 GPS Port error:", error);
    });

    parser.on("error", (error) => {
      console.error("🚨 Parser error:", error);
    });

    // Log when parser receives data
    parser.on("data", (line) => {
      // The Columbus P-7 Pro supports multiple NMEA sentences
      // We should check for GGA, RMC, and GSA sentences
      if (line.startsWith("$GPGGA") || line.startsWith("$GNGGA")) {
        debugLog("⌗ Processing GGA sentence:", line);
        const parsedData = parseGGA(line);
        if (parsedData) {
          // Don't send GGA data immediately - wait for RMC to get complete data with speed
          debugLog("⏳ GGA parsed, waiting for RMC to send complete data...");
        } else {
          debugLog("❌ Failed to parse GGA data");
        }
      }
      // Add RMC parsing for speed and course
      else if (line.startsWith("$GPRMC") || line.startsWith("$GNRMC")) {
        debugLog("🎯 Processing RMC sentence:", line);
        const parsedRMC = parseRMC(line);
        if (parsedRMC && lastPosition) {
          const combinedData = {
            ...lastPosition,
            ...parsedRMC,
          };
          debugLog("📤 Sending complete GPS data (GGA + RMC):", combinedData);
          mainWindow.webContents.send("gps-data", combinedData);
        } else {
          debugLog("❌ Failed to parse RMC data or no lastPosition");
        }
      } else {
        // console.log("ℹ️ Ignoring NMEA sentence:", line.substring(0, Math.min(20, line.length)) + "...");
      }
    });

    // Add a timeout to check if we're receiving any data
    setTimeout(() => {
      debugLog("⏰ 10-second check: Has any data been received?");
      if (!lastPosition) {
        debugLog("⚠️ No GPS data received yet. Possible issues:");
        debugLog("   1. GPS device needs time to get a satellite fix");
        debugLog("   2. Device might be in power-saving mode");
        debugLog("   3. Wrong serial port settings");
        debugLog("   4. Device needs specific commands to start transmitting");
      }
    }, 10000);

    // Try to wake up the GPS device and request NMEA output
    debugLog("📡 Sending wake-up commands to GPS device...");

    // Common commands to wake up GPS devices and ensure NMEA output
    const wakeupCommands = [
      // Request device info
      "$PMTK605*31\r\n", // Query firmware version
      // Enable NMEA output
      "$PMTK314,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0*28\r\n", // Enable GGA and RMC
      // Set update rate to 1Hz
      "$PMTK220,1000*1F\r\n",
      // Cold restart (if needed)
      // "$PMTK104*37\r\n"
    ];

    // Send commands with delays
    wakeupCommands.forEach((command, index) => {
      setTimeout(() => {
        if (gpsPort && gpsPort.isOpen) {
          debugLog(`📤 Sending command ${index + 1}:`, command.trim());
          gpsPort.write(command);
        }
      }, index * 1000); // 1 second delay between commands
    });

    mainWindow.webContents.send("connection-status", true);
    return true;
  } catch (error) {
    console.error("Error connecting to device:", error);
    // Clean up on error
    if (parser) {
      parser.removeAllListeners("data");
    }
    if (gpsPort) {
      gpsPort.close();
    }
    gpsPort = null;
    parser = null;
    throw error;
  }
});

ipcMain.handle("disconnect-device", async () => {
  try {
    if (gpsPort) {
      debugLog("Disconnecting device");
      // Remove parser listeners first
      if (parser) {
        parser.removeAllListeners("data");
      }

      // Close port
      await new Promise((resolve, reject) => {
        gpsPort.close((err) => {
          if (err) {
            console.error("Error closing port:", err);
            reject(err);
          } else {
            debugLog("Port closed successfully");
            resolve();
          }
        });
      });

      // Clear references
      gpsPort = null;
      parser = null;
    }

    mainWindow.webContents.send("connection-status", false);
    return true;
  } catch (error) {
    console.error("Error disconnecting device:", error);
    // Force cleanup even on error
    gpsPort = null;
    parser = null;
    throw error;
  }
});

ipcMain.handle("start-recording", () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = path.join(app.getPath("userData"), `track-${timestamp}.gpx`);

    recordingStream = fs.createWriteStream(filename);
    recordingStream.write('<?xml version="1.0" encoding="UTF-8"?>\n');
    recordingStream.write('<gpx version="1.1">\n<trk><trkseg>\n');

    isRecording = true;
    mainWindow.webContents.send("recording-status", true);
    return true;
  } catch (error) {
    console.error("Error starting recording:", error);
    throw error;
  }
});

ipcMain.handle("stop-recording", () => {
  try {
    if (recordingStream) {
      recordingStream.write("</trkseg></trk></gpx>");
      recordingStream.end();
      recordingStream = null;
    }
    isRecording = false;
    mainWindow.webContents.send("recording-status", false);
    return true;
  } catch (error) {
    console.error("Error stopping recording:", error);
    throw error;
  }
});

ipcMain.handle("add-poi", (event, type, description) => {
  try {
    // Save POI to the current track file if recording
    if (isRecording && recordingStream && lastPosition) {
      const poi = `<wpt lat="${lastPosition.latitude}" lon="${lastPosition.longitude}">
        <name>${type}</name>
        <desc>${description}</desc>
        <time>${lastPosition.timestamp}</time>
      </wpt>\n`;
      recordingStream.write(poi);
    }
    return true;
  } catch (error) {
    console.error("Error adding POI:", error);
    throw error;
  }
});

// Parse GGA sentence (Global Positioning System Fix Data)
function parseGGA(data) {
  try {
    const parts = data.split(",");
    if (parts.length >= 14 && parts[2] && parts[4]) {
      debugLog(`🔍 Raw GGA coordinate data: lat="${parts[2]}" ${parts[3]}, lon="${parts[4]}" ${parts[5]}`);

      const latitude = parseNMEACoordinate(parts[2], parts[3]);
      const longitude = parseNMEACoordinate(parts[4], parts[5]);
      const quality = parseInt(parts[6]); // 0 = invalid, 1 = GPS fix, 2 = DGPS fix
      const satellites = parseInt(parts[7]) || 0;
      const hdop = parseFloat(parts[8]) || 0;
      const elevation = parseFloat(parts[9]) || 0;

      debugLog(`📍 Parsed coordinates: lat=${latitude.toFixed(6)}, lon=${longitude.toFixed(6)}`);

      lastPosition = {
        latitude,
        longitude,
        satellites,
        elevation,
        quality,
        hdop,
        timestamp: new Date().toISOString(),
      };

      // Write to GPX file if recording
      if (isRecording && recordingStream) {
        const trkpt = `<trkpt lat="${latitude}" lon="${longitude}">
          <ele>${elevation}</ele>
          <time>${lastPosition.timestamp}</time>
          <sat>${satellites}</sat>
          <hdop>${hdop}</hdop>
        </trkpt>\n`;
        recordingStream.write(trkpt);
      }

      return lastPosition;
    }
  } catch (error) {
    console.error("Error parsing GGA:", error);
  }
  return null;
}

// Parse RMC sentence (Recommended Minimum Navigation Information)
function parseRMC(data) {
  try {
    const parts = data.split(",");
    if (parts.length >= 12 && parts[3] && parts[5]) {
      const time = parts[1];
      const status = parts[2]; // A = valid, V = invalid
      const speed = parseFloat(parts[7]) * 1.852; // Convert knots to km/h
      const course = parseFloat(parts[8]) || 0;
      const date = parts[9];

      if (status === "A") {
        return {
          speed,
          course,
          timestamp: parseNMEADateTime(date, time),
        };
      }
    }
  } catch (error) {
    console.error("Error parsing RMC:", error);
  }
  return null;
}

// Helper to parse NMEA coordinate
function parseNMEACoordinate(coord, dir) {
  if (!coord) return 0;

  debugLog(`🗺️ Parsing coordinate: ${coord}, direction: ${dir}`);

  // NMEA coordinates come in format:
  // Latitude: ddmm.mmmm (degrees, minutes) - first 2 digits are degrees
  // Longitude: dddmm.mmmm (degrees, minutes) - first 3 digits are degrees

  let degrees, minutes;

  // Determine if this is latitude or longitude based on expected ranges
  // Latitude: 0-90 degrees, so first 2 digits for degrees
  // Longitude: 0-180 degrees, so first 3 digits for degrees

  // Try parsing as latitude first (2 digit degrees)
  const latDegrees = parseInt(coord.substring(0, 2));
  const latMinutes = parseFloat(coord.substring(2));
  const latDecimal = latDegrees + latMinutes / 60;

  // Try parsing as longitude (3 digit degrees)
  const lonDegrees = coord.length >= 5 ? parseInt(coord.substring(0, 3)) : 0;
  const lonMinutes = coord.length >= 5 ? parseFloat(coord.substring(3)) : 0;
  const lonDecimal = lonDegrees + lonMinutes / 60;

  // Determine which parsing makes sense based on the result
  if (latDecimal <= 90 && latMinutes < 60) {
    // This looks like a valid latitude
    degrees = latDegrees;
    minutes = latMinutes;
    debugLog(`📍 Parsed as latitude: ${degrees}° ${minutes.toFixed(6)}'`);
  } else if (lonDecimal <= 180 && lonMinutes < 60) {
    // This looks like a valid longitude
    degrees = lonDegrees;
    minutes = lonMinutes;
    debugLog(`📍 Parsed as longitude: ${degrees}° ${minutes.toFixed(6)}'`);
  } else {
    // Fallback to original logic if ranges don't help
    debugLog(`⚠️ Coordinate outside expected ranges, using fallback parsing`);
    if (coord.length >= 9) {
      degrees = parseInt(coord.substring(0, 3));
      minutes = parseFloat(coord.substring(3));
    } else {
      degrees = parseInt(coord.substring(0, 2));
      minutes = parseFloat(coord.substring(2));
    }
  }

  let decimal = degrees + minutes / 60;

  if (dir === "S" || dir === "W") {
    decimal = -decimal;
  }

  debugLog(`📍 Final coordinate: ${decimal.toFixed(10)}° (${degrees}° ${minutes.toFixed(6)}' ${dir})`);
  return decimal;
}

// Helper to parse NMEA date and time
function parseNMEADateTime(date, time) {
  try {
    if (date && time) {
      const day = parseInt(date.substring(0, 2));
      const month = parseInt(date.substring(2, 4)) - 1;
      const year = 2000 + parseInt(date.substring(4, 6));
      const hours = parseInt(time.substring(0, 2));
      const minutes = parseInt(time.substring(2, 4));
      const seconds = parseInt(time.substring(4, 6));

      return new Date(Date.UTC(year, month, day, hours, minutes, seconds)).toISOString();
    }
  } catch (error) {
    console.error("Error parsing datetime:", error);
  }
  return new Date().toISOString();
}
