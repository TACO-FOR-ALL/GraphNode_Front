import { useState, type CSSProperties } from "react";

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

  const handleFakeLogin = async () => {
    if (isLoggingIn) return;

    try {
      setIsLoggingIn(true);
      setError(null);
      await window.authAPI.completeFakeLogin();
    } catch (err) {
      console.error(err);
      setError("로그인에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;

    try {
      setIsLoggingIn(true);
      setError(null);
      await window.authAPI.startGoogleOAuth();
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
            onClick={handleGoogleLogin}
            style={buttonStyle}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Google로 로그인 중..." : "Google 계정으로 로그인"}
          </button>

          <button
            type="button"
            onClick={handleFakeLogin}
            style={{ ...buttonStyle, background: "#475569" }}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "확인 중..." : "Fake 로그인 (테스트용)"}
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
