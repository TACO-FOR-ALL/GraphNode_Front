import { ipcMain } from "electron";
import { sendMainSmokeTest } from "../sentry";

export default function sentryIPC() {
  ipcMain.handle("sentry:smokeTestMain", async () => {
    return sendMainSmokeTest();
  });
}
