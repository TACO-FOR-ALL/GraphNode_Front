import { create } from "zustand";


interface GraphGenerationState {
  isGenerating: boolean;
  setGenerating: (isGenerating: boolean) => void;
}

export const useGraphGenerationStore = create<GraphGenerationState>()((set) => ({
  isGenerating: false,
  setGenerating: (isGenerating) => set({ isGenerating }),
}));
