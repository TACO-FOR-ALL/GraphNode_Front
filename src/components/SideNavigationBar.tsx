import { FaPlus } from "react-icons/fa6";
import { FiSearch } from "react-icons/fi";
import { IoSettingsOutline, IoShareSocialOutline } from "react-icons/io5";
import { PiNotePencil } from "react-icons/pi";
import { useNavigate } from "react-router-dom";

const NAVIGATION_ITEMS = [
  { id: "/", image: "/icons/logo.png", label: "/" },
  { id: "chat", icon: <FaPlus />, label: "chat" },
  { id: "notes", icon: <PiNotePencil />, label: "notes" },
  { id: "visualize", icon: <IoShareSocialOutline />, label: "visualize" },
  { id: "search", icon: <FiSearch />, label: "search" },
];

export default function SideNavigationBar({ path }: { path: string }) {
  const navigate = useNavigate();

  return (
    <div
      className={`bg-sidebar-background flex flex-col py-2.5 px-2.5 items-stretch justify-between`}
    >
      <div className="flex flex-col items-center justify-center gap-2">
        {NAVIGATION_ITEMS.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-center text-text-secondary text-[16px] p-[6px] rounded-[6px] ${item.id === path ? "bg-sidebar-tab-selected text-white" : ""} ${item.id === "home" ? "bg-transparent" : ""} hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 w-[28px] h-[28px]`}
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
        <div key="profile" className="flex items-center justify-center p-[6px]">
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
  );
}
