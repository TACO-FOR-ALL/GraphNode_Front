import { ipcRenderer } from "electron";
import { contextBridge } from "electron";

export default function exposeFileBridge() {
  contextBridge.exposeInMainWorld("fileAPI", {
    readFileStream: (absPath: string, id: string) => {
      ipcRenderer.send("file:read-start", { id, absPath });
    },
    onReadProgress: (
      cb: (payload: { id: string; percent: number }) => void
    ) => {
      const handler = (_: any, payload: { id: string; percent: number }) =>
        cb(payload); // 핸들러 래핑
      ipcRenderer.on("file:read-progress", handler); // 구독
      return () => ipcRenderer.removeListener("file:read-progress", handler); // 구독 해제
    },
    onReadComplete: (cb: (payload: { id: string; text: string }) => void) => {
      const handler = (_: any, payload: { id: string; text: string }) =>
        cb(payload);
      ipcRenderer.on("file:read-complete", handler);
      return () => ipcRenderer.removeListener("file:read-complete", handler);
    },
    onReadError: (cb: (payload: { id: string; message: string }) => void) => {
      const handler = (_: any, payload: { id: string; message: string }) =>
        cb(payload);
      ipcRenderer.on("file:read-error", handler);
      return () => ipcRenderer.removeListener("file:read-error", handler);
    },
  });
}
