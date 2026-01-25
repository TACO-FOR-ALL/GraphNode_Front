import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CurrentHighlightState {
  currentHighlight: string;
  setCurrentHighlight: (currentHighlight: string) => void;
}

export const useCurrentHightlightStore = create<CurrentHighlightState>()(
  persist(
    (set) => ({
      currentHighlight: "androidstudio",
      setCurrentHighlight: (currentHighlight) => set({ currentHighlight }),
    }),
    { name: "highlight-store" },
  ),
);
