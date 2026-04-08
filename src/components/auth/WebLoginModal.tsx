import { useTranslation } from "react-i18next";
import { Me } from "@/types/Me";
import { useOAuthPopup } from "@/hooks/useOAuthPopup";
import GoogleIcon from "@/assets/icons/google.svg";
import AppleIcon from "@/assets/icons/apple.svg";
import LogoIcon from "@/assets/icons/logo.svg";

interface WebLoginModalProps {
  onSuccess: (me: Me) => void;
}

export default function WebLoginModal({ onSuccess }: WebLoginModalProps) {
  const { t } = useTranslation();
  const { isLoggingIn, error, login } = useOAuthPopup(onSuccess);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30"
      data-testid="web-login-modal"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-[320px] flex flex-col items-center py-10 px-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <img src={LogoIcon} alt="GraphNode" className="w-5 h-5" />
          <h1 className="text-xl font-semibold text-primary">GraphNode</h1>
        </div>
        <p className="text-[22px] font-medium mb-10">{t("login.welcome")}</p>

        <div
          data-testid="login-google"
          className={`flex items-center justify-center relative w-full border border-solid rounded-full py-2 cursor-pointer mb-3 ${isLoggingIn ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => login("google")}
        >
          <img
            src={GoogleIcon}
            alt="Google"
            className="w-5 h-5 absolute left-[14px] top-0 bottom-0 m-auto"
          />
          <p className="text-[14px]">{t("login.signInWithGoogle")}</p>
        </div>

        <div
          data-testid="login-apple"
          className={`flex items-center justify-center relative w-full border border-solid rounded-full py-2 cursor-pointer ${isLoggingIn ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => login("apple")}
        >
          <img
            src={AppleIcon}
            alt="Apple"
            className="w-5 h-5 absolute left-[14px] top-0 bottom-0 m-auto"
          />
          <p className="text-[14px]">{t("login.signInWithApple")}</p>
        </div>

        <div className="mt-6 text-[11px] text-text-secondary text-center leading-relaxed">
          {t("login.agreePrefix")}{" "}
          <a
            href="https://www.graphnode.site/terms"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-text-primary transition-colors"
          >
            {t("login.terms")}
          </a>
          {" "}{t("login.agreeMiddle")}{" "}
          <a
            href="https://www.graphnode.site/privacy"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-text-primary transition-colors"
          >
            {t("login.privacy")}
          </a>
          {t("login.agreeSuffix")}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-red-400 text-[13px] text-center">
            {error}
          </p>
        )}

        {isLoggingIn && (
          <div className="mt-6 w-8 h-8 border-4 border-zinc-200 border-t-primary rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
}
