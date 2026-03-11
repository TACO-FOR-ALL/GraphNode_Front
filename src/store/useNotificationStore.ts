import { create } from "zustand";
import i18n from "@/i18n";
import type {
  NotificationEvent,
  NotificationType,
} from "@/managers/notificationClient";
import { useSettingsStore } from "./useSettingsStore";
import { useGraphGenerationStore } from "./useGraphGenerationStore";
import { playSound } from "@/utils/sound";

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

    // 그래프 생성 상태 업데이트
    if (event.type === "GRAPH_GENERATION_REQUESTED") {
      useGraphGenerationStore.getState().setGenerating(true);
    }

    if (
      event.type === "GRAPH_GENERATION_COMPLETED" ||
      event.type === "GRAPH_GENERATION_FAILED"
    ) {
      useGraphGenerationStore.getState().setGenerating(false);
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

    // 알림음 재생
    playSound("notification");

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

function getNotificationContent(notification: Notification): {
  title: string;
  body: string;
} {
  const t = i18n.t.bind(i18n);

  switch (notification.type) {
    case "GRAPH_GENERATION_REQUESTED":
      return {
        title: t("notification.graphGeneration.requestedTitle", "Graph Generation Started"),
        body: t("notification.graphGeneration.requestedBody", "Graph generation has started. Please wait."),
      };
    case "GRAPH_GENERATION_COMPLETED":
      return {
        title: t("notification.graphGeneration.completedTitle", "Graph Generation Complete"),
        body: t("notification.graphGeneration.completedBody", {
          defaultValue: "Graph has been successfully generated. (Nodes: {{nodeCount}}, Edges: {{edgeCount}})",
          nodeCount: notification.payload.nodeCount,
          edgeCount: notification.payload.edgeCount,
        }),
      };
    case "GRAPH_GENERATION_FAILED":
      return {
        title: t("notification.graphGenerationFailed.title", "Graph Generation Failed"),
        body: t("notification.graphGenerationFailed.body", {
          defaultValue: "Failed to generate graph: {{error}}",
          error: notification.payload.error,
        }),
      };
    case "GRAPH_SUMMARY_COMPLETED":
      return {
        title: t("notification.graphSummary.completedTitle", "Graph Summary Complete"),
        body: t("notification.graphSummary.completedBody", "Graph summary has been completed."),
      };
    case "GRAPH_SUMMARY_FAILED":
      return {
        title: t("notification.graphSummaryFailed.title", "Graph Summary Failed"),
        body: t("notification.graphSummaryFailed.body", {
          defaultValue: "Failed to generate graph summary: {{error}}",
          error: notification.payload.error,
        }),
      };
    case "TEST_NOTIFICATION":
      return {
        title: t("notification.test.title", "Test Notification"),
        body: (notification.payload.message as string) || t("notification.test.body", "Test notification received."),
      };
    default:
      return {
        title: t("notification.default.title", "Notification"),
        body: t("notification.default.body", "You have a new notification."),
      };
  }
}
