import { create } from "zustand";
import type { ChatThread } from "@/types/Chat";
import threadRepo from "@/managers/threadRepo";

interface ThreadState {
  threads: Record<string, ChatThread>;
  refreshThread: (id: string) => Promise<void>;
  updateThreadInStore: (thread: ChatThread) => void;
}

export const useThreadsStore = create<ThreadState>((set) => ({
  threads: {},

  refreshThread: async (id) => {
    const th = await threadRepo.getThreadById(id);
    if (th) set((s) => ({ threads: { ...s.threads, [id]: th } }));
  },

  updateThreadInStore: (thread) => {
    set((s) => ({ threads: { ...s.threads, [thread.id]: thread } }));
  },
}));
