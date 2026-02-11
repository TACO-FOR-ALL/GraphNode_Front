import {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  Notification,
} from "electron";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import ipc from "./ipc";
import { config, isAllowedOrigin } from "./config";

// CommonJS 모듈을 ES module에서 로드 (import 사용하면 npm run dist에서 오류 발생 함)
const require = createRequire(import.meta.url);

// 앱 시작 전에 하드웨어 가속 설정 적용 (app.whenReady() 전에 호출해야 함)
function applyHardwareAccelerationSetting() {
  try {
    // app.getPath는 ready 전에도 일부 경로 사용 가능
    const userDataPath = app.getPath("userData");
    const settingsPath = path.join(userDataPath, "settings.json");

    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, "utf-8");
      const settings = JSON.parse(data);

      if (settings.hardwareAcceleration === false) {
        app.disableHardwareAcceleration();
        console.log("Hardware acceleration disabled by user setting");
      }
    }
  } catch (error) {
    console.error("Failed to apply hardware acceleration setting:", error);
  }
}

// 앱 시작 전에 설정 적용
applyHardwareAccelerationSetting();

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

  // 배포 모드: 원격 서버 URL 반환 (디스코드처럼 웹 업데이트 시 앱도 자동 업데이트)
  const baseUrl = config.remoteUrl;
  return `${baseUrl}${hash}`;
}

// 테마 색상 정의
function getThemeColors() {
  const isDark = nativeTheme.shouldUseDarkColors;
  return {
    background: isDark ? "#1a1a2e" : "#ffffff",
    text: isDark ? "#ffffff" : "#1a1a2e",
    textSecondary: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
    spinnerTrack: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    primary: "#667eea",
    primaryHover: "#5a6fd6",
    error: "#ff6b6b",
  };
}

// 스플래시 다국어 지원
type SupportedLocale = "ko" | "en" | "zh";

const splashTexts: Record<
  SupportedLocale,
  {
    connecting: string;
    connectionFailed: string;
    retry: string;
    timeout: string;
    cannotConnect: string;
  }
> = {
  ko: {
    connecting: "서버에 연결 중...",
    connectionFailed: "연결 실패",
    retry: "다시 시도",
    timeout: "서버 연결 시간이 초과되었습니다.",
    cannotConnect: "서버에 연결할 수 없습니다.",
  },
  en: {
    connecting: "Connecting to server...",
    connectionFailed: "Connection Failed",
    retry: "Retry",
    timeout: "Server connection timed out.",
    cannotConnect: "Unable to connect to server.",
  },
  zh: {
    connecting: "正在连接服务器...",
    connectionFailed: "连接失败",
    retry: "重试",
    timeout: "服务器连接超时。",
    cannotConnect: "无法连接服务器。",
  },
};

function getSplashLocale(): SupportedLocale {
  const locale = app.getLocale();
  const lang = locale.split("-")[0];

  if (lang === "ko") return "ko";
  if (lang === "zh") return "zh";
  return "en";
}

function getSplashTexts() {
  return splashTexts[getSplashLocale()];
}

// 스플래시 창 HTML 생성
function getSplashHtml(): string {
  const colors = getThemeColors();
  const texts = getSplashTexts();
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
          background: ${colors.background};
          color: ${colors.text};
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
          border: 3px solid ${colors.spinnerTrack};
          border-top-color: ${colors.primary};
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .status {
          margin-top: 20px;
          font-size: 14px;
          color: ${colors.textSecondary};
        }
        .error {
          color: ${colors.error};
          text-align: center;
          padding: 20px;
        }
        .error-title {
          font-size: 18px;
          margin-bottom: 10px;
        }
        .error-message {
          font-size: 13px;
          color: ${colors.textSecondary};
          max-width: 300px;
        }
        .retry-btn {
          margin-top: 20px;
          padding: 10px 30px;
          background: ${colors.primary};
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .retry-btn:hover {
          background: ${colors.primaryHover};
        }
      </style>
    </head>
    <body>
      <div class="logo">GraphNode</div>
      <div class="spinner" id="spinner"></div>
      <div class="status" id="status">${texts.connecting}</div>
    </body>
    </html>
  `;
}

// 에러 표시 HTML 생성
function getErrorHtml(errorMessage: string): string {
  const colors = getThemeColors();
  const texts = getSplashTexts();
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
          background: ${colors.background};
          color: ${colors.text};
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
          color: ${colors.error};
          text-align: center;
          padding: 20px;
        }
        .error-title {
          font-size: 18px;
          margin-bottom: 10px;
        }
        .error-message {
          font-size: 13px;
          color: ${colors.textSecondary};
          max-width: 300px;
          word-break: break-word;
        }
        .retry-btn {
          margin-top: 20px;
          padding: 10px 30px;
          background: ${colors.primary};
          border: none;
          border-radius: 6px;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .retry-btn:hover {
          background: ${colors.primaryHover};
        }
      </style>
    </head>
    <body>
      <div class="logo">GraphNode</div>
      <div class="error">
        <div class="error-title">${texts.connectionFailed}</div>
        <div class="error-message">${errorMessage}</div>
      </div>
      <button class="retry-btn" onclick="location.reload()">${texts.retry}</button>
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
    `data:text/html;charset=utf-8,${encodeURIComponent(getSplashHtml())}`,
  );

  return splash;
}

// 스플래시 창에 에러 표시
function showSplashError(errorMessage: string) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(getErrorHtml(errorMessage))}`,
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
    const texts = getSplashTexts();
    const timeoutId = setTimeout(() => {
      showSplashError(texts.timeout);
    }, config.connectionTimeout);

    loginWindow.webContents.on("did-finish-load", () => {
      clearTimeout(timeoutId);
      closeSplashWindow();
      loginWindow?.show();
    });

    loginWindow.webContents.on(
      "did-fail-load",
      (_event, errorCode, errorDescription) => {
        clearTimeout(timeoutId);
        console.error(
          `Login window load failed: ${errorCode} - ${errorDescription}`,
        );
        showSplashError(`${texts.cannotConnect}\n(${errorDescription})`);
      },
    );
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
    const texts = getSplashTexts();
    const timeoutId = setTimeout(() => {
      showSplashError(texts.timeout);
    }, config.connectionTimeout);

    mainWindow.webContents.on("did-finish-load", () => {
      clearTimeout(timeoutId);
      closeSplashWindow();
      mainWindow?.show();
    });

    mainWindow.webContents.on(
      "did-fail-load",
      (_event, errorCode, errorDescription) => {
        clearTimeout(timeoutId);
        console.error(
          `Main window load failed: ${errorCode} - ${errorDescription}`,
        );
        showSplashError(`${texts.cannotConnect}\n(${errorDescription})`);
      },
    );

    mainWindow.loadURL(mainUrl);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 알림 관련 IPC 핸들러 등록 (전역에서 한 번만 호출)
function registerNotificationHandlers() {
  ipcMain.on("NOTIFICATION_CLICKED_FOCUS", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.on("SET_BADGE_COUNT", (_event, count) => {
    if (process.platform === "darwin" && app.dock) {
      app.dock.setBadge(count > 0 ? count.toString() : "");
    } else {
      if (mainWindow && count > 0) {
        mainWindow.flashFrame(true);
      }
    }
  });

  // 네이티브 알림 표시
  ipcMain.on(
    "SHOW_NATIVE_NOTIFICATION",
    (_event, options: { title: string; body: string; silent?: boolean }) => {
      console.log("[Notification] Received request:", options);

      if (!Notification.isSupported()) {
        // TODO: 만약 가능성이 있다면 로직 처리 필요
        return;
      }

      const notification = new Notification({
        title: options.title,
        body: options.body,
        silent: options.silent ?? false,
      });

      notification.on("click", () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      });

      notification.show();
    },
  );
}

app.whenReady().then(() => {
  ipc();
  registerAuthHandlers();
  registerNotificationHandlers();
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
