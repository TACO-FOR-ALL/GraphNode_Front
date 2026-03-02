import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OnboardingStep =
  | "intro" // 문제 제기 화면
  | "solution" // 솔루션 소개 화면
  | "apiKey" // API 키 설정 하이라이트
  | "dataImport" // 데이터 가져오기 하이라이트
  | "visualize" // 시각화 페이지
  | "complete"; // 완료

interface OnboardingState {
  hasCompletedOnboarding: boolean;
  isOnboardingActive: boolean;
  currentStep: OnboardingStep;

  startOnboarding: () => void;
  nextStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void; // 개발/테스트용
}

const STEP_ORDER: OnboardingStep[] = [
  "intro",
  "solution",
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
        });
      },
    }),
    {
      name: "onboarding-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    },
  ),
);
