import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ipc from "./ipc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    const url = process.env.VITE_DEV_SERVER_URL!;
    win.loadURL(url);
    win.webContents.openDevTools();
  } else {
    const indexHtml = path.join(__dirname, "../index.html");
    win.loadFile(indexHtml);
  }
}

app.whenReady().then(() => {
  // index.ts의 ipc 전부 가져오기
  ipc();

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
