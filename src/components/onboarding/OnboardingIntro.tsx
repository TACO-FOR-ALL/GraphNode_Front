import { useTranslation } from "react-i18next";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { FiMessageSquare, FiFileText, FiSearch } from "react-icons/fi";
import OnboardingModal from "./OnboardingModal";

export default function OnboardingIntro() {
  const { t } = useTranslation();
  const { nextStep } = useOnboardingStore();

  const painPoints = [
    {
      icon: <FiMessageSquare className="w-5 h-5" />,
      color: "bg-blue-500/20 text-blue-500",
      text: t("onboarding.intro.painPoint1"),
    },
    {
      icon: <FiFileText className="w-5 h-5" />,
      color: "bg-purple-500/20 text-purple-500",
      text: t("onboarding.intro.painPoint2"),
    },
    {
      icon: <FiSearch className="w-5 h-5" />,
      color: "bg-orange-500/20 text-orange-500",
      text: t("onboarding.intro.painPoint3"),
    },
  ];

  return (
    <OnboardingModal>
      <div className="flex flex-col items-center text-center px-8 pt-6 pb-8">
        {/* 타이틀 */}
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          {t("onboarding.intro.title")}
        </h1>

        {/* 서브타이틀 */}
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">
          {t("onboarding.intro.subtitle")}
        </p>

        {/* 문제점 블록 3개 */}
        <div className="w-full space-y-3 mb-7">
          {painPoints.map((point, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-4 rounded-xl bg-bg-secondary border border-base-border text-left"
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${point.color}`}
              >
                {point.icon}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed pt-1">
                {point.text}
              </p>
            </div>
          ))}
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={nextStep}
          className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          {t("onboarding.next")}
        </button>
      </div>
    </OnboardingModal>
  );
}
