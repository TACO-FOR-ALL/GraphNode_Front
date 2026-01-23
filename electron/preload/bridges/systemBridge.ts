import { contextBridge, ipcRenderer } from "electron";

// 시스템 언어 가져오기
export default function exposeSystemBridge() {
  contextBridge.exposeInMainWorld("systemAPI", {
    getLocale: () => ipcRenderer.invoke("system:getLocale"),
    openExternal: (url: string) => ipcRenderer.invoke("system:openExternal", url),
  });
}
