/**
 * SSE(Server-Sent Events) 기반 알림 클라이언트
 *
 * SSE란?
 * - 서버에서 클라이언트로 단방향 실시간 데이터 스트리밍
 * - HTTP 연결을 유지하면서 서버가 이벤트를 푸시
 * - WebSocket과 달리 단방향이라 더 가볍고, 알림용으로 적합
 *
 * 흐름:
 * 1. 클라이언트가 EventSource로 서버에 연결 요청
 * 2. 서버는 연결을 유지하며 이벤트 발생 시 데이터 전송
 * 3. 클라이언트는 onmessage로 이벤트 수신
 * 4. 연결이 끊기면 자동 재연결 시도
 */

const API_BASE = import.meta.env.VITE_API_BASE || "";

// 서버에서 전송하는 알림 타입 정의
export type NotificationType =
  | "CONNECTED" // 연결 성공 확인용
  | "GRAPH_GENERATION_COMPLETED" // 그래프 생성 완료
  | "GRAPH_GENERATION_FAILED" // 그래프 생성 실패
  | "GRAPH_SUMMARY_COMPLETED" // 그래프 요약 완료
  | "GRAPH_SUMMARY_FAILED"; // 그래프 요약 실패

// 서버에서 전송하는 알림 이벤트 구조
export interface NotificationEvent {
  type: NotificationType;
  payload: Record<string, unknown>; // 알림별 추가 데이터 (nodeCount, error 등)
  timestamp: string;
}

// 알림 수신 시 호출될 콜백 함수 타입
export type NotificationCallback = (event: NotificationEvent) => void;

class NotificationClient {
  // 브라우저 내장 SSE API (서버와의 연결 관리)
  private eventSource: EventSource | null = null;

  // 알림 수신 시 호출할 콜백 함수들 (옵저버 패턴)
  private listeners: Set<NotificationCallback> = new Set();

  // 재연결 관련 상태
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 기본 3초, 지수 백오프로 증가
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;

  /**
   * SSE 서버에 연결
   * - 이미 연결 중이면 무시
   * - 연결 성공 시 onopen, 메시지 수신 시 onmessage, 에러 시 onerror 호출
   */
  connect() {
    // 중복 연결 방지
    if (this.eventSource || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      const url = `${API_BASE}/v1/notifications/stream`;

      // EventSource: 브라우저 내장 SSE 클라이언트
      // withCredentials: true → 쿠키(세션) 포함하여 인증된 요청
      this.eventSource = new EventSource(url, {
        withCredentials: true,
      });

      // 연결 성공 시
      this.eventSource.onopen = () => {
        console.log("[NotificationClient] SSE connection opened");
        this.reconnectAttempts = 0; // 재연결 카운터 초기화
        this.isConnecting = false;
      };

      // 서버에서 메시지 수신 시
      // 서버는 `data: {JSON}\n\n` 형식으로 전송
      this.eventSource.onmessage = (event) => {
        try {
          const data: NotificationEvent = JSON.parse(event.data);
          console.log("[NotificationClient] Received:", data.type);
          this.notifyListeners(data); // 등록된 모든 리스너에게 알림
        } catch (e) {
          console.error("[NotificationClient] Failed to parse message:", e);
        }
      };

      // 연결 에러 시 (네트워크 끊김, 서버 다운 등)
      this.eventSource.onerror = (error) => {
        console.error("[NotificationClient] SSE error:", error);
        this.isConnecting = false;
        this.handleDisconnect(); // 재연결 시도
      };
    } catch (error) {
      console.error(
        "[NotificationClient] Failed to create EventSource:",
        error,
      );
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  // 연결 끊김 처리
  private handleDisconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.scheduleReconnect();
  }

  // 재연결 스케줄링 (지수 백오프)
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[NotificationClient] Max reconnect attempts reached");
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // 지수 백오프: 재시도마다 대기 시간 2배 증가
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    console.log(`[NotificationClient] Reconnecting in ${delay}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  // SSE 연결 종료
  disconnect() {
    console.log("[NotificationClient] Disconnecting...");

    // 재연결 타이머 정리
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // EventSource 연결 종료
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  // 리스너 등록 (알림 수신 시 호출할 콜백 등록)
  subscribe(callback: NotificationCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * 등록된 모든 리스너에게 이벤트 전달
   */
  private notifyListeners(event: NotificationEvent) {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (e) {
        console.error("[NotificationClient] Listener error:", e);
      }
    });
  }

  // 연결 상태 확인
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}

export const notificationClient = new NotificationClient();
