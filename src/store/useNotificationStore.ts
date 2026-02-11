import { create } from "zustand";
import type {
  NotificationEvent,
  NotificationType,
} from "@/managers/notificationClient";
import { useSettingsStore } from "./useSettingsStore";

export interface Notification {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  timestamp: string;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;

  addNotification: (event: NotificationEvent) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  setConnected: (connected: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isConnected: false,

  addNotification: (event) => {
    // CONNECTED 타입은 알림 목록에 추가하지 않음 (notificationClient.ts의 NotificationType 참고)
    if (event.type === "CONNECTED") {
      set({ isConnected: true });
      return;
    }

    const notification: Notification = {
      id: `${event.type}-${event.timestamp}-${Date.now()}`,
      type: event.type,
      payload: event.payload,
      timestamp: event.timestamp,
      read: false,
    };

    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50), // 최대 50개 유지
      unreadCount: state.unreadCount + 1,
    }));

    // 데스크톱 알림 표시
    showDesktopNotification(notification);
  },

  markAsRead: (id) => {
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      const unreadCount = notifications.filter((n) => !n.read).length;
      // 뱃지 업데이트
      window.notification?.setBadge(unreadCount);
      return { notifications, unreadCount };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    // 뱃지 초기화
    window.notification?.setBadge(0);
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
    // 뱃지 초기화
    window.notification?.setBadge(0);
  },

  setConnected: (connected) => {
    set({ isConnected: connected });
  },
}));

function showDesktopNotification(notification: Notification) {
  // 뱃지 업데이트
  const unreadCount = useNotificationStore.getState().unreadCount;
  window.notification?.setBadge(unreadCount);

  // 설정에서 데스크톱 알림이 비활성화되어 있으면 표시하지 않음
  const { desktopNotification } = useSettingsStore.getState();
  if (!desktopNotification) return;

  const { title, body } = getNotificationContent(notification);

  window.notification?.showNative({ title, body });
}

// TODO: 나중에 실제 알림 내용에 따라서 title, body 설정 및 번역 파일 추가하기
function getNotificationContent(notification: Notification): {
  title: string;
  body: string;
} {
  switch (notification.type) {
    case "GRAPH_GENERATION_COMPLETED":
      return {
        title: "그래프 생성 완료",
        body: `그래프가 성공적으로 생성되었습니다. (노드: ${notification.payload.nodeCount}, 엣지: ${notification.payload.edgeCount})`,
      };
    case "GRAPH_GENERATION_FAILED":
      return {
        title: "그래프 생성 실패",
        body: `그래프 생성에 실패했습니다: ${notification.payload.error}`,
      };
    case "GRAPH_SUMMARY_COMPLETED":
      return {
        title: "그래프 요약 완료",
        body: "그래프 요약이 완료되었습니다.",
      };
    case "GRAPH_SUMMARY_FAILED":
      return {
        title: "그래프 요약 실패",
        body: `그래프 요약에 실패했습니다: ${notification.payload.error}`,
      };
    default:
      return {
        title: "알림",
        body: "새로운 알림이 도착했습니다.",
      };
  }
}
