import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ChangelogState {
  lastSeenVersion: string | null;
  isModalOpen: boolean;
  setLastSeenVersion: (version: string) => void;
  setModalOpen: (open: boolean) => void;
  resetLastSeenVersion: () => void;
}

export const useChangelogStore = create<ChangelogState>()(
  persist(
    (set) => ({
      lastSeenVersion: null,
      isModalOpen: false,
      setLastSeenVersion: (version) => set({ lastSeenVersion: version }),
      setModalOpen: (open) => set({ isModalOpen: open }),
      resetLastSeenVersion: () => set({ lastSeenVersion: null }),
    }),
    {
      name: "changelog-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lastSeenVersion: state.lastSeenVersion }),
    },
  ),
);
