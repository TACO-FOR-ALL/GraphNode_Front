import React from "react";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import OnboardingIntro from "./OnboardingIntro";
import OnboardingSolution from "./OnboardingSolution";
import OnboardingUserType from "./OnboardingUserType";
import OnboardingInterests from "./OnboardingInterests";
import OnboardingToneSelection from "./OnboardingToneSelection";
import OnboardingPermissions from "./OnboardingPermissions";
import SpotlightOverlay from "./SpotlightOverlay";

export default function Onboarding() {
  const { isOnboardingActive, currentStep } = useOnboardingStore();

  if (!isOnboardingActive) return null;

  const modalSteps: Partial<Record<typeof currentStep, React.ReactElement>> = {
    intro: <OnboardingIntro />,
    solution: <OnboardingSolution />,
    userType: <OnboardingUserType />,
    interests: <OnboardingInterests />,
    toneSelection: <OnboardingToneSelection />,
    permissions: <OnboardingPermissions />,
  };
  const modalStep = modalSteps[currentStep];

  const isSpotlightStep =
    currentStep === "apiKey" ||
    currentStep === "dataImport" ||
    currentStep === "visualize";

  return (
    <>
      {modalStep ?? null}
      {isSpotlightStep && <SpotlightOverlay />}
    </>
  );
}
