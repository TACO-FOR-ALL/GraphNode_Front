import { useOnboardingStore } from "@/store/useOnboardingStore";
import OnboardingIntro from "./OnboardingIntro";
import OnboardingSolution from "./OnboardingSolution";
import SpotlightOverlay from "./SpotlightOverlay";

export default function Onboarding() {
  const { isOnboardingActive, currentStep } = useOnboardingStore();

  if (!isOnboardingActive) return null;

  return (
    <>
      {/* 전체 화면 인트로 (Step 1-2) */}
      <OnboardingIntro />
      <OnboardingSolution />

      {/* 스포트라이트 오버레이 (Step 3-5) */}
      {(currentStep === "apiKey" ||
        currentStep === "dataImport" ||
        currentStep === "visualize") && <SpotlightOverlay />}
    </>
  );
}
