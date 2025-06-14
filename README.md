# GPS Tracker - Columbus P-7 Pro (JavaScript Version)

A professional GPS tracking application built with Electron and Nuxt 3, specifically designed for the Columbus P-7 Pro GNSS Receiver. Built with plain JavaScript for simplicity.

## Features

- 🛰️ **Columbus P-7 Pro Integration** - Direct USB/Serial communication
- 📍 **High-Precision GPS** - Sub-meter accuracy (±0.5m CEP 50%)
- ⏰ **UTC Timestamps** - Precise time recording from GPS satellites
- 📏 **Elevation Data** - Altitude recording in meters
- 📊 **Real-time Monitoring** - Live GPS data and statistics
- 💾 **Session Recording** - Save and manage GPS tracks
- 📤 **Multiple Export Formats** - GPX, CSV, and KML export
- 🌙 **Dark/Light Mode** - Modern responsive interface
- ⚡ **5Hz Update Rate** - Smooth real-time tracking

## Columbus P-7 Pro Specifications

- **Accuracy**: ±0.5m (50% CEP), ±1.5m (95% CEP)
- **Update Rate**: 5Hz
- **Constellations**: GPS, GLONASS, Galileo, BeiDou
- **Altitude Accuracy**: ±15m
- **Connection**: USB Serial (115200 baud) + Bluetooth
- **Protocols**: NMEA 0183

## Setup

### Prerequisites

- Node.js 18+
- Columbus P-7 Pro GNSS Receiver
- USB cable for connection

### Installation

1. **Create project directory and add files**:

```bash
mkdir gps-tracker
cd gps-tracker
```

2. **Install dependencies**:

```bash
npm install
```

3. **Connect your Columbus P-7 Pro** via USB

4. **Start development server**:

```bash
npm run dev
```

5. **Build for production**:

```bash
npm run build
npm run build:electron
```

## Project Structure (JavaScript)

```
gps-tracker/
├── package.json               # Dependencies and scripts
├── nuxt.config.js             # Nuxt configuration
├── app.vue                    # Root component
├── README.md                  # This file
├── electron/
│   ├── main.cjs              # Electron main process
│   └── preload.cjs           # IPC bridge
├── stores/
│   └── gps.js                # Pinia store (JavaScript)
├── layouts/
│   └── default.vue           # Main layout
├── pages/                    # Vue pages
│   ├── index.vue            # Dashboard
│   ├── connection.vue       # GPS setup
│   ├── recording.vue        # Recording controls
│   └── sessions.vue         # Session history
└── plugins/
    └── persistedstate.client.js  # Store persistence
```

## Key JavaScript Files

### Store (`stores/gps.js`)

- Plain JavaScript Pinia store
- No TypeScript interfaces needed
- Simple object structures for GPS data

### Configuration (`nuxt.config.js`)

- JavaScript configuration file
- UnoCSS shortcuts for styling
- Electron-optimized settings

### Components

- All Vue components use `<script setup>` syntax
- No TypeScript annotations
- Simple JavaScript logic

## Usage

### 1. Connect GPS Receiver

- Connect Columbus P-7 Pro via USB
- Go to **Connection** page
- Select the correct serial port (usually shows as "USB Serial Device")
- Click **Connect**

### 2. Start Recording

- Ensure GPS has valid position (accuracy ≤ threshold)
- Go to **Recording** page
- Click **Start Recording**
- Monitor real-time session statistics

### 3. View Sessions

- Go to **Sessions** page
- View completed recording sessions
- Export sessions in multiple formats
- Analyze track statistics

## GPS Data Format

The application records simple JavaScript objects:

```javascript
// Position data
{
  timestamp: "2025-06-13T12:34:56.789Z",
  utcTime: "123456",
  latitude: 37.7749,
  longitude: -122.4194,
  altitude: 123.45,
  accuracy: 0.8,
  quality: 2,
  satellites: 12,
  hdop: 0.9
}
```

## Export Formats

- **GPX**: Standard GPS exchange format
- **CSV**: Comma-separated values for analysis
- **KML**: Google Earth compatible format

## Development

### Scripts

- `npm run dev` - Start development with hot reload
- `npm run build` - Build Nuxt application
- `npm run build:electron` - Build Electron app
- `npm run preview` - Preview production build

### Technologies

- **Frontend**: Nuxt 3, Vue 3, JavaScript (no TypeScript)
- **Styling**: UnoCSS with custom shortcuts
- **State**: Pinia with persistence
- **Desktop**: Electron
- **GPS**: SerialPort, NMEA parsing

### Why JavaScript Instead of TypeScript?

- **Simpler setup** - No type definitions needed
- **Faster development** - Less configuration overhead
- **Easier debugging** - Straightforward object structures
- **Better for prototyping** - Quick iterations without type checking

## Troubleshooting

### GPS Connection Issues

1. **Check USB connection** - Ensure Columbus P-7 Pro is connected
2. **Driver installation** - May need USB-to-Serial drivers on Windows
3. **Port permissions** - On Linux/Mac, ensure user has serial port access
4. **Baud rate** - Default is 115200 for Columbus P-7 Pro

### Common Problems

- **No serial ports detected**: Check USB connection and drivers
- **Connection fails**: Try different baud rates or restart device
- **No GPS data**: Ensure device has satellite fix (outdoor use)
- **Poor accuracy**: Check antenna placement and GNSS settings

### JavaScript-Specific Notes

- **No type checking** - Be careful with object property access
- **Runtime errors** - Use console.log for debugging
- **Vue DevTools** - Great for inspecting component state
- **Pinia DevTools** - Monitor store state changes

## License

MIT License - See LICENSE file for details

## Support

For Columbus P-7 Pro specific questions, visit: https://www.cbgps.com/p7/
