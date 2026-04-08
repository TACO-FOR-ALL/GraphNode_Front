import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import GoogleIcon from "@/assets/icons/google.svg";
import AppleIcon from "@/assets/icons/apple.svg";
import LogoIcon from "@/assets/icons/logo.svg";
import { Me } from "@/types/Me";
import { api } from "@/apiClient";
import { useOAuthPopup } from "@/hooks/useOAuthPopup";

export default function Login() {
  const { t } = useTranslation();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const handleCloseWindow = () => window.windowAPI?.close();
  const handleMinimizeWindow = () => window.windowAPI?.minimize();
  const handleToggleMaximize = () => window.windowAPI?.maximize();

  // 세션 확인
  useEffect(() => {
    (async () => {
      const result = await api.me.get();

      if (result.isSuccess) {
        setHasSession(true);
        await window.keytarAPI?.setMe(result.data as Me);
        window.electron?.send("auth-success");
        return;
      }

      const sc = result.error.statusCode;

      if (sc === 401) {
        setHasSession(false);
        window.electron?.send("auth-show-login");
        return;
      }

      setHasSession(false);
      setSessionError(t("login.error.server"));
    })();
  }, []);

  // OAuth 팝업 로그인
  const { isLoggingIn, error: oauthError, login } = useOAuthPopup(async (me: Me) => {
    setHasSession(true);
    await window.keytarAPI?.setMe(me);
    window.electron?.send("auth-success");
  });

  const error = sessionError || oauthError;

  if (!hasSession) {
    return (
      <div className="h-screen flex flex-col items-stretch justify-start bg-white text-center relative">
        <header className="pt-3 px-4 flex items-center justify-start gap-2 drag-region">
          <div
            onClick={handleCloseWindow}
            aria-label={t("login.closeWindow")}
            className="w-3 h-3 rounded-full border-0 p-0 m-0 no-drag cursor-pointer bg-[#ff5f57]"
          />
          <div
            onClick={handleMinimizeWindow}
            aria-label={t("login.minimizeWindow")}
            className="w-3 h-3 rounded-full border-0 p-0 m-0 no-drag cursor-pointer bg-[#fdbc2c]"
          />
          <div
            onClick={handleToggleMaximize}
            aria-label={t("login.maximizeWindow")}
            className="w-3 h-3 min-w-3 max-w-3 min-h-3 max-h-3 aspect-square rounded-full border-0 p-0 m-0 no-drag cursor-pointer bg-[#28c840] flex-shrink-0"
          />
        </header>

        <div className="flex-1 flex flex-col items-center justify-center py-8 px-6 pb-10 no-drag">
          <div className="flex items-center justify-center gap-2">
            <img src={LogoIcon} alt="GraphNode" className="w-5 h-5" />
            <h1 className="text-xl font-semibold text-primary">GraphNode</h1>
          </div>
          <div className="h-4" />
          <p className="text-[28px] font-medium">{t("login.welcome")}</p>
          <div className="h-[96px]" />
          <div
            className={`flex items-center justify-center relative w-[230px] border-solid border-[1px] rounded-full py-2 cursor-pointer ${isLoggingIn ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => login("google")}
          >
            <img
              src={GoogleIcon}
              alt="Google"
              className="w-5 h-5 absolute left-[14px] top-0 bottom-0 m-auto"
            />
            <p className="text-[14px]">{t("login.signInWithGoogle")}</p>
          </div>
          <div className="h-3" />
          <div
            className={`flex items-center justify-center relative w-[230px] border-solid border-[1px] rounded-full py-2 cursor-pointer ${isLoggingIn ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => login("apple")}
          >
            <img
              src={AppleIcon}
              alt="Apple"
              className="w-5 h-5 absolute left-[14px] top-0 bottom-0 m-auto"
            />
            <p className="text-[14px]">{t("login.signInWithApple")}</p>
          </div>

          <div className="mt-6 text-[11px] text-text-secondary text-center leading-relaxed px-4">
            {t("login.agreePrefix")}{" "}
            <div className="flex gap-x-1">
              <div
                onClick={() => {
                  const url = "https://www.graphnode.site/terms";
                  if (window.systemAPI) window.systemAPI.openExternal(url);
                  else window.open(url, "_blank");
                }}
                className="underline hover:text-text-primary transition-colors cursor-pointer"
              >
                {t("login.terms")}
              </div>
              {t("login.agreeMiddle")}{" "}
              <div
                onClick={() => {
                  const url = "https://www.graphnode.site/privacy";
                  if (window.systemAPI) window.systemAPI.openExternal(url);
                  else window.open(url, "_blank");
                }}
                className="underline hover:text-text-primary transition-colors cursor-pointer"
              >
                {t("login.privacy")}
              </div>
            </div>
            {t("login.agreeSuffix")}
          </div>

          {error && (
            <div role="alert" className="mt-4 text-red-400 text-[13px]">
              {error}
            </div>
          )}
        </div>

        {isLoggingIn && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="w-12 h-12 border-4 border-white/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }
}
