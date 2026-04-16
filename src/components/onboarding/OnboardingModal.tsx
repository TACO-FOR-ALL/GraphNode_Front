import { useTranslation } from "react-i18next";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import logoSrc from "@/assets/icons/logo.svg";
import { WebAppFrameBar } from "@/components/WebAppFrameBar";
import { IoArrowBack } from "react-icons/io5";

interface OnboardingModalProps {
  children: React.ReactNode;
}

const MODAL_STEPS = [
  "intro",
  "solution",
  "userType",
  "interests",
  "toneSelection",
  "permissions",
];

export default function OnboardingModal({ children }: OnboardingModalProps) {
  const { t } = useTranslation();
  const { skipOnboarding, prevStep, currentStep } = useOnboardingStore();

  const canGoBack =
    currentStep === "interests" ||
    currentStep === "toneSelection" ||
    currentStep === "permissions";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* 모달 - 고정 가로 크기 */}
      <div className="relative w-[780px] max-w-[calc(100vw-48px)] max-h-[85vh] rounded-2xl bg-bg-primary border border-base-border shadow-2xl overflow-hidden flex flex-col select-none">
        {/* 플랫폼 프레임바 */}
        <WebAppFrameBar onClose={skipOnboarding} />
        {/* 우하단 로고 워터마크 (z-0, 컨텐츠 아래) */}
        <div className="absolute bottom-0 right-0 pointer-events-none overflow-hidden w-64 h-64 z-0">
          <img
            src={logoSrc}
            alt=""
            className="absolute -bottom-10 -right-10 w-56 h-56 opacity-[0.12]"
          />
        </div>
        {/* 뒤로가기 바 — flex 흐름에 포함해 콘텐츠와 겹치지 않게 */}
        {canGoBack && (
          <div className="absolute top-7 left-0 z-20 h-10 flex items-center px-5 mt-2 flex-shrink-0">
            <button
              onClick={prevStep}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors duration-150"
              aria-label={t("onboarding.back")}
            >
              <IoArrowBack className="w-3.5 h-3.5" />
              {t("onboarding.back")}
            </button>
          </div>
        )}
        {/* 컨텐츠 (z-10, 로고 위) */}
        <div className="relative z-10 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
