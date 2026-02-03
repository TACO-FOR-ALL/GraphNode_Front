import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

export interface AppSettings {
  hardwareAcceleration: boolean;
  desktopNotification: boolean;
}

const defaultSettings: AppSettings = {
  hardwareAcceleration: true,
  desktopNotification: true,
};

function getSettingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

export function loadSettings(): AppSettings {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, "utf-8");
      return { ...defaultSettings, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return defaultSettings;
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  try {
    const currentSettings = loadSettings();
    const newSettings = { ...currentSettings, ...settings };
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2));
    return newSettings;
  } catch (error) {
    console.error("Failed to save settings:", error);
    return loadSettings();
  }
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return loadSettings()[key];
}
