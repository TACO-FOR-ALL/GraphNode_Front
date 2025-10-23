import { ChatMessageRequest } from "@/types/Chat";
import { ipcMain } from "electron";
import openai from "../../../src/services/openai";

// 메인 프로세스에서 OpenAI 호출 (OpenAI SDK에서 브라우저/렌더러에서 직접 호출 금지)
export default function openaiIPC() {
  ipcMain.handle("openai:checkAPIKeyValid", async (_event, apiKey: string) => {
    return await openai.checkAPIKeyValid(apiKey);
  });
  ipcMain.handle(
    "openai:request",
    async (
      _event,
      apiKey: string,
      stream: boolean,
      model: string,
      messages: ChatMessageRequest[]
    ) => {
      return await openai.request(apiKey, stream, model, messages);
    }
  );
  ipcMain.handle(
    "openai:requestGenerateThreadTitle",
    async (
      _event,
      apiKey: string,
      firstUserMessage: string,
      opts?: { timeoutMs?: number }
    ) => {
      return await openai.requestGenerateThreadTitle(
        apiKey,
        firstUserMessage,
        opts
      );
    }
  );
}
