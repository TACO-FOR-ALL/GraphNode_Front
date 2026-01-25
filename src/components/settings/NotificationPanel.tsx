import { useState } from "react";
import SettingCategoryTitle from "./SettingCategoryTitle";
import SettingsPanelLayout from "./SettingsPanelLayout";
import ToggleSettingItem from "./ToggleSettingItem";

interface NotificationSettings {
  desktopNotification: boolean;
  newMessageSound: boolean;
  appNotificationSound: boolean;
}

export default function NotificationPanel() {
  const [settings, setSettings] = useState<NotificationSettings>({
    desktopNotification: false,
    newMessageSound: false,
    appNotificationSound: false,
  });

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsPanelLayout>
      <SettingCategoryTitle title="Overview" />
      <ToggleSettingItem
        title="Enable Desktop Notifications"
        subtitle="Receive alerts on your desktop even when the app is not in focus"
        isActive={settings.desktopNotification}
        onChange={(value) => updateSetting("desktopNotification", value)}
      />
      <SettingCategoryTitle title="Sounds" subtitle="Play a sound for..." />
      <ToggleSettingItem
        title="New Message"
        subtitle="Play a sound when a new message is received"
        isActive={settings.newMessageSound}
        onChange={(value) => updateSetting("newMessageSound", value)}
      />
      <ToggleSettingItem
        title="App Notification"
        subtitle="Play a sound for app notifications"
        isActive={settings.appNotificationSound}
        onChange={(value) => updateSetting("appNotificationSound", value)}
      />
    </SettingsPanelLayout>
  );
}
