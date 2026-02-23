// src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ko from "./locales/ko.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";

export type SupportedLangs = "en" | "ko" | "zh" | "ja";

const supportedLangs = ["en", "ko", "zh", "ja"];
const LANGUAGE_STORAGE_KEY = "graphnode-language";

async function detectSystemLanguage() {
  try {
    const systemLang = await window.systemAPI?.getLocale();
    if (systemLang) {
      const shortCode = systemLang.split("-")[0]; // ex) 'en-US' → 'en'
      if (supportedLangs.includes(shortCode)) return shortCode;
    }
  } catch (e) {
    console.warn("Failed to get system language:", e);
  }

  // fallback
  return "en";
}

function getSavedLanguage(): SupportedLangs | null {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && supportedLangs.includes(saved)) {
      return saved as SupportedLangs;
    }
  } catch (e) {
    console.warn("Failed to get saved language:", e);
  }
  return null;
}

export function saveLanguage(lang: SupportedLangs): boolean {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    return true;
  } catch (e) {
    console.warn("Failed to save language:", e);
    return false;
  }
}

export async function initI18n() {
  // 저장된 언어 설정 우선, 없으면 시스템 언어 감지
  const savedLang = getSavedLanguage();
  const detectedLang = savedLang ?? (await detectSystemLanguage());

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
      zh: { translation: zh },
      ja: { translation: ja },
    },
    lng: detectedLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

  return i18n;
}

export default i18n;
