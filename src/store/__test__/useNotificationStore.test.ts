import { queryClient } from "@/queryClient";
import { useGraphGenerationStore } from "@/store/useGraphGenerationStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useSettingsStore } from "@/store/useSettingsStore";

jest.mock("@/utils/sound", () => ({
  playSound: jest.fn(),
}));

type NotificationEvent = {
  type:
    | "CONNECTED"
    | "GRAPH_GENERATION_REQUESTED"
    | "GRAPH_GENERATION_REQUEST_FAILED"
    | "GRAPH_GENERATION_PROGRESS_UPDATED"
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
  const browserNotification = jest.fn();
  const originalNotification = global.Notification;
  const invalidateQueries = jest
    .spyOn(queryClient, "invalidateQueries")
    .mockResolvedValue(undefined);

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

    useGraphGenerationStore.setState({
      isGenerating: false,
      progress: {
        taskId: null,
        currentStage: null,
        progressPercent: 0,
        etaSeconds: null,
        lastUpdatedAt: null,
      },
      lastTerminalTaskId: null,
      lastTerminalTimestamp: null,
    });
    useSettingsStore.setState({ desktopNotification: true });

    Object.defineProperty(browserNotification, "permission", {
      value: "granted",
      configurable: true,
    });
    Object.defineProperty(global, "Notification", {
      value: browserNotification,
      configurable: true,
      writable: true,
    });
  });

  afterAll(() => {
    invalidateQueries.mockRestore();

    Object.defineProperty(global, "Notification", {
      value: originalNotification,
      configurable: true,
      writable: true,
    });
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
      .addNotification(
        makeEvent("GRAPH_GENERATION_REQUESTED", {
          taskId: "task-1",
        }),
      );

    expect(useGraphGenerationStore.getState().isGenerating).toBe(true);
    expect(useGraphGenerationStore.getState().progress.taskId).toBe("task-1");
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
    expect(setBadge).toHaveBeenCalledWith(1);
    expect(showNative).toHaveBeenCalledTimes(1);
  });

  test("GRAPH_GENERATION_PROGRESS_UPDATED 이벤트는 진행 상태만 갱신하고 알림 목록에는 쌓지 않음", () => {
    useNotificationStore.getState().addNotification(
      makeEvent("GRAPH_GENERATION_PROGRESS_UPDATED", {
        taskId: "task-1",
        currentStage: "[2단계] 키워드 추출 중",
        progressPercent: 42,
        etaSeconds: 180,
      }),
    );

    const { isGenerating, progress } = useGraphGenerationStore.getState();
    expect(isGenerating).toBe(true);
    expect(progress).toEqual({
      taskId: "task-1",
      currentStage: "[2단계] 키워드 추출 중",
      progressPercent: 42,
      etaSeconds: 180,
      lastUpdatedAt: "2026-03-02T00:00:00.000Z",
    });
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
    expect(setBadge).not.toHaveBeenCalled();
    expect(showNative).not.toHaveBeenCalled();
  });

  test("오래된 GRAPH_GENERATION_PROGRESS_UPDATED 이벤트는 무시됨", () => {
    useNotificationStore.getState().addNotification(
      makeEvent("GRAPH_GENERATION_PROGRESS_UPDATED", {
        taskId: "task-1",
        currentStage: "[2단계] 임베딩 생성 중",
        progressPercent: 60,
        etaSeconds: 120,
      }),
    );

    useNotificationStore.getState().addNotification({
      type: "GRAPH_GENERATION_PROGRESS_UPDATED",
      payload: {
        taskId: "task-1",
        currentStage: "[1단계] 데이터 준비 중",
        progressPercent: 15,
        etaSeconds: 300,
      },
      timestamp: "2026-03-01T23:59:59.000Z",
    });

    expect(useGraphGenerationStore.getState().progress.currentStage).toBe(
      "[2단계] 임베딩 생성 중",
    );
    expect(useGraphGenerationStore.getState().progress.progressPercent).toBe(
      60,
    );
  });

  test("오래된 GRAPH_GENERATION_REQUESTED 이벤트는 최신 progress를 덮어쓰지 않음", () => {
    useNotificationStore.getState().addNotification(
      makeEvent("GRAPH_GENERATION_PROGRESS_UPDATED", {
        taskId: "task-1",
        currentStage: "[2단계] 클러스터링 중",
        progressPercent: 35,
        etaSeconds: 240,
      }),
    );

    useNotificationStore.getState().addNotification({
      type: "GRAPH_GENERATION_REQUESTED",
      payload: {
        taskId: "task-1",
      },
      timestamp: "2026-03-01T23:59:59.000Z",
    });

    expect(useGraphGenerationStore.getState().progress.currentStage).toBe(
      "[2단계] 클러스터링 중",
    );
    expect(useGraphGenerationStore.getState().progress.progressPercent).toBe(
      35,
    );
  });

  test("GRAPH_GENERATION_COMPLETED/FAILED 이벤트 수신 시 상태를 초기화하고 완료 시 그래프 캐시를 갱신", () => {
    useGraphGenerationStore.getState().markRequested({
      taskId: "task-1",
      timestamp: "2026-03-02T00:00:00.000Z",
    });

    useNotificationStore.getState().addNotification(
      makeEvent("GRAPH_GENERATION_COMPLETED", {
        taskId: "task-1",
      }),
    );
    expect(useGraphGenerationStore.getState().isGenerating).toBe(false);
    expect(useGraphGenerationStore.getState().progress.currentStage).toBeNull();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["graphData"],
    });

    useGraphGenerationStore.getState().setGenerating(true);
    useNotificationStore.getState().addNotification(
      makeEvent("GRAPH_GENERATION_FAILED", {
        taskId: "task-1",
        error: "timeout",
      }),
    );
    expect(useGraphGenerationStore.getState().isGenerating).toBe(false);
  });

  test("완료 이후 뒤늦은 progress 이벤트는 생성 상태를 다시 열지 않음", () => {
    useNotificationStore.getState().addNotification(
      makeEvent("GRAPH_GENERATION_PROGRESS_UPDATED", {
        taskId: "task-1",
        currentStage: "[3단계] 엣지 생성 중",
        progressPercent: 70,
        etaSeconds: 90,
      }),
    );

    useNotificationStore.getState().addNotification(
      makeEvent("GRAPH_GENERATION_COMPLETED", {
        taskId: "task-1",
      }),
    );

    expect(useGraphGenerationStore.getState().isGenerating).toBe(false);
    expect(useGraphGenerationStore.getState().lastTerminalTaskId).toBe(
      "task-1",
    );
    expect(useGraphGenerationStore.getState().lastTerminalTimestamp).toBe(
      "2026-03-02T00:00:00.001Z",
    );

    useNotificationStore.getState().addNotification({
      type: "GRAPH_GENERATION_PROGRESS_UPDATED",
      payload: {
        taskId: "task-1",
        currentStage: "[3단계] 엣지 생성 중",
        progressPercent: 80,
        etaSeconds: 60,
      },
      timestamp: "2026-03-02T00:00:00.000Z",
    });

    expect(useGraphGenerationStore.getState().isGenerating).toBe(false);
    expect(useGraphGenerationStore.getState().progress.currentStage).toBeNull();
    expect(useGraphGenerationStore.getState().lastTerminalTaskId).toBe(
      "task-1",
    );
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

  test("웹 환경에서는 브라우저 Notification API로 fallback", () => {
    delete (window as any).notification;

    useNotificationStore
      .getState()
      .addNotification(makeEvent("GRAPH_SUMMARY_COMPLETED"));

    expect(showNative).not.toHaveBeenCalled();
    expect(browserNotification).toHaveBeenCalledTimes(1);
    expect(browserNotification.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        tag: "GRAPH_SUMMARY_COMPLETED-2026-03-02T00:00:00.000Z",
      }),
    );
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
