import { app, ipcMain, shell } from "electron";
import { loadSettings, saveSettings, AppSettings } from "../settings";

export default function systemIPC() {
  ipcMain.handle("system:getLocale", () => app.getLocale());
  ipcMain.handle("system:openExternal", (_, url: string) =>
    shell.openExternal(url)
  );

  // 설정 관련 IPC
  ipcMain.handle("system:getSettings", () => loadSettings());
  ipcMain.handle("system:saveSettings", (_, settings: Partial<AppSettings>) =>
    saveSettings(settings)
  );
  ipcMain.handle("system:restartApp", () => {
    app.relaunch();
    app.exit(0);
  });
}
