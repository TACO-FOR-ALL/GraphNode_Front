import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GraphGenerationState {
  isGenerating: boolean;
  setGenerating: (isGenerating: boolean) => void;
}

export const useGraphGenerationStore = create<GraphGenerationState>()(
  persist(
    (set) => ({
      isGenerating: false,
      setGenerating: (isGenerating) => set({ isGenerating }),
    }),
    {
      name: "graph-generation-state",
    },
  ),
);
