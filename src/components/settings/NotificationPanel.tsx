import { useTranslation } from "react-i18next";
import SettingCategoryTitle from "./SettingCategoryTitle";
import SettingsPanelLayout from "./SettingsPanelLayout";
import ToggleSettingItem from "./ToggleSettingItem";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useSoundStore } from "@/store/useSoundStore";
import { playSound } from "@/utils/sound";

export default function NotificationPanel() {
  const { t } = useTranslation();
  const desktopNotification = useSettingsStore(
    (state) => state.desktopNotification,
  );
  const setDesktopNotification = useSettingsStore(
    (state) => state.setDesktopNotification,
  );

  const { newMessageSound, appNotificationSound, setNewMessageSound, setAppNotificationSound } =
    useSoundStore();

  const handleNewMessageSoundChange = (value: boolean) => {
    setNewMessageSound(value);
    if (value) {
      // 활성화 시 미리듣기
      playSound("message");
    }
  };

  const handleAppNotificationSoundChange = (value: boolean) => {
    setAppNotificationSound(value);
    if (value) {
      // 활성화 시 미리듣기
      playSound("notification");
    }
  };

  // const handleSendTestNotification = async () => {
  //   setIsSendingTest(true);
  //   try {
  //     const response = await fetch(`${API_BASE}/v1/notifications/test`, {
  //       method: "POST",
  //       credentials: "include",
  //     });
  //     if (!response.ok) {
  //       throw new Error("Failed to send test notification");
  //     }
  //     console.log("[NotificationPanel] Test notification sent");
  //   } catch (error) {
  //     console.error("[NotificationPanel] Error sending test notification:", error);
  //   } finally {
  //     setIsSendingTest(false);
  //   }
  // };

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
        isActive={newMessageSound}
        onChange={handleNewMessageSoundChange}
      />
      <ToggleSettingItem
        title={t("settings.notification.appNotification.title")}
        subtitle={t("settings.notification.appNotification.subtitle")}
        isActive={appNotificationSound}
        onChange={handleAppNotificationSoundChange}
      />

      {/* 테스트 알림 섹션
      <SettingCategoryTitle
        title="테스트"
        subtitle="알림 연결이 정상 작동하는지 확인합니다"
      />
      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-[14px] font-medium text-text-primary">
            테스트 알림 보내기
          </p>
          <p className="text-[12px] text-text-tertiary mt-0.5">
            SSE 연결을 통해 테스트 알림을 받아봅니다
          </p>
        </div>
        <button
          onClick={handleSendTestNotification}
          disabled={isSendingTest}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiBell size={16} />
          {isSendingTest ? "전송 중..." : "테스트 알림"}
        </button>
      </div> */}
    </SettingsPanelLayout>
  );
}
