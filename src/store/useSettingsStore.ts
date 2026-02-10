import { create } from "zustand";

interface SettingsState {
  desktopNotification: boolean;
  setDesktopNotification: (value: boolean) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  desktopNotification: true,

  setDesktopNotification: (value) => {
    set({ desktopNotification: value });
    window.systemAPI?.saveSettings({ desktopNotification: value });
  },

  loadSettings: async () => {
    const settings = await window.systemAPI?.getSettings();
    if (settings) {
      set({ desktopNotification: settings.desktopNotification });
    }
  },
}));
