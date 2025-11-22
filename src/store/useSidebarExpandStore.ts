import { create } from "zustand";

interface SidebarExpandState {
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
}

export const useSidebarExpandStore = create<SidebarExpandState>((set) => ({
  isExpanded: true,
  setIsExpanded: (isExpanded) => set({ isExpanded }),
}));
