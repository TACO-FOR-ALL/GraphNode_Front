import { create } from "zustand";

interface ThreadTitleState {
  threadTitleChanged: boolean;
  setThreadTitleChanged: (changed: boolean) => void;
}

export const useThreadTitleStore = create<ThreadTitleState>((set) => ({
  threadTitleChanged: false,
  setThreadTitleChanged: (changed) => set({ threadTitleChanged: changed }),
}));
