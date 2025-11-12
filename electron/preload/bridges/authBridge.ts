import { contextBridge, ipcRenderer } from "electron";

export default function exposeAuthBridge() {
  contextBridge.exposeInMainWorld("authAPI", {
    startAppleOAuth: () => ipcRenderer.invoke("auth:start-apple"),
    startGoogleOAuth: () => ipcRenderer.invoke("auth:start-google"),
    // 테스트용
    completeFakeLogin: () => ipcRenderer.invoke("auth:login-success"),
  });
}
