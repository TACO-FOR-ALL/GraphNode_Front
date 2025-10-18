import { contextBridge, ipcRenderer } from "electron";

// 윈도우 최소화, 최대화, 종료
export default function exposeWindowBridge() {
  contextBridge.exposeInMainWorld("windowAPI", {
    minimize: () => ipcRenderer.send("window:minimize"),
    maximize: () => ipcRenderer.send("window:maximize"),
    close: () => ipcRenderer.send("window:close"),
  });
}
