import { useState } from "react";
import { useNavigate } from "react-router-dom";
import profile from "@/assets/icons/logo.svg";
import LogoIcon from "@/assets/icons/logo.svg";
import ChatIcon from "@/assets/icons/chat.svg";
import NoteIcon from "@/assets/icons/note.svg";
import VisualizeIcon from "@/assets/icons/share.svg";
import SearchIcon from "@/assets/icons/search.svg";
import ChatIconActive from "@/assets/icons/chat_active.svg";
import NoteIconActive from "@/assets/icons/note_active.svg";
import VisualizeIconActive from "@/assets/icons/share_active.svg";
import SearchIconActive from "@/assets/icons/search_active.svg";
import SettingsIcon from "@/assets/icons/settings.svg";
import SettingsIconActive from "@/assets/icons/settings_active.svg";
import {
  IoNotificationsOutline,
  IoNotificationsOffOutline,
  IoFlaskOutline,
} from "react-icons/io5";
import { TbMicroscope } from "react-icons/tb";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useSettingsStore } from "@/store/useSettingsStore";

type NavItem =
  | {
      id: string;
      icon: string;
      iconAcitve: string;
      label: string;
      isReactIcon?: false;
    }
  | {
      id: string;
      ReactIcon: React.ComponentType<{ className?: string }>;
      label: string;
      isReactIcon: true;
    };

const NAVIGATION_ITEMS: NavItem[] = [
  { id: "chat", icon: ChatIcon, iconAcitve: ChatIconActive, label: "chat" },
  { id: "notes", icon: NoteIcon, iconAcitve: NoteIconActive, label: "notes" },
  {
    id: "visualize",
    icon: VisualizeIcon,
    iconAcitve: VisualizeIconActive,
    label: "visualize",
  },
  {
    id: "microscope",
    ReactIcon: TbMicroscope,
    label: "microscope",
    isReactIcon: true,
  },
  {
    id: "search",
    icon: SearchIcon,
    iconAcitve: SearchIconActive,
    label: "search",
  },
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
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const desktopNotification = useSettingsStore(
    (state) => state.desktopNotification,
  );

  return (
    <div
      className={`bg-sidebar-background flex flex-col py-2.5 px-2.5 items-stretch justify-between select-none`}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <div
          key="logo"
          className={`flex items-center justify-center text-text-secondary text-[16px] p-[6px] rounded-[6px] hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 w-[28px] h-[28px]`}
          onClick={() => navigate(`/`)}
        >
          <img src={LogoIcon} alt="logo" className="w-4 h-4" />
        </div>
        {NAVIGATION_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-center text-text-secondary text-[16px] p-[6px] rounded-[6px] ${item.id === path ? "bg-sidebar-tab-selected text-white" : ""} hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 w-[28px] h-[28px]`}
            onClick={
              item.id === "search"
                ? () => setOpenSearch(true)
                : () => navigate(`/${item.id}`)
            }
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {item.isReactIcon ? (
              <item.ReactIcon
                className={`w-4 h-4 ${item.id === path || hoveredItem === item.id ? "text-white" : "text-text-secondary"}`}
              />
            ) : (
              <img
                src={
                  item.id === path || hoveredItem === item.id
                    ? item.iconAcitve
                    : item.icon
                }
                alt={item.label}
                className="w-4 h-4"
              />
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
                e.currentTarget.src = profile;
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
        </div>
        <div
          key="graph-lab"
          className={`flex items-center justify-center rounded-[6px] p-[6px] ${path === "graph-lab" ? "bg-sidebar-tab-selected text-white" : "text-[#6B7280]"} hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 cursor-pointer`}
          onClick={() => navigate("/graph-lab")}
          onMouseEnter={() => setHoveredItem("graph-lab")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <IoFlaskOutline className="w-4 h-4" />
        </div>
        <div
          key="settings"
          className={`flex items-center justify-center rounded-[6px] p-[6px] ${path === "settings" ? "bg-sidebar-tab-selected text-white" : ""} hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300`}
          onClick={() => navigate("/settings")}
          onMouseEnter={() => setHoveredItem("settings")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <img
            src={
              path === "settings" || hoveredItem === "settings"
                ? SettingsIconActive
                : SettingsIcon
            }
            alt="settings"
            className="w-[16px] h-[16px]"
          />
        </div>
      </div>
    </div>
  );
}
