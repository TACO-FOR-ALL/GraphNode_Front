import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OnboardingStep =
  | "intro" // 문제 제기 화면
  | "solution" // 솔루션 소개 화면
  | "userType" // 사용자 유형 선택
  | "interests" // 관심 분야 선택
  | "toneSelection" // 에이전트 말투 선택
  | "permissions" // 시스템 권한 요청
  | "apiKey" // API 키 설정 하이라이트
  | "dataImport" // 데이터 가져오기 하이라이트
  | "visualize" // 시각화 페이지
  | "complete"; // 완료

export type UserType =
  | "developer"
  | "student"
  | "entrepreneur"
  | "researcher"
  | "creator"
  | "other";

export type AgentTone = "formal" | "friendly" | "casual";

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  isOnboardingActive: boolean;
  currentStep: OnboardingStep;

  // 사용자 선택값
  selectedUserType: UserType | null;
  selectedInterests: string[];
  selectedTone: AgentTone | null;

  startOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;

  setUserType: (type: UserType) => void;
  setInterests: (interests: string[]) => void;
  setTone: (tone: AgentTone) => void;
}

const STEP_ORDER: OnboardingStep[] = [
  "intro",
  "solution",
  "userType",
  "interests",
  "toneSelection",
  "permissions",
  "apiKey",
  "dataImport",
  "visualize",
  "complete",
];

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      isOnboardingActive: false,
      currentStep: "intro",
      selectedUserType: null,
      selectedInterests: [],
      selectedTone: null,

      startOnboarding: () => {
        set({
          isOnboardingActive: true,
          currentStep: "intro",
        });
      },

      nextStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        const nextIndex = currentIndex + 1;

        if (nextIndex < STEP_ORDER.length) {
          const nextStep = STEP_ORDER[nextIndex];
          if (nextStep === "complete") {
            set({
              hasCompletedOnboarding: true,
              isOnboardingActive: false,
              currentStep: "complete",
            });
          } else {
            set({ currentStep: nextStep });
          }
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          set({ currentStep: STEP_ORDER[prevIndex] });
        }
      },

      skipOnboarding: () => {
        set({
          hasCompletedOnboarding: true,
          isOnboardingActive: false,
          currentStep: "complete",
        });
      },

      completeOnboarding: () => {
        set({
          hasCompletedOnboarding: true,
          isOnboardingActive: false,
          currentStep: "complete",
        });
      },

      resetOnboarding: () => {
        set({
          hasCompletedOnboarding: false,
          isOnboardingActive: false,
          currentStep: "intro",
          selectedUserType: null,
          selectedInterests: [],
          selectedTone: null,
        });
      },

      setUserType: (type) => set({ selectedUserType: type }),
      setInterests: (interests) => set({ selectedInterests: interests }),
      setTone: (tone) => set({ selectedTone: tone }),
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        selectedUserType: state.selectedUserType,
        selectedInterests: state.selectedInterests,
        selectedTone: state.selectedTone,
      }),
    },
  ),
);
