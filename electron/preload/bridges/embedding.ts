import { contextBridge, ipcRenderer } from "electron";

export default function exposeEmbeddingBridge() {
  contextBridge.exposeInMainWorld("embedAPI", {
    texts: (arr: string[]) => ipcRenderer.invoke("embed:texts", arr),
  });
}
