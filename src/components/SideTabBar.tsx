import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import ChatList from "./ChatList";
import { useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { PiNotePencil } from "react-icons/pi";
import { IoSettingsOutline, IoShareSocialOutline } from "react-icons/io5";
import { FiSearch } from "react-icons/fi";
import {
  TbLayoutSidebarLeftExpand,
  TbLayoutSidebarRightExpand,
} from "react-icons/tb";

const NAVIGATION_ITEMS = [
  { id: "/", image: "/icons/logo.png", label: "/" },
  { id: "chat", icon: <FaPlus />, label: "chat" },
  { id: "notes", icon: <PiNotePencil />, label: "notes" },
  { id: "visualize", icon: <IoShareSocialOutline />, label: "visualize" },
  { id: "search", icon: <FiSearch />, label: "search" },
];

export default function SideTabBar() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const path = useLocation().pathname;

  const showSidebarExpanded = useMemo(
    () => path.includes("/chat") || path.includes("/notes"),
    [path]
  );

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex h-full">
      <div
        className={`bg-sidebar-background flex flex-col py-2.5 px-2.5 items-stretch justify-between`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          {NAVIGATION_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-center text-text-secondary text-[16px] p-[6px] rounded-[6px] ${item.id === path.split("/")[1] ? "bg-sidebar-tab-selected text-white" : ""} ${item.id === "home" ? "bg-transparent" : ""} hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 w-[28px] h-[28px]`}
              onClick={() => navigate(`/${item.id}`)}
            >
              {item.image ? (
                <img src={item.image as string} alt={item.label} />
              ) : (
                item.icon
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-2">
          <div
            key="profile"
            className="flex items-center justify-center p-[6px]"
          >
            <img
              src="/icons/profile.jpeg"
              alt="profile"
              className="w-[28px] h-[28px] rounded-full hover:bg-sidebar-tab-selected transition-colors duration-300"
            />
          </div>
          <div
            key="settings"
            className="flex items-center justify-center p-[6px] hover:bg-sidebar-tab-selected transition-colors duration-300"
          >
            <IoSettingsOutline onClick={() => navigate("/settings")} />
          </div>
        </div>
      </div>
      {showSidebarExpanded && (
        <div
          className={`bg-sidebar-expanded-background duration-500 transition-all ${isExpanded ? "w-[259px]" : "w-[40px]"} flex flex-col gap-4.5`}
        >
          <div className="flex px-3 py-4">
            {isExpanded ? (
              <TbLayoutSidebarRightExpand
                onClick={() => setIsExpanded(false)}
                className="text-text-secondary text-[16px] ml-auto"
              />
            ) : (
              <TbLayoutSidebarLeftExpand
                onClick={() => setIsExpanded(true)}
                className="text-text-secondary text-[16px] ml-auto"
              />
            )}
          </div>

          {isExpanded && (
            <div>
              <div>hi</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
