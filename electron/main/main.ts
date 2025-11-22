import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ipc from "./ipc";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let loginWindow: BrowserWindow | null = null;

// 로그인/메인 창에 렌더링할 URL 반환 (동일한 코드로 라우트 가능)
function resolveRendererUrl(hash = "") {
  // 개발 모드: 개발 서버 URL 반환 http://localhost:5173/#/login
  if (!app.isPackaged) {
    return `${process.env.VITE_DEV_SERVER_URL!}${hash}`;
  }

  // 배포 모드: dist/index.html을 기준으로 로드
  const indexHtml = path.join(__dirname, "../dist/index.html"); // <-- 여기!
  const fileUrl = pathToFileURL(indexHtml);
  fileUrl.hash = hash.replace(/^#*/, "");
  return fileUrl.toString();
}

function registerAuthHandlers() {
  // TODO: Google, Apple OAUth 백엔드와 연동
  ipcMain.handle("auth:start-google", async () => {
    return true;
  });

  ipcMain.handle("auth:start-apple", async () => {
    return true;
  });

  ipcMain.handle("auth:login-success", () => {
    if (loginWindow) {
      loginWindow.close();
      loginWindow = null;
    }

    if (!mainWindow) {
      createMainWindow();
    }

    return true;
  });
}

function createLoginWindow() {
  if (loginWindow) {
    loginWindow.focus();
    return;
  }

  loginWindow = new BrowserWindow({
    width: 290,
    height: 430,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // CSP 헤더 수정: 이미지 로드를 위해 https: 허용
  loginWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ["http://*/*", "https://*/*"] },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };

      // 기존 CSP 헤더를 찾아서 수정
      if (responseHeaders["content-security-policy"]) {
        const csp = Array.isArray(responseHeaders["content-security-policy"])
          ? responseHeaders["content-security-policy"][0]
          : responseHeaders["content-security-policy"];

        // img-src에 https: 추가
        const updatedCsp = csp.replace(
          /img-src\s+[^;]+/,
          "img-src 'self' data: https:"
        );

        responseHeaders["content-security-policy"] = [updatedCsp];
      } else {
        // CSP 헤더가 없으면 추가
        responseHeaders["Content-Security-Policy"] = [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
        ];
      }

      callback({ responseHeaders });
    }
  );

  loginWindow.removeMenu();
  loginWindow.loadURL(resolveRendererUrl("#/login"));

  loginWindow.on("closed", () => {
    loginWindow = null;
  });
}

function createMainWindow() {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1008,
    frame: false,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // CSP 헤더 수정: 이미지 로드를 위해 https: 허용
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ["http://*/*", "https://*/*"] },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };

      // 기존 CSP 헤더를 찾아서 수정
      if (responseHeaders["content-security-policy"]) {
        const csp = Array.isArray(responseHeaders["content-security-policy"])
          ? responseHeaders["content-security-policy"][0]
          : responseHeaders["content-security-policy"];

        // img-src에 https: 추가
        const updatedCsp = csp.replace(
          /img-src\s+[^;]+/,
          "img-src 'self' data: https:"
        );

        responseHeaders["content-security-policy"] = [updatedCsp];
      } else {
        // CSP 헤더가 없으면 추가
        responseHeaders["Content-Security-Policy"] = [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
        ];
      }

      callback({ responseHeaders });
    }
  );

  // 드래그한 파일이 현재 창에서 이동하여 열리는 것 방지
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  // 드래그한 파일이 새 창/탭 열리는 것 방지
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
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
    mainWindow.loadURL(url);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(resolveRendererUrl());
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // index.ts의 ipc 전부 가져오기
  ipc();
  registerAuthHandlers();
  createLoginWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      if (mainWindow) {
        createMainWindow();
      } else {
        createLoginWindow();
      }
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
