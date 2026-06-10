import { app, BrowserWindow } from "electron";
import path from "path";

// Disguised desktop shell. The renderer is a tiny Preact SPA that talks ONLY to
// the local agent on 127.0.0.1 — this app holds no cloud keys and no DB key.
let win: BrowserWindow | null = null;

const DEV_URL = process.env.ASTER_DEV_URL; // set in dev to the Vite server

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    title: "Aster Station",
    backgroundColor: "#0b1120",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (DEV_URL) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  }

  win.on("closed", () => {
    win = null;
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(createWindow);
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
