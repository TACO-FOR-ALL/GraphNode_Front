import { ipcRenderer } from "electron";
import { contextBridge } from "electron";
import { Me } from "@/types/Me";

// Keytar API 키 관리
export default function exposeKeytarBridge() {
  contextBridge.exposeInMainWorld("keytarAPI", {
    getAPIKey: (modelName: string) =>
      ipcRenderer.invoke("keytar:getAPIKey", modelName),
    setAPIKey: (modelName: string, apiKey: string) =>
      ipcRenderer.invoke("keytar:setAPIKey", modelName, apiKey),
    deleteAPIKey: (modelName: string) =>
      ipcRenderer.invoke("keytar:deleteAPIKey", modelName),
    getMe: () => ipcRenderer.invoke("keytar:getMe"),
    setMe: (me: Me) => ipcRenderer.invoke("keytar:setMe", me),
    deleteMe: () => ipcRenderer.invoke("keytar:deleteMe"),
  });
}
