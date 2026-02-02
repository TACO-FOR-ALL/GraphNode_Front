import { useState } from "react";
import { useTranslation } from "react-i18next";
import SettingCategoryTitle from "./SettingCategoryTitle";
import SettingsPanelLayout from "./SettingsPanelLayout";
import ToggleSettingItem from "./ToggleSettingItem";

interface NotificationSettings {
  desktopNotification: boolean;
  newMessageSound: boolean;
  appNotificationSound: boolean;
}

export default function NotificationPanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<NotificationSettings>({
    desktopNotification: false,
    newMessageSound: false,
    appNotificationSound: false,
  });

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsPanelLayout>
      <SettingCategoryTitle title={t("settings.notification.overview.title")} />
      <ToggleSettingItem
        title={t("settings.notification.desktopNotification.title")}
        subtitle={t("settings.notification.desktopNotification.subtitle")}
        isActive={settings.desktopNotification}
        onChange={(value) => updateSetting("desktopNotification", value)}
      />
      <SettingCategoryTitle
        title={t("settings.notification.sounds.title")}
        subtitle={t("settings.notification.sounds.subtitle")}
      />
      <ToggleSettingItem
        title={t("settings.notification.newMessage.title")}
        subtitle={t("settings.notification.newMessage.subtitle")}
        isActive={settings.newMessageSound}
        onChange={(value) => updateSetting("newMessageSound", value)}
      />
      <ToggleSettingItem
        title={t("settings.notification.appNotification.title")}
        subtitle={t("settings.notification.appNotification.subtitle")}
        isActive={settings.appNotificationSound}
        onChange={(value) => updateSetting("appNotificationSound", value)}
      />
    </SettingsPanelLayout>
  );
}
