import { useState } from "react";
import { useTranslation } from "react-i18next";
import SettingCategoryTitle from "./SettingCategoryTitle";
import SettingsPanelLayout from "./SettingsPanelLayout";
import ToggleSettingItem from "./ToggleSettingItem";
import { useSettingsStore } from "@/store/useSettingsStore";

interface LocalNotificationSettings {
  newMessageSound: boolean;
  appNotificationSound: boolean;
}

export default function NotificationPanel() {
  const { t } = useTranslation();
  const desktopNotification = useSettingsStore((state) => state.desktopNotification);
  const setDesktopNotification = useSettingsStore((state) => state.setDesktopNotification);

  const [localSettings, setLocalSettings] = useState<LocalNotificationSettings>({
    newMessageSound: false,
    appNotificationSound: false,
  });

  const updateLocalSetting = <K extends keyof LocalNotificationSettings>(
    key: K,
    value: LocalNotificationSettings[K],
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsPanelLayout>
      <SettingCategoryTitle title={t("settings.notification.overview.title")} />
      <ToggleSettingItem
        title={t("settings.notification.desktopNotification.title")}
        subtitle={t("settings.notification.desktopNotification.subtitle")}
        isActive={desktopNotification}
        onChange={setDesktopNotification}
      />
      <SettingCategoryTitle
        title={t("settings.notification.sounds.title")}
        subtitle={t("settings.notification.sounds.subtitle")}
      />
      <ToggleSettingItem
        title={t("settings.notification.newMessage.title")}
        subtitle={t("settings.notification.newMessage.subtitle")}
        isActive={localSettings.newMessageSound}
        onChange={(value) => updateLocalSetting("newMessageSound", value)}
      />
      <ToggleSettingItem
        title={t("settings.notification.appNotification.title")}
        subtitle={t("settings.notification.appNotification.subtitle")}
        isActive={localSettings.appNotificationSound}
        onChange={(value) => updateLocalSetting("appNotificationSound", value)}
      />
    </SettingsPanelLayout>
  );
}
