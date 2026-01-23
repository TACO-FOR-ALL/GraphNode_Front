import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface FirstRunState {
  isFirstRun: boolean;
  setIsFirstRun: (isFirstRun: boolean) => void;
}

export const useFirstRunStorage = create<FirstRunState>()(
  persist(
    (set) => ({
      isFirstRun: false,
      setIsFirstRun: (isFirstRun) => set({ isFirstRun }),
    }),
    {
      name: "firstrun-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
