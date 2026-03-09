import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface FirstRunState {
  isFirstRun: boolean;
  languageSynced: boolean;
  setIsFirstRun: (isFirstRun: boolean) => void;
  setLanguageSynced: (synced: boolean) => void;
}

export const useFirstRunStorage = create<FirstRunState>()(
  persist(
    (set) => ({
      isFirstRun: false,
      languageSynced: false,
      setIsFirstRun: (isFirstRun) => set({ isFirstRun }),
      setLanguageSynced: (synced) => set({ languageSynced: synced }),
    }),
    {
      name: "firstrun-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
