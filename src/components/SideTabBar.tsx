import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function SideTabBar() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex flex-col w-28 bg-amber-100">
      <button onClick={() => navigate("/")}>{t("sideTabBar.home")}</button>
      <button onClick={() => navigate("/visualize")}>
        {t("sideTabBar.visualize")}
      </button>
      <button onClick={() => navigate("/settings")}>
        {t("sideTabBar.settings")}
      </button>
    </div>
  );
}
