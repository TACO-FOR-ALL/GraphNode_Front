import { create } from "zustand";
import type { ChatThread } from "@/types/Chat";
import threadRepo from "@/managers/threadRepo";

interface ThreadState {
  threads: Record<string, ChatThread>;
  refreshThread: (id: string) => Promise<void>;
  updateThreadInStore: (thread: ChatThread) => void;
  evictThread: (id: string) => void;
}

export const useThreadsStore = create<ThreadState>((set) => ({
  threads: {},

  refreshThread: async (id) => {
    const th = await threadRepo.getThreadById(id);
    if (!th) return;
    set((s) => {
      const existing = s.threads[id];
      // 스트리밍 중에는 서버 데이터가 더 오래된 상태일 수 있으므로,
      // 로컬 메시지가 더 많다면 서버 응답으로 덮어쓰지 않는다.
      if (existing && existing.messages.length > th.messages.length) return s;
      return { threads: { ...s.threads, [id]: th } };
    });
  },

  updateThreadInStore: (thread) => {
    set((s) => ({ threads: { ...s.threads, [thread.id]: thread } }));
  },

  evictThread: (id) => {
    set((s) => {
      const next = { ...s.threads };
      delete next[id];
      return { threads: next };
    });
  },
}));
