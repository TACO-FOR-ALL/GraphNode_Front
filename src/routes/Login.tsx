import { api } from "@/apiClient";
import { useEffect, useState, type CSSProperties } from "react";

type DraggableCSSProperties = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

const containerStyle: CSSProperties = {
  height: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  justifyContent: "flex-start",
  background: "#0d0f11",
  color: "#e2e8f0",
  textAlign: "center",
};

const titleBarStyle: DraggableCSSProperties = {
  padding: "12px 16px 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: "8px",
  WebkitAppRegion: "drag",
};

const trafficButtonStyle: DraggableCSSProperties = {
  width: "12px",
  height: "12px",
  borderRadius: "9999px",
  border: "none",
  padding: 0,
  WebkitAppRegion: "no-drag",
  cursor: "pointer",
};

const contentStyle: DraggableCSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "24px",
  padding: "32px 24px 40px",
  WebkitAppRegion: "no-drag",
};

const buttonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "10px",
  padding: "12px 24px",
  borderRadius: "9999px",
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(37, 99, 235, 0.35)",
};

export default function Login() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCloseWindow = () => window.windowAPI.close();
  const handleMinimizeWindow = () => window.windowAPI.minimize();
  const handleToggleMaximize = () => window.windowAPI.maximize();

  // 세션 상태로 로그인 여부 확인
  useEffect(() => {
    (async () => {
      try {
        await api.me.get();
        window.electron?.send("auth-success"); // 렌더러에서 메인으로 단방향 이벤트 발신
      } catch (err: any) {
        console.warn("getMe failed on startup:", err);
        if (err.status === 401) {
          return;
        }
        setError("로그인 상태 확인 중 오류가 발생했습니다.");
      }
    })();
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // 메시지 오리진 검증
      if (event.origin !== "https://taco4graphnode.online") return;

      // 백엔드 콜백 HTML postMessage 객체
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "oauth-success") {
        (async () => {
          try {
            await api.me.get();
            window.electron?.send("auth-success");
          } catch (err: any) {
            console.error("getMe failed after oauth:", err);
            if (err.status === 401) {
              setError(
                "로그인 세션이 설정되지 않았습니다. 다시 시도해 주세요."
              );
            } else {
              setError("로그인 후 사용자 정보를 불러오지 못했습니다.");
            }
          }
        })();
      } else if (data.type === "oauth-error") {
        setError(data.message ?? "OAuth 에러가 발생했습니다.");
      }
    }

    // 백엔드 콜백 HTML postMessage 수신 이벤트 리스너 등록
    // message: 다른 Window 간 메시지(데이터) 송수신 시 발생하는 이벤트
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSocialLogin = async (provider: "google" | "apple") => {
    if (isLoggingIn) return;

    const width = 480;
    const height = 640;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    try {
      setIsLoggingIn(true);
      setError(null);
      const url =
        provider === "google"
          ? await api.googleAuth.startUrl()
          : await api.appleAuth.startUrl();

      const popup = window.open(
        url,
        `${provider}-oauth`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        alert("팝업이 차단되었습니다. 팝업 허용을 해주세요.");
      }
    } catch (err) {
      console.error(err);
      setError("Google 로그인 시작에 실패했습니다.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={containerStyle}>
      <header style={titleBarStyle}>
        <button
          type="button"
          onClick={handleCloseWindow}
          aria-label="창 닫기"
          style={{ ...trafficButtonStyle, background: "#ff5f57" }}
        />
        <button
          type="button"
          onClick={handleMinimizeWindow}
          aria-label="창 최소화"
          style={{ ...trafficButtonStyle, background: "#fdbc2c" }}
        />
        <button
          type="button"
          onClick={handleToggleMaximize}
          aria-label="창 최대화"
          style={{ ...trafficButtonStyle, background: "#28c840" }}
        />
      </header>

      <div style={contentStyle}>
        <h1 style={{ fontSize: "24px", margin: 0 }}>GraphNode</h1>
        <p style={{ marginTop: "8px", color: "#94a3b8" }}>
          소셜 계정으로 로그인하세요.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <button
            type="button"
            onClick={() => handleSocialLogin("google")}
            style={buttonStyle}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Google로 로그인 중..." : "Google 계정으로 로그인"}
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin("apple")}
            style={{ ...buttonStyle, background: "#475569" }}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Apple로 로그인 중..." : "Apple 계정으로 로그인"}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: "16px",
              color: "#f87171",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
