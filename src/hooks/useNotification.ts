import { useEffect } from "react";
import {
  notificationClient,
  type NotificationEvent,
} from "@/managers/notificationClient";
import { useNotificationStore } from "@/store/useNotificationStore";

export function useNotificationConnection() {
  const addNotification = useNotificationStore(
    (state) => state.addNotification,
  );
  const setConnected = useNotificationStore((state) => state.setConnected);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isCancelled = false; // cleanup 플래그 (StrictMode 대응)

    const initConnection = async () => {
      try {
        // SSE 연결
        notificationClient.connect();

        // 알림 수신 리스너 등록
        unsubscribe = notificationClient.subscribe(
          (event: NotificationEvent) => {
            if (event.type === "CONNECTED") {
              setConnected(true);
              console.log("[Notification] Connected to SSE");
            } else {
              addNotification(event);
            }
          },
        );

        // 권한 요청 (데스크톱 알림)
        if (Notification.permission === "default") {
          Notification.requestPermission();
        }
      } catch (err) {
        console.error("[Notification] Failed to init connection:", err);
      }
    };

    initConnection();

    return () => {
      isCancelled = true; // async 작업 취소
      unsubscribe?.();
      notificationClient.disconnect();
      setConnected(false);
    };
  }, [addNotification, setConnected]);
}
