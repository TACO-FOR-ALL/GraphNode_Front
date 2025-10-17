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

// OpenAI API 키 유효성 체크
contextBridge.exposeInMainWorld("openaiAPI", {
  checkAPIKeyValid: (apiKey: string) =>
    ipcRenderer.invoke("openai:checkAPIKeyValid", apiKey),
});

// Keytar API 키 관리
contextBridge.exposeInMainWorld("keytarAPI", {
  getAPIKey: (modelName: string) =>
    ipcRenderer.invoke("keytar:getAPIKey", modelName),
  setAPIKey: (modelName: string, apiKey: string) =>
    ipcRenderer.invoke("keytar:setAPIKey", modelName, apiKey),
});
