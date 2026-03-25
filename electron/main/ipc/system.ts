import { app, ipcMain, shell } from "electron";
import { loadSettings, saveSettings, AppSettings } from "../settings";
import fs from "fs";
import os from "os";
import path from "path";

export default function systemIPC() {
  ipcMain.handle("system:getLocale", () => app.getLocale());
  ipcMain.handle("system:openExternal", (_, url: string) =>
    shell.openExternal(url),
  );

  // 설정 관련 IPC
  ipcMain.handle("system:getSettings", () => loadSettings());
  ipcMain.handle("system:saveSettings", (_, settings: Partial<AppSettings>) =>
    saveSettings(settings),
  );
  ipcMain.handle("system:restartApp", () => {
    app.relaunch();
    app.exit(0);
  });

  // 권한 관련 IPC (Full Disk Access 권한이 있는지 확인해서 "granted" 또는 "denied" 반환)
  ipcMain.handle("permission:checkFullDiskAccess", (): "granted" | "denied" => {
    //  Windows/Linux는 FDA 개념이 없으므로 항상 허용으로 처리
    if (process.platform !== "darwin") return "granted";
    try {
      // TCC.db는 전체 디스크 접근 권한 없이는 읽을 수 없음 (macOS는 앱별 권한을 TCC.db라는 SQLite 파일에 저장)
      fs.accessSync(
        path.join(
          os.homedir(),
          "Library",
          "Application Support",
          "com.apple.TCC",
          "TCC.db",
        ),
        fs.constants.R_OK,
      );
      return "granted";
    } catch {
      return "denied";
    }
  });

  // 시스템 설정 앱의 특정 페이지를 바로 열기
  ipcMain.handle(
    "permission:openSystemSettings",
    (_, type: "notifications" | "fullDiskAccess") => {
      // macOS 전용 URL 스킴이라 다른 플랫폼에서는 아무것도 안 함
      if (process.platform !== "darwin") return;
      // macOS가 제공하는 딥링크 URL 스킴 사용
      const urls: Record<string, string> = {
        notifications:
          "x-apple.systempreferences:com.apple.preference.notifications",
        fullDiskAccess:
          "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
      };
      shell.openExternal(urls[type]);
    },
  );
}
