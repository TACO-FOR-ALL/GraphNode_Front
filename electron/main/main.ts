process.env.TRANSFORMERS_BACKEND = "wasm";
import { app, BrowserWindow } from "electron";
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

  // 드래그한 파일이 현재 창에서 이동하여 열리는 것 방지
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  // 드래그한 파일이 새 창/탭 열리는 것 방지
  win.webContents.setWindowOpenHandler(({ url }) => {
    // 특정 URL만 허용
    if (url.startsWith("popup://")) {
      return {
        action: "allow",
        overrideBrowserWindowOptions: {
          width: 400,
          height: 300,
          title: "작은 팝업",
          resizable: false,
          alwaysOnTop: true,
        },
      };
    }

    // 나머지는 다 차단
    return { action: "deny" };
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
