import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import checkAPIKeyValid from "../src/utils/openAIRequest";

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
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// 윈도우 최소화, 최대화, 종료
ipcMain.on("window:minimize", () =>
  BrowserWindow.getFocusedWindow()?.minimize()
);
ipcMain.on("window:maximize", () => {
  const w = BrowserWindow.getFocusedWindow();
  if (!w) return;
  w.isMaximized() ? w.unmaximize() : w.maximize();
});
ipcMain.on("window:close", () => BrowserWindow.getFocusedWindow()?.close());

// 시스템 언어 가져오기
ipcMain.handle("system:getLocale", () => app.getLocale());

// 메인 프로세스에서 OpenAI 호출 (OpenAI SDK에서 브라우저/렌더러에서 직접 호출 금지)
ipcMain.handle("openai:checkAPIKeyValid", async (_event, apiKey: string) => {
  return await checkAPIKeyValid(apiKey);
});
