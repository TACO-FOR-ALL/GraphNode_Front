import { create } from "zustand";

interface SyncState {
  isSyncronized: boolean;
  setIsSyncronized: (isSyncronized: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSyncronized: false,
  setIsSyncronized: (isSyncronized) => set({ isSyncronized }),
}));
