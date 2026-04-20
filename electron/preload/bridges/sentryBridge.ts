import { contextBridge, ipcRenderer } from "electron";
import { sendPreloadSmokeTest } from "../sentry";

export default function exposeSentryBridge() {
  contextBridge.exposeInMainWorld("sentryAPI", {
    smokeTestPreload: async () => sendPreloadSmokeTest(),
    smokeTestMain: async () => ipcRenderer.invoke("sentry:smokeTestMain"),
  });
}
