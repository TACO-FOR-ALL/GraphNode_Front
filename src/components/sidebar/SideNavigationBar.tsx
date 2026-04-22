import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import LogoIcon from "@/assets/icons/logo.svg";
import { RiChatNewLine } from "react-icons/ri";
import { FiFileText, FiSearch, FiSettings, FiShare2 } from "react-icons/fi";
import {
  IoNotificationsOutline,
  IoNotificationsOffOutline,
  IoFlaskOutline,
} from "react-icons/io5";
import { IconType } from "react-icons/lib";
import { TbMicroscope } from "react-icons/tb";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useSettingsStore } from "@/store/useSettingsStore";

type NavItem = {
  id: string;
  Icon: IconType;
};

const NAVIGATION_ITEMS: NavItem[] = [
  { id: "chat", Icon: RiChatNewLine },
  { id: "notes", Icon: FiFileText },
  { id: "visualize", Icon: FiShare2 },
  { id: "microscope", Icon: TbMicroscope },
  { id: "search", Icon: FiSearch },
];

export default function SideNavigationBar({
  path,
  setOpenSearch,
  firstLetter,
  avatarUrl,
}: {
  path: string;
  setOpenSearch: (open: boolean) => void;
  firstLetter: string;
  avatarUrl: string | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const desktopNotification = useSettingsStore(
    (state) => state.desktopNotification,
  );
  const getIconClassName = (isHighlighted: boolean) =>
    `w-4 h-4 ${isHighlighted ? "text-white" : "text-text-secondary"}`;

  return (
    <div
      className={`bg-sidebar-background flex flex-col py-2.5 px-2.5 items-stretch justify-between select-none`}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <div
          key="logo"
          className={`relative flex items-center justify-center text-text-secondary text-[16px] p-[6px] rounded-[6px] hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 w-[28px] h-[28px]`}
          onClick={() => navigate(`/`)}
          onMouseEnter={() => setHoveredItem("home")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <img src={LogoIcon} alt="logo" className="w-4 h-4" />
          {hoveredItem === "home" && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white text-gray-800 border border-gray-200 shadow-md dark:bg-[#2a2a2e] dark:text-white dark:border-transparent text-xs px-2 py-1 rounded-md whitespace-nowrap z-50 pointer-events-none">
              {t("nav.home")}
            </div>
          )}
        </div>
        {NAVIGATION_ITEMS.map(({ id, Icon }) => (
          <div
            key={id}
            data-testid={`nav-${id}`}
            className={`relative flex items-center justify-center text-text-secondary text-[16px] p-[6px] rounded-[6px] ${id === path ? "bg-sidebar-tab-selected text-white" : ""} hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 w-[28px] h-[28px]`}
            onClick={
              id === "search"
                ? () => setOpenSearch(true)
                : () => navigate(`/${id}`)
            }
            onMouseEnter={() => setHoveredItem(id)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <Icon
              className={getIconClassName(id === path || hoveredItem === id)}
            />
            {hoveredItem === id && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white text-gray-800 border border-gray-200 shadow-md dark:bg-[#2a2a2e] dark:text-white dark:border-transparent text-xs px-2 py-1 rounded-md whitespace-nowrap z-50 pointer-events-none">
                {t(`nav.${id}`)}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center justify-center gap-2">
        {/* TODO: Change Profile Image when Click */}
        <div key="profile" className="flex items-center justify-center p-[6px]">
          {avatarUrl && avatarUrl.trim() ? (
            <img
              src={avatarUrl}
              alt="profile"
              className="w-7 h-7 rounded-full hover:bg-sidebar-tab-selected transition-colors duration-300"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = LogoIcon;
              }}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-300 text-center text-black hover:bg-sidebar-tab-selected transition-colors duration-300 text-sm">
              {firstLetter}
            </div>
          )}
        </div>
        <div
          key="notification"
          className={`relative flex items-center justify-center rounded-[6px] p-[6px] text-[#6B7280] hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 cursor-pointer`}
          onClick={markAllAsRead}
          onMouseEnter={() => setHoveredItem("notification")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          {desktopNotification ? (
            <IoNotificationsOutline className="w-4 h-4" />
          ) : (
            <IoNotificationsOffOutline className="w-4 h-4" />
          )}
          {unreadCount > 0 && (
            <div className="absolute top-[5px] right-[5px]  bg-red-400 flex items-center justify-center rounded-full w-1 h-1" />
          )}
          {hoveredItem === "notification" && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white text-gray-800 border border-gray-200 shadow-md dark:bg-[#2a2a2e] dark:text-white dark:border-transparent text-xs px-2 py-1 rounded-md whitespace-nowrap z-50 pointer-events-none">
              {t("nav.notification")}
            </div>
          )}
        </div>
        <div
          key="graph-lab"
          className={`relative flex items-center justify-center rounded-[6px] p-[6px] ${path === "graph-lab" ? "bg-sidebar-tab-selected text-white" : "text-[#6B7280]"} hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 cursor-pointer`}
          onClick={() => navigate("/graph-lab")}
          onMouseEnter={() => setHoveredItem("graph-lab")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <IoFlaskOutline className="w-4 h-4" />
          {hoveredItem === "graph-lab" && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white text-gray-800 border border-gray-200 shadow-md dark:bg-[#2a2a2e] dark:text-white dark:border-transparent text-xs px-2 py-1 rounded-md whitespace-nowrap z-50 pointer-events-none">
              {t("nav.graphLab")}
            </div>
          )}
        </div>
        <div
          key="settings"
          className={`relative flex items-center justify-center rounded-[6px] p-[6px] ${path === "settings" ? "bg-sidebar-tab-selected text-white" : ""} hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300`}
          onClick={() => navigate("/settings")}
          onMouseEnter={() => setHoveredItem("settings")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <FiSettings
            className={getIconClassName(
              path === "settings" || hoveredItem === "settings",
            )}
          />
          {hoveredItem === "settings" && (
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-white text-gray-800 border border-gray-200 shadow-md dark:bg-[#2a2a2e] dark:text-white dark:border-transparent text-xs px-2 py-1 rounded-md whitespace-nowrap z-50 pointer-events-none">
              {t("nav.settings")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
