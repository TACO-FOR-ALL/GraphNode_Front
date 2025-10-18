import { contextBridge } from "electron";
import { ipcRenderer } from "electron";

// OpenAI API 키 유효성 체크
export default function exposeOpenaiBridge() {
  contextBridge.exposeInMainWorld("openaiAPI", {
    checkAPIKeyValid: (apiKey: string) =>
      ipcRenderer.invoke("openai:checkAPIKeyValid", apiKey),
  });
}
