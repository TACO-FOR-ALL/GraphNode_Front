import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MicroscopeGenerationState {
  isGenerating: boolean;
  setGenerating: (isGenerating: boolean) => void;
}

export const useMicroscopeGenerationStore =
  create<MicroscopeGenerationState>()(
    persist(
      (set) => ({
        isGenerating: false,
        setGenerating: (isGenerating) => set({ isGenerating }),
      }),
      {
        name: "microscope-generation-state",
      },
    ),
  );
