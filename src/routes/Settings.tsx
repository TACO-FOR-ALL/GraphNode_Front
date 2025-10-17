import { useTranslation } from "react-i18next";
import i18n from "../i18n";

export default function Settings() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("settings.title")}</h1>
      <div>
        <button onClick={() => i18n.changeLanguage("ko")}>
          {t("settings.language.ko")}
        </button>
        <button onClick={() => i18n.changeLanguage("en")}>
          {t("settings.language.en")}
        </button>
        <button onClick={() => i18n.changeLanguage("zh")}>
          {t("settings.language.zh")}
        </button>
      </div>
    </div>
  );
}
