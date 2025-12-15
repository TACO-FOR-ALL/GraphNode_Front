import { useSidebarSettingsStore } from "@/store/useSidebarSettingsStore";
import MyAccountPanel from "@/components/settings/MyAccountPanel";
import DataPrivacyPanel from "@/components/settings/DataPrivacyPanel";
import AppearancePanel from "@/components/settings/AppearancePanel";
import NotificationPanel from "@/components/settings/NotificationPanel";
import KeybindsPanel from "@/components/settings/KeybindsPanel";
import LanguageTimePanel from "@/components/settings/LanguageTimePanel";
import { Me } from "@/types/Me";

export default function Settings({ userInfo }: { userInfo: Me }) {
  const { selectedCategory } = useSidebarSettingsStore();

  switch (selectedCategory.id) {
    case "my-account":
      return <MyAccountPanel userInfo={userInfo} />;
    case "data-privacy":
      return <DataPrivacyPanel />;
    case "appearance":
      return <AppearancePanel />;
    case "notification":
      return <NotificationPanel />;
    case "keybinds":
      return <KeybindsPanel />;
    case "language-time":
      return <LanguageTimePanel />;
    default:
      return <MyAccountPanel userInfo={userInfo} />;
  }
}
