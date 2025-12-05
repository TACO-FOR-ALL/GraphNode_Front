import { useState } from "react";
import { useNavigate } from "react-router-dom";
import profile from "@/assets/images/profile.jpeg";
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

const NAVIGATION_ITEMS = [
  { id: "chat", icon: ChatIcon, iconAcitve: ChatIconActive, label: "chat" },
  { id: "notes", icon: NoteIcon, iconAcitve: NoteIconActive, label: "notes" },
  {
    id: "visualize",
    icon: VisualizeIcon,
    iconAcitve: VisualizeIconActive,
    label: "visualize",
  },
  {
    id: "search",
    icon: SearchIcon,
    iconAcitve: SearchIconActive,
    label: "search",
  },
];

export default function SideNavigationBar({ path }: { path: string }) {
  const navigate = useNavigate();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <div
      className={`bg-sidebar-background flex flex-col py-2.5 px-2.5 items-stretch justify-between`}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        <div
          key="logo"
          className={`flex items-center justify-center text-text-secondary text-[16px] p-[6px] rounded-[6px] hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 w-[28px] h-[28px]`}
          onClick={() => navigate(`/`)}
        >
          <img src={LogoIcon} alt="logo" className="w-[16px] h-[16px]" />
        </div>
        {NAVIGATION_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-center text-text-secondary text-[16px] p-[6px] rounded-[6px] ${item.id === path ? "bg-sidebar-tab-selected text-white" : ""} ${item.id === "home" ? "bg-transparent" : ""} hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 w-[28px] h-[28px]`}
            onClick={() => navigate(`/${item.id}`)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <img
              src={
                item.id === path || hoveredItem === item.id
                  ? item.iconAcitve
                  : item.icon
              }
              alt={item.label}
              className="w-[16px] h-[16px]"
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center justify-center gap-2">
        <div key="profile" className="flex items-center justify-center p-[6px]">
          <img
            src={profile}
            alt="profile"
            className="w-[28px] h-[28px] rounded-full hover:bg-sidebar-tab-selected transition-colors duration-300"
          />
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
