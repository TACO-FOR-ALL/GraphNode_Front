import { api } from "@/apiClient";
import { useEffect, useState } from "react";
import GoogleIcon from "@/assets/icons/google.svg";
import AppleIcon from "@/assets/icons/apple.svg";
import LogoIcon from "@/assets/icons/logo.svg";

export default function Login() {
  const [checkSession, setCheckSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
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
        setHasSession(true);
        window.electron?.send("auth-success"); // 렌더러에서 메인으로 단방향 이벤트 발신
        return; // 세션 있을 시 로그인 UI 안 보기
      } catch (err: any) {
        console.warn("getMe failed on startup:", err);
        if (err.status === 401) {
          window.electron?.send("auth-show-login");
          return;
        }
        setError("로그인 상태 확인 중 오류가 발생했습니다.");
      } finally {
        setCheckSession(false);
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

  if (checkSession) {
    return null;
  }

  if (!hasSession) {
    return (
      <div className="h-screen flex flex-col items-stretch justify-start bg-white text-center">
        <header className="pt-3 px-4 flex items-center justify-start gap-2 drag-region">
          <div
            onClick={handleCloseWindow}
            aria-label="창 닫기"
            className="w-3 h-3 rounded-full border-0 p-0 m-0 no-drag cursor-pointer bg-[#ff5f57]"
          />
          <div
            onClick={handleMinimizeWindow}
            aria-label="창 최소화"
            className="w-3 h-3 rounded-full border-0 p-0 m-0 no-drag cursor-pointer bg-[#fdbc2c]"
          />
          <div
            onClick={handleToggleMaximize}
            aria-label="창 최대화"
            className="w-3 h-3 min-w-3 max-w-3 min-h-3 max-h-3 aspect-square rounded-full border-0 p-0 m-0 no-drag cursor-pointer bg-[#28c840] flex-shrink-0"
          />
        </header>

        <div className="flex-1 flex flex-col items-center justify-center py-8 px-6 pb-10 no-drag">
          <div className="flex items-center justify-center gap-2">
            <img src={LogoIcon} alt="GraphNode" className="w-5 h-5" />
            <h1 className="text-xl font-semibold text-primary">GraphNode</h1>
          </div>
          <div className="h-4" />
          <p className="text-[28px] font-medium">Welcome Back!</p>
          <div className="h-[96px]" />
          <div
            className="flex items-center justify-center relative w-[230px] border-solid border-[1px] rounded-full py-2 cursor-pointer"
            onClick={() => handleSocialLogin("google")}
          >
            <img
              src={GoogleIcon}
              alt="Google"
              className="w-5 h-5 absolute left-[14px] top-0 bottom-0 m-auto"
            />
            <p className="text-[14px]">Sign in with Google</p>
          </div>
          <div className="h-3" />
          <div
            className="flex items-center justify-center relative w-[230px] border-solid border-[1px] rounded-full py-2 cursor-pointer"
            onClick={() => handleSocialLogin("apple")}
          >
            <img
              src={AppleIcon}
              alt="Apple"
              className="w-5 h-5 absolute left-[14px] top-0 bottom-0 m-auto"
            />
            <p className="text-[14px]">Sign in with Apple</p>
          </div>

          {error && (
            <div role="alert" className="mt-4 text-red-400 text-[13px]">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }
}
