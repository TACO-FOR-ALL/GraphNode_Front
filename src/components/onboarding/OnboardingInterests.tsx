import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import OnboardingModal from "./OnboardingModal";
import { FiPlus, FiX } from "react-icons/fi";

export default function OnboardingInterests() {
  const { t } = useTranslation();
  const { nextStep, selectedInterests, setInterests } = useOnboardingStore();
  const presetInterests = t("onboarding.interests.presets", { returnObjects: true }) as string[];
  const [customInput, setCustomInput] = useState("");

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setInterests([...selectedInterests, interest]);
    }
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selectedInterests.includes(trimmed)) {
      setInterests([...selectedInterests, trimmed]);
    }
    setCustomInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustom();
    }
  };

  return (
    <OnboardingModal>
      <div className="flex flex-col px-8 pt-6 pb-8">
        {/* 헤더 */}
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {t("onboarding.interests.title")}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t("onboarding.interests.subtitle")}
          </p>
        </div>

        {/* 선택된 관심사 태그 */}
        {selectedInterests.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20 min-h-[44px]">
            {selectedInterests.map((interest) => (
              <span
                key={interest}
                className="flex items-center gap-1 px-2.5 py-2 rounded-full bg-primary text-white text-xs font-medium"
              >
                {interest}
                <div
                  onClick={() => toggleInterest(interest)}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                >
                  <FiX className="w-3 h-3" />
                </div>
              </span>
            ))}
          </div>
        )}

        {/* 프리셋 관심사 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {presetInterests.map((interest) => {
            const isSelected = selectedInterests.includes(interest);
            return (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200
                  ${
                    isSelected
                      ? "bg-primary text-white border-primary"
                      : "bg-bg-secondary text-text-secondary border-base-border hover:border-primary/50 hover:text-primary"
                  }
                `}
              >
                {interest}
              </button>
            );
          })}
        </div>

        {/* 직접 입력 */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("onboarding.interests.placeholder")}
            className="flex-1 px-4 py-2.5 rounded-xl bg-bg-secondary border border-base-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-bg-secondary border border-base-border text-text-secondary hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            <FiPlus className="w-4 h-4" />
          </button>
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={nextStep}
          className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          {selectedInterests.length === 0
            ? t("onboarding.interests.skipText")
            : t("onboarding.next")}
        </button>
      </div>
    </OnboardingModal>
  );
}
