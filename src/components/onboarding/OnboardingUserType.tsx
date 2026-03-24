import { useTranslation } from "react-i18next";
import { useOnboardingStore, UserType } from "@/store/useOnboardingStore";
import OnboardingModal from "./OnboardingModal";
import { FiCode, FiBook, FiBriefcase, FiSearch, FiEdit3, FiMoreHorizontal } from "react-icons/fi";

const USER_TYPES: { id: UserType; icon: React.ReactNode; color: string }[] = [
  { id: "developer", icon: <FiCode className="w-5 h-5" />, color: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  { id: "student", icon: <FiBook className="w-5 h-5" />, color: "bg-green-500/15 text-green-500 border-green-500/30" },
  { id: "entrepreneur", icon: <FiBriefcase className="w-5 h-5" />, color: "bg-orange-500/15 text-orange-500 border-orange-500/30" },
  { id: "researcher", icon: <FiSearch className="w-5 h-5" />, color: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
  { id: "creator", icon: <FiEdit3 className="w-5 h-5" />, color: "bg-pink-500/15 text-pink-500 border-pink-500/30" },
  { id: "other", icon: <FiMoreHorizontal className="w-5 h-5" />, color: "bg-text-tertiary/15 text-text-secondary border-base-border" },
];

export default function OnboardingUserType() {
  const { t } = useTranslation();
  const { nextStep, selectedUserType, setUserType } = useOnboardingStore();

  const handleSelect = (type: UserType) => {
    setUserType(type);
  };

  return (
    <OnboardingModal>
      <div className="flex flex-col px-8 pt-6 pb-8">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {t("onboarding.userType.title")}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t("onboarding.userType.subtitle")}
          </p>
        </div>

        {/* 선택지 그리드 */}
        <div className="grid grid-cols-2 gap-3 mb-7">
          {USER_TYPES.map(({ id, icon, color }) => {
            const isSelected = selectedUserType === id;
            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={`
                  flex items-center gap-3 p-4 rounded-xl border-2 text-left
                  transition-all duration-200
                  ${isSelected
                    ? "border-primary bg-primary/8 shadow-sm"
                    : "border-base-border bg-bg-secondary hover:border-primary/40 hover:bg-bg-secondary"
                  }
                `}
              >
                {/* 아이콘 */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all duration-200 ${
                    isSelected ? "bg-primary/15 text-primary border-primary/30" : color
                  }`}
                >
                  {icon}
                </div>

                {/* 텍스트 */}
                <div className="flex-1">
                  <p className={`text-sm font-semibold transition-colors duration-200 ${isSelected ? "text-primary" : "text-text-primary"}`}>
                    {t(`onboarding.userType.types.${id}`)}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {t(`onboarding.userType.desc.${id}`)}
                  </p>
                </div>

                {/* 선택 인디케이터 */}
                <div
                  className={`
                    flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center self-center
                    transition-all duration-200
                    ${isSelected ? "border-primary bg-primary" : "border-base-border"}
                  `}
                >
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={nextStep}
          disabled={!selectedUserType}
          className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          {t("onboarding.next")}
        </button>
      </div>
    </OnboardingModal>
  );
}
