import { create } from "zustand";
import SettingsCategory from "@/types/SettingsCategory";

interface SidebarSettingsState {
  selectedCategory: SettingsCategory;
  setSelectedCategory: (category: SettingsCategory) => void;
}

export const useSidebarSettingsStore = create<SidebarSettingsState>()(
  (set) => ({
    selectedCategory: { id: "my-account" },
    setSelectedCategory: (category) => set({ selectedCategory: category }),
  })
);
