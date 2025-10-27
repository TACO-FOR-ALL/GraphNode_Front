import { create } from "zustand";

interface ThreadStore {
  selectedThreadId: string;
  setSelectedThreadId: (id: string) => void;
}

export const useSelectedThreadStore = create<ThreadStore>((set) => ({
  selectedThreadId: "",
  setSelectedThreadId: (id: string) => set({ selectedThreadId: id }),
}));
