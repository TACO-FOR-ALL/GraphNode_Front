import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ipc from "./ipc";
import { config, isAllowedOrigin } from "./config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let loginWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

// 로그인/메인 창에 렌더링할 URL 반환
function resolveRendererUrl(hash = "") {
  // 개발 모드: 개발 서버 URL 반환 http://localhost:5173/#/login
  if (!app.isPackaged) {
    return `${process.env.VITE_DEV_SERVER_URL!}${hash}`;
  }

  // 배포 모드: 원격 서버 URL 반환
  const baseUrl = config.remoteUrl;
  return `${baseUrl}${hash}`;
}

// 스플래시 창 HTML 생성
function getSplashHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: ${config.splash.backgroundColor};
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .status {
          margin-top: 20px;
          font-size: 14px;
          color: rgba(255,255,255,0.6);
        }
        .error {
          color: #ff6b6b;
          text-align: center;
          padding: 20px;
        }
        .error-title {
          font-size: 18px;
          margin-bottom: 10px;
        }
        .error-message {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          max-width: 300px;
        }
        .retry-btn {
          margin-top: 20px;
          padding: 10px 30px;
          background: #667eea;
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .retry-btn:hover {
          background: #5a6fd6;
        }
      </style>
    </head>
    <body>
      <div class="logo">GraphNode</div>
      <div class="spinner" id="spinner"></div>
      <div class="status" id="status">서버에 연결 중...</div>
    </body>
    </html>
  `;
}

// 에러 표시 HTML 생성
function getErrorHtml(errorMessage: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background: ${config.splash.backgroundColor};
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 30px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .error {
          color: #ff6b6b;
          text-align: center;
          padding: 20px;
        }
        .error-title {
          font-size: 18px;
          margin-bottom: 10px;
        }
        .error-message {
          font-size: 13px;
          color: rgba(255,255,255,0.5);
          max-width: 300px;
          word-break: break-word;
        }
        .retry-btn {
          margin-top: 20px;
          padding: 10px 30px;
          background: #667eea;
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .retry-btn:hover {
          background: #5a6fd6;
        }
      </style>
    </head>
    <body>
      <div class="logo">GraphNode</div>
      <div class="error">
        <div class="error-title">연결 실패</div>
        <div class="error-message">${errorMessage}</div>
      </div>
      <button class="retry-btn" onclick="location.reload()">다시 시도</button>
    </body>
    </html>
  `;
}

// 스플래시 창 생성
function createSplashWindow(): BrowserWindow {
  const splash = new BrowserWindow({
    width: config.splash.width,
    height: config.splash.height,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splash.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(getSplashHtml())}`
  );

  return splash;
}

// 스플래시 창에 에러 표시
function showSplashError(errorMessage: string) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(getErrorHtml(errorMessage))}`
    );
  }
}

// 스플래시 창 닫기
function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

function registerAuthHandlers() {
  // ipcMain.on(): "auth-success"라는 이벤트를 수신 및 이벤트 수신 시 처리하는 핸들러 등록
  ipcMain.on("auth-success", () => {
    if (loginWindow) {
      loginWindow.close();
      loginWindow = null;
    }

    if (!mainWindow) {
      createMainWindow();
    } else {
      mainWindow.focus();
    }
  });

  ipcMain.on("auth-show-login", () => {
    if (!loginWindow) {
      createLoginWindow();
    }
    if (loginWindow && !loginWindow.isVisible()) {
      loginWindow.show();
      loginWindow.focus();
    }
  });

  ipcMain.on("auth-logout", () => {
    if (mainWindow) {
      mainWindow.close();
      mainWindow = null;
    }

    if (!loginWindow) {
      createLoginWindow();
    }
    if (loginWindow && !loginWindow.isVisible()) {
      loginWindow.show();
      loginWindow.focus();
    }
  });
}

function createLoginWindow() {
  if (loginWindow) {
    loginWindow.focus();
    return;
  }

  // 배포 모드에서 스플래시 표시
  if (app.isPackaged) {
    splashWindow = createSplashWindow();
  }

  loginWindow = new BrowserWindow({
    width: 290,
    height: 430,
    frame: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // @ts-ignore
      // 리얼 브라우저 허용
      nativeWindowOpen: true,
    },
  });

  // 팝업(window.open()) 허용 설정 - 도메인 검증 추가
  loginWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 개발 모드에서는 모두 허용
    if (!app.isPackaged) {
      return { action: "allow" };
    }
    // 배포 모드에서는 허용된 도메인만 허용
    if (isAllowedOrigin(url)) {
      return { action: "allow" };
    }
    return { action: "deny" };
  });

  loginWindow.removeMenu();

  const loginUrl = resolveRendererUrl("#/login");

  // 배포 모드: 타임아웃 및 에러 핸들링
  if (app.isPackaged) {
    const timeoutId = setTimeout(() => {
      showSplashError("서버 연결 시간이 초과되었습니다.");
    }, config.connectionTimeout);

    loginWindow.webContents.on("did-finish-load", () => {
      clearTimeout(timeoutId);
      closeSplashWindow();
      loginWindow?.show();
    });

    loginWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
      clearTimeout(timeoutId);
      console.error(`Login window load failed: ${errorCode} - ${errorDescription}`);
      showSplashError(`서버에 연결할 수 없습니다.\n(${errorDescription})`);
    });
  }

  loginWindow.loadURL(loginUrl);

  // 개발 모드에서는 바로 표시
  if (!app.isPackaged) {
    loginWindow.once("ready-to-show", () => {
      loginWindow?.show();
    });
  }

  loginWindow.on("closed", () => {
    loginWindow = null;
  });
}

function createMainWindow() {
  if (mainWindow) {
    mainWindow.focus();
    return;
  }

  // 배포 모드에서 스플래시 표시
  if (app.isPackaged) {
    splashWindow = createSplashWindow();
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1008,
    frame: false,
    transparent: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 드래그한 파일 및 네비게이션 보안 검증
  mainWindow.webContents.on("will-navigate", (event, url) => {
    // 개발 모드에서는 기본 동작 유지 (모두 차단)
    if (!app.isPackaged) {
      event.preventDefault();
      return;
    }
    // 배포 모드에서는 허용된 도메인만 허용
    if (!isAllowedOrigin(url)) {
      event.preventDefault();
    }
  });

  // 드래그한 파일이 새 창/탭 열리는 것 방지 - 도메인 검증 추가
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

    // 배포 모드에서 허용된 도메인 검증
    if (app.isPackaged && isAllowedOrigin(url)) {
      return { action: "allow" };
    }

    // 나머지는 다 차단
    return { action: "deny" };
  });

  const mainUrl = resolveRendererUrl();

  if (!app.isPackaged) {
    // 개발 모드
    mainWindow.loadURL(mainUrl);
    mainWindow.webContents.openDevTools();
    mainWindow.once("ready-to-show", () => {
      mainWindow?.show();
    });
  } else {
    // 배포 모드: 타임아웃 및 에러 핸들링
    const timeoutId = setTimeout(() => {
      showSplashError("서버 연결 시간이 초과되었습니다.");
    }, config.connectionTimeout);

    mainWindow.webContents.on("did-finish-load", () => {
      clearTimeout(timeoutId);
      closeSplashWindow();
      mainWindow?.show();
    });

    mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
      clearTimeout(timeoutId);
      console.error(`Main window load failed: ${errorCode} - ${errorDescription}`);
      showSplashError(`서버에 연결할 수 없습니다.\n(${errorDescription})`);
    });

    mainWindow.loadURL(mainUrl);
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
