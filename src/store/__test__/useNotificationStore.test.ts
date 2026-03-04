import { useGraphGenerationStore } from "@/store/useGraphGenerationStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useSettingsStore } from "@/store/useSettingsStore";

type NotificationEvent = {
  type:
    | "CONNECTED"
    | "GRAPH_GENERATION_REQUESTED"
    | "GRAPH_GENERATION_COMPLETED"
    | "GRAPH_GENERATION_FAILED"
    | "GRAPH_SUMMARY_COMPLETED"
    | "GRAPH_SUMMARY_FAILED"
    | "TEST_NOTIFICATION";
  payload: Record<string, unknown>;
  timestamp: string;
};

let eventSeq = 0;

const makeEvent = (
  type: NotificationEvent["type"],
  payload: Record<string, unknown> = {},
): NotificationEvent => ({
  type,
  payload,
  timestamp: new Date(Date.UTC(2026, 2, 2, 0, 0, 0, eventSeq++)).toISOString(),
});

describe("useNotificationStore", () => {
  const setBadge = jest.fn();
  const showNative = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    eventSeq = 0;

    (window as any).notification = {
      setBadge,
      showNative,
    };

    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isConnected: false,
    });

    useGraphGenerationStore.setState({ isGenerating: false });
    useSettingsStore.setState({ desktopNotification: true });
  });

  test("CONNECTED 이벤트는 연결 상태만 갱신하고 알림 목록에는 추가하지 않음", () => {
    useNotificationStore.getState().addNotification(makeEvent("CONNECTED"));

    const state = useNotificationStore.getState();
    expect(state.isConnected).toBe(true);
    expect(state.notifications).toHaveLength(0);
    expect(state.unreadCount).toBe(0);
    expect(setBadge).not.toHaveBeenCalled();
    expect(showNative).not.toHaveBeenCalled();
  });

  test("GRAPH_GENERATION_REQUESTED 이벤트 수신 시 isGenerating=true로 전환", () => {
    useNotificationStore
      .getState()
      .addNotification(makeEvent("GRAPH_GENERATION_REQUESTED"));

    expect(useGraphGenerationStore.getState().isGenerating).toBe(true);
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
    expect(setBadge).toHaveBeenCalledWith(1);
    expect(showNative).toHaveBeenCalledTimes(1);
  });

  test("GRAPH_GENERATION_COMPLETED/FAILED 이벤트 수신 시 isGenerating=false로 전환", () => {
    useGraphGenerationStore.getState().setGenerating(true);

    useNotificationStore.getState().addNotification(
      makeEvent("GRAPH_GENERATION_COMPLETED", {
        nodeCount: 10,
        edgeCount: 25,
      }),
    );
    expect(useGraphGenerationStore.getState().isGenerating).toBe(false);

    useGraphGenerationStore.getState().setGenerating(true);
    useNotificationStore.getState().addNotification(
      makeEvent("GRAPH_GENERATION_FAILED", {
        error: "timeout",
      }),
    );
    expect(useGraphGenerationStore.getState().isGenerating).toBe(false);
  });

  test("desktopNotification=false이면 네이티브 알림은 건너뛰고 뱃지는 갱신", () => {
    useSettingsStore.setState({ desktopNotification: false });

    useNotificationStore
      .getState()
      .addNotification(makeEvent("GRAPH_SUMMARY_COMPLETED"));

    expect(useNotificationStore.getState().unreadCount).toBe(1);
    expect(setBadge).toHaveBeenCalledWith(1);
    expect(showNative).not.toHaveBeenCalled();
  });

  test("markAsRead, markAllAsRead, clearNotifications는 unreadCount와 badge를 동기화", () => {
    useNotificationStore
      .getState()
      .addNotification(makeEvent("TEST_NOTIFICATION", { message: "a" }));
    useNotificationStore
      .getState()
      .addNotification(makeEvent("TEST_NOTIFICATION", { message: "b" }));

    const [first] = useNotificationStore.getState().notifications;
    useNotificationStore.getState().markAsRead(first.id);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
    expect(setBadge).toHaveBeenCalledWith(1);

    useNotificationStore.getState().markAllAsRead();
    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(setBadge).toHaveBeenCalledWith(0);

    useNotificationStore.getState().clearNotifications();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(setBadge).toHaveBeenCalledWith(0);
  });
});
