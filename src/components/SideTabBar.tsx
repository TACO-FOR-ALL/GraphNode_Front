import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import ChatList from "./ChatList";

export default function SideTabBar() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const path = useLocation().pathname;

  return (
    <div className="flex h-full">
      <div className="flex flex-col w-28 bg-amber-100">
        <button onClick={() => navigate("/")}>{t("sideTabBar.home")}</button>
        <button onClick={() => navigate("/visualize")}>
          {t("sideTabBar.visualize")}
        </button>
        <button onClick={() => navigate("/settings")}>
          {t("sideTabBar.settings")}
        </button>
        <button onClick={() => navigate("/search")}>
          {t("sideTabBar.search")}
        </button>
      </div>
      {path === "/" && <ChatList />}
    </div>
  );
}
