import { contextBridge, ipcRenderer } from "electron";

// 윈도우 최소화, 최대화, 종료
export default function exposeWindowBridge() {
  contextBridge.exposeInMainWorld("windowAPI", {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
  });
  contextBridge.exposeInMainWorld("electron", {
    // ipcRenderer.send(): contextBridge.exposeInMainWorld()를 통해 브라우저에 안전한 API 노출 (preload가 브릿지)
    send: (channel: string, ...args: any[]) =>
      ipcRenderer.send(channel, ...args),
  });
}
