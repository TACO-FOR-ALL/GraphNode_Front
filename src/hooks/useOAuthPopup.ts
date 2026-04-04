import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/apiClient";
import { Me } from "@/types/Me";

/**
 * OAuth 팝업 흐름을 처리하는 훅
 * - 팝업 열기 / 닫힘 감지
 * - 백엔드 postMessage 수신 및 origin 검증
 * - 성공 시 api.me.get() 호출 후 onSuccess(me) 콜백 실행
 */
export function useOAuthPopup(onSuccess: (me: Me) => void) {
  const { t } = useTranslation();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://taco4graphnode.online") return;

      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "oauth-success") {
        if (popupIntervalRef.current) {
          clearInterval(popupIntervalRef.current);
          popupIntervalRef.current = null;
        }
        setIsLoggingIn(false);
        (async () => {
          try {
            const result = await api.me.get();
            if (result.isSuccess) {
              onSuccess(result.data as Me);
            } else {
              setError(t("login.error.sessionNotSet"));
            }
          } catch {
            setError(t("login.error.fetchUserFailed"));
          }
        })();
      } else if (data.type === "oauth-error") {
        if (popupIntervalRef.current) {
          clearInterval(popupIntervalRef.current);
          popupIntervalRef.current = null;
        }
        setIsLoggingIn(false);
        setError(data.message ?? t("login.error.oauthError"));
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSuccess, t]);

  const login = async (provider: "google" | "apple") => {
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
          ? api.googleAuth.startUrl()
          : api.appleAuth.startUrl();

      const popup = window.open(
        url,
        `${provider}-oauth`,
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      if (!popup) {
        setIsLoggingIn(false);
        alert(t("login.popupBlocked"));
        return;
      }

      popupIntervalRef.current = setInterval(() => {
        if (popup.closed) {
          if (popupIntervalRef.current) {
            clearInterval(popupIntervalRef.current);
            popupIntervalRef.current = null;
          }
          setIsLoggingIn(false);
        }
      }, 500);
    } catch {
      setIsLoggingIn(false);
      setError(
        provider === "google"
          ? t("login.error.googleLoginFailed")
          : t("login.error.appleLoginFailed"),
      );
    }
  };

  return { isLoggingIn, error, login };
}
