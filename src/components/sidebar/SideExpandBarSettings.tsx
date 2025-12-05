import MyAccountIcon from "@/assets/icons/account.svg";
import MyAccountIconActive from "@/assets/icons/account_active.svg";
import DataPrivacyIcon from "@/assets/icons/data.svg";
import DataPrivacyIconActive from "@/assets/icons/data_active.svg";
import { useSidebarSettingsStore } from "@/store/useSidebarSettingsStore";
import SettingsCategory from "@/types/SettingsCategory";
import { useTranslation } from "react-i18next";
import AppearanceIcon from "@/assets/icons/appearance.svg";
import AppearanceIconActive from "@/assets/icons/appearance_active.svg";
import NotificationIcon from "@/assets/icons/notification.svg";
import NotificationIconActive from "@/assets/icons/notification_active.svg";
import KeybindsIcon from "@/assets/icons/keybinds.svg";
import KeybindsIconActive from "@/assets/icons/keybinds_active.svg";
import LanguageTimeIcon from "@/assets/icons/language.svg";
import LanguageTimeIconActive from "@/assets/icons/language_active.svg";
import LogoutIcon from "@/assets/icons/logout.svg";
import LogoutIconActive from "@/assets/icons/logout_active.svg";
import { api } from "@/apiClient";

export default function SideExpandBarSettings() {
  const { t } = useTranslation();
  const { selectedCategory, setSelectedCategory } = useSidebarSettingsStore();

  const USER_SETTINGS = [
    {
      id: "my-account",
      icon: MyAccountIcon,
      iconActive: MyAccountIconActive,
    },
    {
      id: "data-privacy",
      icon: DataPrivacyIcon,
      iconActive: DataPrivacyIconActive,
    },
  ];

  const APP_SETTINGS = [
    {
      id: "appearance",
      icon: AppearanceIcon,
      iconActive: AppearanceIconActive,
    },
    {
      id: "notification",
      icon: NotificationIcon,
      iconActive: NotificationIconActive,
    },
    {
      id: "keybinds",
      icon: KeybindsIcon,
      iconActive: KeybindsIconActive,
    },
    {
      id: "language-time",
      icon: LanguageTimeIcon,
      iconActive: LanguageTimeIconActive,
    },
  ];

  return (
    <div className="px-3 flex flex-col items-start justify-start h-full">
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
              iconActive={setting.iconActive}
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
              iconActive={setting.iconActive}
              onClick={() =>
                setSelectedCategory({ id: setting.id } as SettingsCategory)
              }
              isSelected={selectedCategory.id === setting.id}
            />
          ))}
        </div>
      </div>
      {/* Settings Category Bottom */}
      <div className="mt-auto pb-3">
        <SettingsCategoryButton
          id="logout"
          text={t("settings.logout")}
          icon={LogoutIcon}
          iconActive={LogoutIconActive}
          onClick={async () => {
            await api.me.logout();
            window.electron?.send("auth-logout");
          }}
          isSelected={false}
        />
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
  icon,
  iconActive,
  onClick,
  isSelected,
}: {
  id: string;
  text: string;
  icon: string;
  iconActive: string;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <div
      className={`group rounded-[7px] cursor-pointer w-[235px] pl-[6px] py-[5.5px] flex items-center justify-start gap-[6px] transition-colors duration-300 ${isSelected ? "bg-sidebar-button-hover text-primary" : "bg-transparent text-black"} hover:bg-sidebar-button-hover hover:text-primary`}
      onClick={onClick}
    >
      <img
        src={icon}
        alt={text}
        className={`${isSelected ? "hidden" : "block group-hover:hidden"}`}
      />
      <img
        src={iconActive}
        alt={text}
        className={`${isSelected ? "block" : "hidden group-hover:block"}`}
      />
      <p
        className={`text-[14px] font-normal font-noto-sans-kr ${isSelected ? "text-primary" : "text-black"} group-hover:text-primary transition-colors duration-300`}
      >
        {text}
      </p>
    </div>
  );
}
