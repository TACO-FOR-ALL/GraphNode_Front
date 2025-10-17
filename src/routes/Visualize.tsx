import { useTranslation } from "react-i18next";

export default function Visualize() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("visualize.title")}</h1>
    </div>
  );
}
