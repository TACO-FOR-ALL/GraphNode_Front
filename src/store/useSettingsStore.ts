import { create } from "zustand";

interface SettingsState {
  desktopNotification: boolean;
  setDesktopNotification: (value: boolean) => void;
  loadSettings: () => Promise<void>;
}

const WEB_SETTINGS_STORAGE_KEY = "graphnode-web-settings";

function saveWebSettings(settings: { desktopNotification: boolean }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(WEB_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function loadWebSettings(): { desktopNotification: boolean } | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(WEB_SETTINGS_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as { desktopNotification: boolean };
  } catch {
    localStorage.removeItem(WEB_SETTINGS_STORAGE_KEY);
    return null;
  }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  desktopNotification: true,

  setDesktopNotification: (value) => {
    set({ desktopNotification: value });
    if (window.systemAPI) {
      window.systemAPI.saveSettings({ desktopNotification: value });
      return;
    }

    saveWebSettings({ desktopNotification: value });
  },

  loadSettings: async () => {
    if (window.systemAPI) {
      const settings = await window.systemAPI.getSettings();
      set({ desktopNotification: settings.desktopNotification });
      return;
    }

    const settings = loadWebSettings();
    if (!settings) return;

    set({ desktopNotification: settings.desktopNotification });
  },
}));
