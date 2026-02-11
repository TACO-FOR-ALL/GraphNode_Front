import { contextBridge, ipcRenderer } from "electron";

export interface NativeNotificationOptions {
  title: string;
  body: string;
  silent?: boolean;
}

export default function exposeNotificationBridge() {
  contextBridge.exposeInMainWorld("notification", {
    // 1. 서비스 시작 (Sender ID 전달)
    start: (senderId: string) => {
      ipcRenderer.send("NOTIFICATION_SERVICE_STARTED", senderId);
    },

    // 2. 토큰 받았을 때 실행할 콜백 등록
    onToken: (callback: (token: string) => void) => {
      // 리스너가 중복 등록되지 않도록 기존 것 제거 후 등록 (선택사항)
      ipcRenderer.removeAllListeners("NOTIFICATION_SERVICE_TOKEN");
      ipcRenderer.on("NOTIFICATION_SERVICE_TOKEN", (_event, token) =>
        callback(token),
      );
    },

    // 3. 알림 왔을 때 실행할 콜백 등록
    onReceive: (callback: (notification: any) => void) => {
      ipcRenderer.removeAllListeners("NOTIFICATION_RECEIVED");
      ipcRenderer.on("NOTIFICATION_RECEIVED", (_event, notification) =>
        callback(notification),
      );
    },

    // 4. 에러 발생 시 콜백 등록
    onError: (callback: (error: any) => void) => {
      ipcRenderer.removeAllListeners("NOTIFICATION_SERVICE_ERROR");
      ipcRenderer.on("NOTIFICATION_SERVICE_ERROR", (_event, error) =>
        callback(error),
      );
    },

    // 5. 알람 클릭 시 앱 활성화
    activateWindow: () => {
      ipcRenderer.send("NOTIFICATION_CLICKED_FOCUS");
    },

    // 6. 앱 아이콘 뱃지 설정
    setBadge: (count: number) => {
      ipcRenderer.send("SET_BADGE_COUNT", count);
    },

    // 7. 네이티브 알림 표시 (Windows/Mac)
    showNative: (options: NativeNotificationOptions) => {
      ipcRenderer.send("SHOW_NATIVE_NOTIFICATION", options);
    },
  });
}
