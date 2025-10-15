import { contextBridge, ipcRenderer } from "electron";

// 윈도우 최소화, 최대화, 종료
contextBridge.exposeInMainWorld("windowAPI", {
  minimize: () => ipcRenderer.send("window:minimize"),
  maximize: () => ipcRenderer.send("window:maximize"),
  close: () => ipcRenderer.send("window:close"),
});

// 시스템 언어 가져오기
contextBridge.exposeInMainWorld("systemAPI", {
  getLocale: () => ipcRenderer.invoke("system:getLocale"),
});
