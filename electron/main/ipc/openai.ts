import checkAPIKeyValid from "../../../src/utils/openAIRequest";
import { ipcMain } from "electron";

// 메인 프로세스에서 OpenAI 호출 (OpenAI SDK에서 브라우저/렌더러에서 직접 호출 금지)
export default function openaiIPC() {
  ipcMain.handle("openai:checkAPIKeyValid", async (_event, apiKey: string) => {
    return await checkAPIKeyValid(apiKey);
  });
}
