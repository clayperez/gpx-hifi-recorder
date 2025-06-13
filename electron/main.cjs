const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

// Better way to detect development mode
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
