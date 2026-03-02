import { useTranslation } from "react-i18next";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import { FiMessageSquare, FiFileText, FiSearch, FiX } from "react-icons/fi";

export default function OnboardingIntro() {
  const { t } = useTranslation();
  const { currentStep, nextStep, skipOnboarding } = useOnboardingStore();

  if (currentStep !== "intro") return null;

  const painPoints = [
    {
      icon: <FiMessageSquare className="w-6 h-6" />,
      color: "bg-blue-500/20 text-blue-500",
      text: t("onboarding.intro.painPoint1"),
    },
    {
      icon: <FiFileText className="w-6 h-6" />,
      color: "bg-purple-500/20 text-purple-500",
      text: t("onboarding.intro.painPoint2"),
    },
    {
      icon: <FiSearch className="w-6 h-6" />,
      color: "bg-orange-500/20 text-orange-500",
      text: t("onboarding.intro.painPoint3"),
    },
  ];

  return (
    <div className="fixed inset-0 z-[10000] bg-bg-primary flex flex-col items-center justify-center p-8">
      {/* 스킵 버튼 */}
      <button
        onClick={skipOnboarding}
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 text-sm text-text-tertiary hover:text-text-primary transition-colors"
      >
        {t("onboarding.skip")}
        <FiX className="w-4 h-4" />
      </button>

      <div className="max-w-2xl w-full flex flex-col items-center text-center">
        {/* 타이틀 */}
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          {t("onboarding.intro.title")}
        </h1>

        {/* 서브타이틀 */}
        <p className="text-lg text-text-secondary mb-12">
          {t("onboarding.intro.subtitle")}
        </p>

        {/* 문제점 블록 3개 */}
        <div className="w-full space-y-4 mb-12">
          {painPoints.map((point, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-5 rounded-xl bg-bg-secondary border border-base-border text-left"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${point.color}`}
              >
                {point.icon}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed pt-2">
                {point.text}
              </p>
            </div>
          ))}
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={nextStep}
          className="px-8 py-3 bg-primary text-white rounded-xl font-medium text-base hover:bg-primary/90 transition-colors"
        >
          {t("onboarding.next")}
        </button>
      </div>
    </div>
  );
}
