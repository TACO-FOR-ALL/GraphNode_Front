import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useOnboardingStore, OnboardingStep } from "@/store/useOnboardingStore";
import { useSidebarSettingsStore } from "@/store/useSidebarSettingsStore";
import { FiX, FiArrowRight, FiExternalLink } from "react-icons/fi";
import type SettingsCategory from "@/types/SettingsCategory";

interface SpotlightConfig {
  step: OnboardingStep;
  targetSelector: string;
  title: string;
  description: string;
  link?: { text: string; url: string };
  navigateTo?: string;
  settingsCategory?: SettingsCategory["id"];
  position: "top" | "bottom" | "left" | "right";
}

export default function SpotlightOverlay() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentStep, nextStep, skipOnboarding, isOnboardingActive } =
    useOnboardingStore();
  const { setSelectedCategory } = useSidebarSettingsStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const navigatedStepRef = useRef<OnboardingStep | null>(null);

  const spotlightConfigs: SpotlightConfig[] = [
    {
      step: "apiKey",
      targetSelector: '[data-onboarding="api-key-section"]',
      title: t("onboarding.apiKey.title"),
      description: t("onboarding.apiKey.description"),
      link: {
        text: t("onboarding.apiKey.linkText"),
        url: "https://platform.openai.com/api-keys",
      },
      navigateTo: "/settings",
      settingsCategory: "my-account",
      position: "bottom",
    },
    {
      step: "dataImport",
      targetSelector: '[data-onboarding="data-import-section"]',
      title: t("onboarding.dataImport.title"),
      description: t("onboarding.dataImport.description"),
      link: {
        text: t("onboarding.dataImport.linkText"),
        url: "https://help.openai.com/en/articles/7260999-how-do-i-export-my-chatgpt-history-and-data",
      },
      navigateTo: "/settings",
      settingsCategory: "data-privacy",
      position: "bottom",
    },
    {
      step: "visualize",
      targetSelector: '[data-onboarding="generate-graph-button"]',
      title: t("onboarding.visualize.title"),
      description: t("onboarding.visualize.description"),
      navigateTo: "/visualize",
      position: "bottom",
    },
  ];

  const config = spotlightConfigs.find((c) => c.step === currentStep);

  // 페이지 이동 및 타겟 요소 찾기
  useEffect(() => {
    if (!config || !isOnboardingActive) return;

    // 이미 이 스텝에 대해 네비게이션을 수행했으면 스킵
    if (navigatedStepRef.current !== currentStep) {
      navigatedStepRef.current = currentStep;

      // Settings 카테고리 변경이 필요한 경우
      if (config.settingsCategory) {
        setSelectedCategory({ id: config.settingsCategory });
      }

      // 페이지 이동이 필요한 경우
      if (config.navigateTo) {
        navigate(config.navigateTo);
      }
    }

    // 타겟 요소 찾기 (약간의 딜레이 후)
    const findTarget = () => {
      const target = document.querySelector(config.targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        // 요소가 아직 없으면 재시도
        setTimeout(findTarget, 100);
      }
    };

    const timer = setTimeout(findTarget, 300);
    return () => clearTimeout(timer);
  }, [currentStep, config, isOnboardingActive, navigate, setSelectedCategory]);

  // 윈도우 리사이즈 시 위치 업데이트
  useEffect(() => {
    if (!config) return;

    const handleResize = () => {
      const target = document.querySelector(config.targetSelector);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [config]);

  if (!config || !isOnboardingActive) return null;

  const padding = 12;
  const spotlightStyle = targetRect
    ? {
        left: targetRect.left - padding,
        top: targetRect.top - padding,
        width: targetRect.width + padding * 2,
        height: targetRect.height + padding * 2,
      }
    : null;

  // 툴팁 위치 계산
  const getTooltipStyle = () => {
    if (!targetRect) return {};

    const tooltipWidth = 320;
    const tooltipGap = 16;

    switch (config.position) {
      case "right":
        return {
          left: targetRect.right + tooltipGap,
          top: targetRect.top,
        };
      case "left":
        return {
          right: window.innerWidth - targetRect.left + tooltipGap,
          top: targetRect.top,
        };
      case "bottom":
        return {
          left: targetRect.left,
          top: targetRect.bottom + tooltipGap,
        };
      case "top":
        return {
          left: targetRect.left,
          bottom: window.innerHeight - targetRect.top + tooltipGap,
        };
      default:
        return {};
    }
  };

  const handleLinkClick = () => {
    if (config.link?.url) {
      window.systemAPI?.openExternal(config.link.url);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000]">
      {/* 어두운 오버레이 (spotlight 영역 제외) */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Spotlight 영역 (밝게 보이는 부분) */}
      {spotlightStyle && (
        <div
          className="absolute rounded-xl transition-all duration-300 ease-out"
          style={{
            ...spotlightStyle,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            background: "transparent",
          }}
        />
      )}

      {/* 툴팁 */}
      {targetRect && (
        <div
          className="absolute w-96 p-4 rounded-xl bg-bg-primary border border-base-border shadow-xl"
          style={getTooltipStyle()}
        >
          <h3 className="text-base font-semibold text-text-primary mb-2">
            {config.title}
          </h3>
          <p className="text-sm text-text-secondary mb-1 leading-relaxed">
            {config.description}
          </p>
          {config.link && (
            <div
              onClick={handleLinkClick}
              className="flex items-center justify-end gap-1 text-sm text-primary hover:underline mb-3"
            >
              <a>{config.link.text}</a>
              <FiExternalLink className="w-3 h-3" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={skipOnboarding}
              className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {t("onboarding.skip")}
            </button>
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {currentStep === "visualize"
                ? t("onboarding.complete")
                : t("onboarding.next")}
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 스킵 버튼 (우상단) */}
      <button
        onClick={skipOnboarding}
        className="absolute top-6 right-6 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      >
        <FiX className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}
