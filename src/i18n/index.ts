// src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ko from "./locales/ko.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";

const supportedLangs = ["en", "ko", "zh", "ja"];

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

export async function initI18n() {
  const detectedLang = await detectSystemLanguage();

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
