import { useSidebarSettingsStore } from "@/store/useSidebarSettingsStore";
import SettingsCategory from "@/types/SettingsCategory";
import { useTranslation } from "react-i18next";
import { IoPersonSharp } from "react-icons/io5";
import { MdPrivacyTip } from "react-icons/md";
import { IoMdColorPalette } from "react-icons/io";
import { IoIosNotifications } from "react-icons/io";
import { FaKeyboard } from "react-icons/fa";
import { IoLanguageOutline } from "react-icons/io5";
import { IconType } from "react-icons/lib";

export default function SideExpandBarSettings() {
  const { t } = useTranslation();
  const { selectedCategory, setSelectedCategory } = useSidebarSettingsStore();

  const USER_SETTINGS = [
    {
      id: "my-account",
      icon: IoPersonSharp,
    },
    {
      id: "data-privacy",
      icon: MdPrivacyTip,
    },
  ];

  const APP_SETTINGS = [
    {
      id: "appearance",
      icon: IoMdColorPalette,
    },
    {
      id: "notification",
      icon: IoIosNotifications,
    },
    {
      id: "keybinds",
      icon: FaKeyboard,
    },
    {
      id: "language-time",
      icon: IoLanguageOutline,
    },
  ];

  return (
    <div className="px-3 flex flex-col items-start justify-start">
      {/* Settings Category Top */}
      <div className="flex-1 flex flex-col">
        <SettingsCategoryText text="User Settings" />
        <div className="flex flex-col gap-[6px]">
          {USER_SETTINGS.map((setting) => (
            <SettingsCategoryButton
              id={setting.id}
              key={setting.id}
              text={t(`settings.userSettings.${setting.id}`)}
              icon={setting.icon}
              onClick={() =>
                setSelectedCategory({ id: setting.id } as SettingsCategory)
              }
              isSelected={selectedCategory.id === setting.id}
            />
          ))}
        </div>
        <div className="h-[6px]" />
        <SettingsCategoryText text="App Settings" />
        <div className="flex flex-col gap-[6px]">
          {APP_SETTINGS.map((setting) => (
            <SettingsCategoryButton
              id={setting.id}
              key={setting.id}
              text={t(`settings.appSettings.${setting.id}`)}
              icon={setting.icon}
              onClick={() =>
                setSelectedCategory({ id: setting.id } as SettingsCategory)
              }
              isSelected={selectedCategory.id === setting.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsCategoryText({ text }: { text: string }) {
  return (
    <div className="text-[12px] mb-[6px] font-normal font-noto-sans-kr text-text-secondary">
      {text}
    </div>
  );
}

function SettingsCategoryButton({
  text,
  icon: Icon,
  onClick,
  isSelected,
}: {
  id: string;
  text: string;
  icon: IconType;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <div
      className={`group rounded-[7px] cursor-pointer w-[235px] pl-[6px] py-[5.5px] flex items-center justify-start gap-[6px] transition-colors duration-300 ${isSelected ? "bg-sidebar-button-hover text-primary" : "bg-transparent text-black"} hover:bg-sidebar-button-hover hover:text-primary`}
      onClick={onClick}
    >
      <Icon />
      <p
        className={`text-[14px] font-normal font-noto-sans-kr ${isSelected ? "text-primary" : "text-text-primary"} group-hover:text-primary transition-colors duration-300`}
      >
        {text}
      </p>
    </div>
  );
}
