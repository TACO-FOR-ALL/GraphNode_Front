import { ChatMessageRequest } from "@/types/Chat";
import { contextBridge } from "electron";
import { ipcRenderer } from "electron";

export default function exposeOpenaiBridge() {
  contextBridge.exposeInMainWorld("openaiAPI", {
    checkAPIKeyValid: (apiKey: string) =>
      ipcRenderer.invoke("openai:checkAPIKeyValid", apiKey),
    request: (
      apiKey: string,
      stream: boolean,
      model: string,
      messages: ChatMessageRequest[]
    ) => ipcRenderer.invoke("openai:request", apiKey, stream, model, messages),
    requestGenerateThreadTitle: (
      apiKey: string,
      firstUserMessage: string,
      opts?: { timeoutMs?: number }
    ) =>
      ipcRenderer.invoke(
        "openai:requestGenerateThreadTitle",
        apiKey,
        firstUserMessage,
        opts
      ),
  });
}
