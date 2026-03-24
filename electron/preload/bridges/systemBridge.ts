import { contextBridge, ipcRenderer } from "electron";

export interface AppSettings {
  hardwareAcceleration: boolean;
  desktopNotification: boolean;
}

export default function exposeSystemBridge() {
  contextBridge.exposeInMainWorld("systemAPI", {
    getLocale: () => ipcRenderer.invoke("system:getLocale"),
    openExternal: (url: string) => ipcRenderer.invoke("system:openExternal", url),
    getSettings: (): Promise<AppSettings> => ipcRenderer.invoke("system:getSettings"),
    saveSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke("system:saveSettings", settings),
    restartApp: () => ipcRenderer.invoke("system:restartApp"),
    checkFullDiskAccess: (): Promise<"granted" | "denied"> =>
      ipcRenderer.invoke("permission:checkFullDiskAccess"),
    openSystemSettings: (type: "notifications" | "fullDiskAccess"): Promise<void> =>
      ipcRenderer.invoke("permission:openSystemSettings", type),
  });
}
