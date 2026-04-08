import { useEffect, useState, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useOnboardingStore, OnboardingStep } from "@/store/useOnboardingStore";
import { useSidebarSettingsStore } from "@/store/useSidebarSettingsStore";
import { FiArrowRight, FiExternalLink } from "react-icons/fi";
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

  // 애니메이션 상태
  // isContracting=true: 스포트라이트가 전체화면 → 이때 오버레이 보이지 않음
  // isContracting=false: 스포트라이트가 타겟 크기로 수축 → 주변이 어두워짐
  const [isContracting, setIsContracting] = useState(true);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const lastAnimatedStep = useRef<OnboardingStep | null>(null);
  const animTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // useMemo로 안정적인 참조 유지: config가 effect 4의 deps에 있어서,
  // 매 렌더마다 새 객체가 생성되면 타이머 cleanup이 호출되어 tooltipVisible 타이머가 취소됨
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spotlightConfigs: SpotlightConfig[] = useMemo(
    () => [
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
        position: "top",
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [t],
  );

  const config = spotlightConfigs.find((c) => c.step === currentStep);

  // 스텝 변경 시 애니메이션 상태 리셋 + 이전 스텝의 targetRect 초기화
  useEffect(() => {
    setIsContracting(true);
    setTooltipVisible(false);
    setTargetRect(null);
  }, [currentStep]);

  // 페이지 이동 및 타겟 요소 찾기
  useEffect(() => {
    if (!config || !isOnboardingActive) return;

    if (navigatedStepRef.current !== currentStep) {
      navigatedStepRef.current = currentStep;
      if (config.settingsCategory)
        setSelectedCategory({ id: config.settingsCategory });
      if (config.navigateTo) navigate(config.navigateTo);
    }

    const findTarget = () => {
      const target = document.querySelector(config.targetSelector);
      if (target) {
        setTargetRect(target.getBoundingClientRect()); // DOM 요소의 화면상 위치의 크기를 픽셀 단위로 반환하는 브라우저 내장 API
      } else {
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
      if (target) setTargetRect(target.getBoundingClientRect());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [config]);

  // targetRect이 세팅되면 수축 애니메이션 시작 (스텝당 한 번만)
  useEffect(() => {
    if (!targetRect || !config) return;
    if (lastAnimatedStep.current === currentStep) return;
    lastAnimatedStep.current = currentStep;

    animTimers.current.forEach(clearTimeout);
    animTimers.current = [];

    // 전체화면 상태에서 시작 (오버레이 없음)
    setIsContracting(true);
    setTooltipVisible(false);

    // 50ms 후 수축 시작 → 주변이 어두워지는 애니메이션
    const t1 = setTimeout(() => setIsContracting(false), 50);
    // 700ms 후 툴팁 등장 (수축 애니메이션 600ms 완료 후)
    const t2 = setTimeout(() => setTooltipVisible(true), 700);
    animTimers.current = [t1, t2];

    return () => animTimers.current.forEach(clearTimeout);
    // targetRect만 의존: config/currentStep이 변경될 때 premature 실행 방지
    // effect 1이 targetRect를 null로 초기화 → effect 2가 새 rect를 세팅할 때만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRect]);

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
    const tooltipGap = 16;
    switch (config.position) {
      case "right":
        return { left: targetRect.right + tooltipGap, top: targetRect.top };
      case "left":
        return {
          right: window.innerWidth - targetRect.left + tooltipGap,
          top: targetRect.top,
        };
      case "bottom":
        return { left: targetRect.left, top: targetRect.bottom + tooltipGap };
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
      if (window.systemAPI) {
        window.systemAPI.openExternal(config.link.url);
      } else {
        window.open(config.link.url, "_blank");
      }
    }
  };

  // 수축 중(isContracting=true)이면 전체화면을 덮어 오버레이가 안 보이게 함
  // 수축 완료(isContracting=false)이면 타겟 rect 크기로 전환 → 주변이 어두워짐
  const currentSpotlightStyle = isContracting
    ? { left: 0, top: 0, width: "100%", height: "100%", borderRadius: "0px" }
    : spotlightStyle
      ? { ...spotlightStyle, borderRadius: "12px" }
      : null;

  return (
    <div className="fixed inset-0 z-[10000]">
      {/* 스포트라이트 (box-shadow로 주변 어둡게, 내부는 투명) */}
      {currentSpotlightStyle && (
        <div
          style={{
            position: "absolute",
            ...currentSpotlightStyle,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
            background: "transparent",
            // isContracting=true→false 전환 시에만 트랜지션, 리셋은 즉시
            transition: isContracting
              ? "none"
              : "left 600ms cubic-bezier(0.4, 0, 0.2, 1), top 600ms cubic-bezier(0.4, 0, 0.2, 1), width 600ms cubic-bezier(0.4, 0, 0.2, 1), height 600ms cubic-bezier(0.4, 0, 0.2, 1), border-radius 600ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      )}

      {/* 툴팁 (수축 완료 후 등장) */}
      {targetRect && (
        <div
          className="absolute w-96 p-4 rounded-xl bg-bg-primary border border-base-border shadow-xl select-none"
          style={{
            ...getTooltipStyle(),
            opacity: tooltipVisible ? 1 : 0,
            transform: tooltipVisible ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 300ms ease-out, transform 300ms ease-out",
          }}
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
              className="flex items-center justify-end gap-1 text-sm text-primary hover:underline mb-3 cursor-pointer"
            >
              <span>{config.link.text}</span>
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
              onClick={() => {
                nextStep();
                if (currentStep === "visualize") navigate("/");
              }}
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
    </div>
  );
}
