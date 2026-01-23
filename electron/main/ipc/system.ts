import { app, ipcMain, shell } from "electron";

// 시스템 언어 가져오기
export default function systemIPC() {
  ipcMain.handle("system:getLocale", () => app.getLocale());
  ipcMain.handle("system:openExternal", (_, url: string) =>
    shell.openExternal(url)
  );
}
