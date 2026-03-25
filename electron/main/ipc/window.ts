import { BrowserWindow, ipcMain } from "electron";

// 윈도우 최소화, 최대화, 종료
export default function widowIPC() {
  ipcMain.on("window:minimize", () =>
    BrowserWindow.getFocusedWindow()?.minimize()
  );
  ipcMain.on("window:maximize", () => {
    const w = BrowserWindow.getFocusedWindow();
    if (!w) return;
    if (process.platform === "darwin") {
      w.setFullScreen(!w.isFullScreen());
    } else {
      w.isMaximized() ? w.unmaximize() : w.maximize();
    }
  });
  ipcMain.on("window:close", () => BrowserWindow.getFocusedWindow()?.close());
}
