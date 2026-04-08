import SettingsPanelLayout from "./SettingsPanelLayout";
import ToggleSettingItem from "./ToggleSettingItem";
import { IoCamera, IoMail, IoPerson } from "react-icons/io5";
import { Me } from "@/types/Me";
import SettingCategoryTitle from "./SettingCategoryTitle";
import ApiKeyManager from "./ApiKeyManager";
import OpenAI from "@/assets/icons/openai.svg";
import DeepSeek from "@/assets/icons/deepseek.svg";
import Claude from "@/assets/icons/claude.svg";
import Gemini from "@/assets/icons/gemini.png";
import { api } from "@/apiClient";
import { useEffect, useState } from "react";
import { isElectron } from "@/utils/platform";
import { useTranslation } from "react-i18next";

const PRICING_URL = "https://www.graphnode.site/pricing";

export default function MyAccountPanel({
  userInfo,
  onLogout,
}: {
  userInfo: Me;
  onLogout?: () => void;
}) {
  const { t } = useTranslation();

  const [openaiApiKey, setOpenaiApiKey] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKey] = useState<boolean>(false);
  const [claudeApiKey, setClaudeApiKey] = useState<boolean>(false);
  const [deepseekApiKey, setDeepseekApiKey] = useState<boolean>(false);
  const [currentPlan] = useState<string>("standard");
  const [isDevMode, setIsDevMode] = useState<boolean>(false);

  // 개발자 모드 로드
  useEffect(() => {
    const devMode = localStorage.getItem("graphnode-dev-mode") === "true";
    setIsDevMode(devMode);
  }, []);

  // 개발자 모드 토글
  const handleDevModeToggle = (value: boolean) => {
    setIsDevMode(value);
    localStorage.setItem("graphnode-dev-mode", value.toString());
  };

  useEffect(() => {
    (async () => {
      const result_openai = await api.me.getApiKeys("openai");
      const result_deepseek = await api.me.getApiKeys("deepseek");
      const result_gemini = await api.me.getApiKeys("gemini");
      const result_claude = await api.me.getApiKeys("claude");

      setOpenaiApiKey(result_openai.isSuccess && !!result_openai.data?.apiKey);
      setDeepseekApiKey(
        result_deepseek.isSuccess && !!result_deepseek.data?.apiKey,
      );
      setClaudeApiKey(result_claude.isSuccess && !!result_claude.data?.apiKey);
      setGeminiApiKey(result_gemini.isSuccess && !!result_gemini.data?.apiKey);
    })();
  }, []);

  const handleLogout = async () => {
    const result = await api.me.logout();
    if (!result.isSuccess) {
      // TODO: 로그인 실패 로직
    }
    if (isElectron()) {
      window.electron?.send("auth-logout");
    } else {
      onLogout?.();
    }
  };

  const openExternal = (url: string) => {
    if (isElectron()) {
      window.systemAPI?.openExternal(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <SettingsPanelLayout>
      {/* Profile Section */}
      <div className="w-full p-6 bg-bg-secondary rounded-2xl">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          {/* TODO: Change Profile Image when Click */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-bg-tertiary">
              {userInfo.profile.avatarUrl ? (
                <img
                  src={userInfo.profile.avatarUrl}
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  alt="avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove(
                      "hidden",
                    );
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${userInfo.profile.avatarUrl ? "hidden" : ""}`}
              >
                <IoPerson className="text-gray-400 dark:text-gray-500 text-4xl" />
              </div>
            </div>
            <button className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-200 cursor-pointer">
              <IoCamera className="text-white text-xl" />
            </button>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text-primary mb-1">
              {userInfo.profile.displayName}
            </h2>
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <div className="flex items-center gap-1.5">
                <IoMail className="text-base" />
                <span>{userInfo.profile.email}</span>
              </div>
            </div>
          </div>

          {/* Plan Badge */}
          <div
            onClick={() => openExternal(PRICING_URL)}
            className="px-4 py-2 bg-primary/10 dark:bg-primary/20 rounded-xl cursor-pointer hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
          >
            <p className="text-xs text-text-secondary mb-0.5">Current Plan</p>
            <p className="text-sm font-semibold text-primary capitalize">
              {currentPlan}
            </p>
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div
        className="flex flex-col items-start justify-start gap-4 w-full"
        data-onboarding="api-key-section"
      >
        <SettingCategoryTitle
          title={t("settings.my.api.title")}
          subtitle={t("settings.my.api.subtitle")}
        />
        <div className="flex flex-col gap-3 w-full">
          <ApiKeyManager
            id="openai"
            logo={OpenAI}
            title="OpenAI"
            isVerified={openaiApiKey}
            setIsVerified={setOpenaiApiKey}
          />
          <ApiKeyManager
            id="gemini"
            logo={Gemini}
            title="Gemini"
            isVerified={geminiApiKey}
            setIsVerified={setGeminiApiKey}
          />
          <ApiKeyManager
            id="claude"
            logo={Claude}
            title="Claude"
            isVerified={claudeApiKey}
            setIsVerified={setClaudeApiKey}
          />
          <ApiKeyManager
            id="deepseek"
            logo={DeepSeek}
            title="DeepSeek"
            isVerified={deepseekApiKey}
            setIsVerified={setDeepseekApiKey}
          />
        </div>
      </div>

      <SettingCategoryTitle title={t("settings.developerMode.title")} />
      <ToggleSettingItem
        title={t("settings.developerMode.toggle")}
        subtitle={t("settings.developerMode.toggleDescription")}
        isActive={isDevMode}
        onChange={handleDevModeToggle}
      />

      {/* Feedback, Links & Logout Section */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => openExternal("https://www.graphnode.site/feedback")}
          className="text-sm text-text-secondary hover:text-text-primary underline transition-colors cursor-pointer"
        >
          {t("settings.feedback")}
        </button>
        <button
          onClick={() => openExternal("https://www.graphnode.site/privacy")}
          className="text-sm text-text-secondary hover:text-text-primary underline transition-colors cursor-pointer"
        >
          {t("settings.privacy")}
        </button>
        <button
          onClick={() => openExternal("https://www.graphnode.site/terms")}
          className="text-sm text-text-secondary hover:text-text-primary underline transition-colors cursor-pointer"
        >
          {t("settings.terms")}
        </button>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
        >
          {t("settings.logout")}
        </button>
      </div>
    </SettingsPanelLayout>
  );
}
