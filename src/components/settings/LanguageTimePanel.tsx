import i18n from "@/i18n";
import SettingsPanelLayout from "./SettingsPanelLayout";
import SettingCategoryTitle from "./SettingCategoryTitle";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";

const languages = [
  { code: "ko", key: "settings.language.ko" },
  { code: "en", key: "settings.language.en" },
  { code: "zh", key: "settings.language.zh" },
] as const;

const timeFormats = [
  { value: "auto", key: "settings.timeFormat.auto" },
  { value: "12hour", key: "settings.timeFormat.12hour" },
  { value: "24hour", key: "settings.timeFormat.24hour" },
] as const;

type TimeFormat = "auto" | "12hour" | "24hour";

export default function LanguageTimePanel() {
  const { t, i18n: i18nInstance } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("auto");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const currentLangCode = i18nInstance.language.split("-")[0];
  const currentLanguage =
    languages.find((lang) => lang.code === currentLangCode) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <SettingsPanelLayout>
      <div className="flex flex-col items-start justify-start gap-4 w-full">
        <SettingCategoryTitle
          title={t("settings.language.title")}
          subtitle={t("settings.language.subtitle")}
        />
        <div className="relative w-full" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between border border-solid border-text-tertiary rounded-sm px-4 py-2 text-[14px] hover:bg-text-tertiary/10 transition-colors duration-200"
          >
            <span>{t(currentLanguage.key)}</span>
            {isOpen ? (
              <IoIosArrowUp className="text-[16px]" />
            ) : (
              <IoIosArrowDown className="text-[16px]" />
            )}
          </button>
          {isOpen && (
            <div className="absolute top-full left-0 mt-2 w-full border border-solid border-text-tertiary rounded-sm bg-background-primary shadow-lg z-10 bg-white">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full text-left px-4 py-2 text-[14px] hover:bg-text-tertiary/10 transition-colors duration-200 first:rounded-t-sm last:rounded-b-sm ${
                    lang.code === currentLangCode
                      ? "bg-text-tertiary/20 font-medium"
                      : ""
                  }`}
                >
                  {t(lang.key)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-start justify-start gap-4 w-full">
        <SettingCategoryTitle title={t("settings.timeFormat.title")} />
        <div className="flex flex-col items-start justify-start gap-3 w-full">
          {timeFormats.map((format) => (
            <label
              key={format.value}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <input
                  type="radio"
                  name="timeFormat"
                  value={format.value}
                  checked={timeFormat === format.value}
                  onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 border-solid transition-all duration-200 flex items-center justify-center ${
                    timeFormat === format.value
                      ? "border-primary"
                      : "border-text-tertiary"
                  }`}
                >
                  {timeFormat === format.value && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>
              <span className="text-[14px]">{t(format.key)}</span>
            </label>
          ))}
        </div>
      </div>
    </SettingsPanelLayout>
  );
}
