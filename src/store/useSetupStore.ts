import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SetupState {
  hasCompletedSetup: boolean;
  completeSetup: () => void;
}

export const useSetupStore = create<SetupState>()(
  persist(
    (set) => ({
      hasCompletedSetup: false,
      completeSetup: () => set({ hasCompletedSetup: true }),
    }),
    {
      name: "graphnode-setup",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
