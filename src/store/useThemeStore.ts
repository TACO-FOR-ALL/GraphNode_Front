import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type AppTheme = "light" | "dark" | "system";

interface ThemeState {
  theme: "light" | "dark" | "system";
  setTheme: (theme: AppTheme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist((set) => ({ theme: "light", setTheme: (theme) => set({ theme }) }), {
    name: "theme-storage",
    storage: createJSONStorage(() => localStorage), // default
  }),
);
