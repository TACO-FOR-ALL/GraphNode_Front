import SettingsPanelLayout from "./SettingsPanelLayout";
import { FaCheck } from "react-icons/fa";
import { IoCamera, IoLogOut, IoMail } from "react-icons/io5";
import { Me } from "@/types/Me";
import SettingCategoryTitle from "./SettingCategoryTitle";
import ApiKeyManager from "./ApiKeyManager";
import OpenAI from "@/assets/icons/openai.svg";
import DeepSeek from "@/assets/icons/deepseek.svg";
import Claude from "@/assets/icons/claude.svg";
import Gemini from "@/assets/icons/gemini.png";
import { api } from "@/apiClient";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type PlanType = "standard" | "pro" | "max";

interface PlanInfo {
  id: PlanType;
  name: string;
  price: string;
  priceNote: string;
  tokens: string;
  features: string[];
  recommended?: boolean;
}

const plans: PlanInfo[] = [
  {
    id: "standard",
    name: "Standard",
    price: "Free",
    priceNote: "",
    tokens: "10K",
    features: [
      "Basic AI models",
      "Community support",
      "Standard response time",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    priceNote: "/month",
    tokens: "100K",
    features: [
      "Advanced AI models",
      "Priority support",
      "Faster response time",
      "API access",
    ],
    recommended: true,
  },
  {
    id: "max",
    name: "Max",
    price: "$49",
    priceNote: "/month",
    tokens: "Unlimited",
    features: [
      "All AI models",
      "24/7 Premium support",
      "Fastest response time",
      "Full API access",
      "Custom integrations",
    ],
  },
];

export default function MyAccountPanel({ userInfo }: { userInfo: Me }) {
  const { t } = useTranslation();

  const [openaiApiKey, setOpenaiApiKey] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKey] = useState<boolean>(false);
  const [claudeApiKey, setClaudeApiKey] = useState<boolean>(false);
  const [deepseekApiKey, setDeepseekApiKey] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<PlanType>("standard");

  useEffect(() => {
    (async () => {
      const result_openai = await api.me.getApiKeys("openai");
      const result_deepseek = await api.me.getApiKeys("deepseek");
      const result_gemini = await api.me.getApiKeys("gemini");
      const result_claude = await api.me.getApiKeys("claude");
      // @ts-ignore
      setOpenaiApiKey(result_openai.data?.apiKey ? true : false);
      // @ts-ignore
      setDeepseekApiKey(result_deepseek.data?.apiKey ? true : false);
      // @ts-ignore
      setClaudeApiKey(result_claude.data?.apiKey ? true : false);
      // @ts-ignore
      setGeminiApiKey(result_gemini.data?.apiKey ? true : false);
    })();
  }, []);

  const handleLogout = async () => {
    await api.me.logout();
    window.electron?.send("auth-logout");
  };

  return (
    <SettingsPanelLayout>
      {/* Profile Section */}
      <div className="w-full p-6 bg-bg-secondary rounded-2xl">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-bg-tertiary">
              <img
                src={userInfo.profile.avatarUrl}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                alt="avatar"
                className="w-full h-full object-cover"
              />
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
          <div className="px-4 py-2 bg-primary/10 dark:bg-primary/20 rounded-xl">
            <p className="text-xs text-text-secondary mb-0.5">Current Plan</p>
            <p className="text-sm font-semibold text-primary capitalize">
              {currentPlan}
            </p>
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="flex flex-col items-start justify-start gap-4 w-full">
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

      {/* Subscription Section */}
      <div className="w-full">
        <SettingCategoryTitle
          title={t("settings.my.subscription.title")}
          subtitle={t("settings.my.subscription.subtitle")}
        />
      </div>
      <div className="flex gap-4 w-full">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;

          // 플랜별 색상 테마
          const planTheme = {
            standard: {
              gradient:
                "from-text-secondary/10 to-text-tertiary/5 dark:from-text-secondary/20 dark:to-text-tertiary/10",
              border: isCurrentPlan
                ? "border-text-secondary"
                : "border-base-border hover:border-text-secondary/50",
              badge: "bg-text-secondary",
              tokenBg: "bg-bg-tertiary dark:bg-bg-tertiary",
              button: isCurrentPlan
                ? "bg-text-secondary/20 text-text-secondary"
                : "bg-text-secondary text-white hover:bg-text-secondary/80",
              checkColor: "text-text-secondary",
              priceColor: "text-text-primary",
            },
            pro: {
              gradient:
                "from-primary/10 to-sidebar-tab-selected/10 dark:from-primary/20 dark:to-sidebar-tab-selected/20",
              border: isCurrentPlan
                ? "border-primary"
                : "border-base-border hover:border-primary/50",
              badge: "bg-gradient-to-r from-primary to-sidebar-tab-selected",
              tokenBg: "bg-primary/10 dark:bg-primary/20",
              button: isCurrentPlan
                ? "bg-primary/20 text-primary"
                : "bg-gradient-to-r from-primary to-sidebar-tab-selected text-white hover:opacity-90",
              checkColor: "text-primary",
              priceColor: "text-primary",
            },
            max: {
              gradient:
                "from-frame-bar-yellow/15 to-frame-bar-red/10 dark:from-frame-bar-yellow/25 dark:to-frame-bar-red/20",
              border: isCurrentPlan
                ? "border-frame-bar-yellow"
                : "border-base-border hover:border-frame-bar-yellow/50",
              badge: "bg-gradient-to-r from-frame-bar-yellow to-frame-bar-red",
              tokenBg:
                "bg-gradient-to-r from-frame-bar-yellow/15 to-frame-bar-red/10 dark:from-frame-bar-yellow/25 dark:to-frame-bar-red/20",
              button: isCurrentPlan
                ? "bg-frame-bar-yellow/20 text-frame-bar-yellow"
                : "bg-gradient-to-r from-frame-bar-yellow to-frame-bar-red text-white hover:opacity-90",
              checkColor: "text-frame-bar-yellow",
              priceColor: "text-frame-bar-yellow",
            },
          }[plan.id];

          return (
            <div
              key={plan.id}
              className={`flex-1 flex flex-col p-5 rounded-xl border-2 transition-all duration-300 bg-gradient-to-br ${planTheme.gradient} ${planTheme.border} ${plan.recommended ? "relative scale-[1.02] shadow-lg" : ""}`}
            >
              {plan.recommended && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 ${planTheme.badge} text-white text-xs px-4 py-1.5 rounded-full font-semibold shadow-md`}
                >
                  Recommended
                </div>
              )}
              <div className="flex flex-col gap-1 mb-4">
                <h3 className="text-lg font-semibold text-text-primary">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-3xl font-bold ${planTheme.priceColor}`}
                  >
                    {plan.price}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {plan.priceNote}
                  </span>
                </div>
              </div>
              <div
                className={`flex items-center gap-2 mb-4 px-4 py-3 rounded-lg ${planTheme.tokenBg}`}
              >
                <span className="text-sm text-text-secondary">Tokens:</span>
                <span className={`text-sm font-bold ${planTheme.priceColor}`}>
                  {plan.tokens}
                </span>
              </div>
              <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2.5 text-sm text-text-secondary"
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center ${planTheme.tokenBg}`}
                    >
                      <FaCheck
                        className={`${planTheme.checkColor} text-[10px] flex-shrink-0`}
                      />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setCurrentPlan(plan.id)}
                disabled={isCurrentPlan}
                className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${planTheme.button} ${!isCurrentPlan ? "cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-0.5" : "cursor-default"}`}
              >
                {isCurrentPlan ? "Current Plan" : "Select Plan"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Logout Section */}
      <div className="w-full pt-4 border-t border-text-tertiary/20">
        <button
          onClick={handleLogout}
          className="
            flex items-center gap-2.5 px-4 py-2.5 rounded-xl
            text-red-600 dark:text-red-400
            bg-red-50 dark:bg-red-900/20
            hover:bg-red-100 dark:hover:bg-red-900/30
            transition-all duration-200
          "
        >
          <IoLogOut className="text-lg" />
          <span className="text-sm font-medium">{t("settings.logout")}</span>
        </button>
      </div>
    </SettingsPanelLayout>
  );
}
