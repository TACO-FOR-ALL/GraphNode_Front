import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiAlertCircle, FiBell, FiCheckCircle, FiSlash } from "react-icons/fi";
import SettingCategoryTitle from "./SettingCategoryTitle";
import SettingsPanelLayout from "./SettingsPanelLayout";
import ToggleSettingItem from "./ToggleSettingItem";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useSoundStore } from "@/store/useSoundStore";
import { playSound } from "@/utils/sound";
import { isElectron } from "@/utils/platform";

type BrowserPermissionState = NotificationPermission | "unsupported";

function getBrowserPermissionState(): BrowserPermissionState {
  if (typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
}

export default function NotificationPanel() {
  const { t } = useTranslation();
  const [browserPermission, setBrowserPermission] =
    useState<BrowserPermissionState>(getBrowserPermissionState);
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

  const syncBrowserPermission = useCallback(() => {
    setBrowserPermission(getBrowserPermissionState());
  }, []);

  useEffect(() => {
    if (isElectron()) return;

    syncBrowserPermission();
    window.addEventListener("focus", syncBrowserPermission);

    return () => {
      window.removeEventListener("focus", syncBrowserPermission);
    };
  }, [syncBrowserPermission]);

  const handleRequestBrowserPermission = useCallback(async () => {
    if (typeof Notification === "undefined") {
      setBrowserPermission("unsupported");
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
    } catch {
      syncBrowserPermission();
    }
  }, [syncBrowserPermission]);

  const handleSendTestBrowserNotification = useCallback(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    try {
      const testNotification = new Notification(
        t("settings.notification.permission.test.title"),
        {
          body: t("settings.notification.permission.test.body"),
          tag: "graphnode-web-notification-test",
        },
      );

      testNotification.onclick = () => {
        window.focus();
      };
    } catch (err) {
      console.warn("[Notification] Failed to show test browser notification:", err);
    }
  }, [t]);

  const browserPermissionLabel = (() => {
    switch (browserPermission) {
      case "granted":
        return t("settings.notification.permission.status.granted");
      case "denied":
        return t("settings.notification.permission.status.denied");
      case "unsupported":
        return t("settings.notification.permission.status.unsupported");
      default:
        return t("settings.notification.permission.status.default");
    }
  })();

  const browserPermissionDescription = (() => {
    switch (browserPermission) {
      case "granted":
        return t("settings.notification.permission.description.granted");
      case "denied":
        return t("settings.notification.permission.description.denied");
      case "unsupported":
        return t("settings.notification.permission.description.unsupported");
      default:
        return t("settings.notification.permission.description.default");
    }
  })();

  const browserPermissionIcon = (() => {
    switch (browserPermission) {
      case "granted":
        return <FiCheckCircle className="w-4 h-4" />;
      case "denied":
        return <FiAlertCircle className="w-4 h-4" />;
      case "unsupported":
        return <FiSlash className="w-4 h-4" />;
      default:
        return <FiBell className="w-4 h-4" />;
    }
  })();

  const browserPermissionBadgeClass = (() => {
    switch (browserPermission) {
      case "granted":
        return "bg-green-500/12 text-green-600 border-green-500/20";
      case "denied":
        return "bg-amber-500/12 text-amber-600 border-amber-500/20";
      case "unsupported":
        return "bg-text-tertiary/10 text-text-tertiary border-base-border";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  })();

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
      {!isElectron() && (
        <div className="w-full rounded-xl border border-base-border bg-primary/5 px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                {browserPermissionIcon}
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-text-primary">
                  {t("settings.notification.permission.title")}
                </p>
                <p className="text-sm leading-relaxed text-text-secondary">
                  {browserPermissionDescription}
                </p>
                <p className="text-xs leading-relaxed text-text-tertiary">
                  {t("settings.notification.permission.hint")}
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${browserPermissionBadgeClass}`}
            >
              {browserPermissionLabel}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {browserPermission === "default" && (
              <button
                onClick={handleRequestBrowserPermission}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
              >
                {t("settings.notification.permission.actions.request")}
              </button>
            )}
            {browserPermission === "denied" && (
              <button
                onClick={syncBrowserPermission}
                className="rounded-lg border border-base-border bg-bg-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-primary hover:text-primary"
              >
                {t("settings.notification.permission.actions.refresh")}
              </button>
            )}
            {browserPermission === "granted" && desktopNotification && (
              <button
                onClick={handleSendTestBrowserNotification}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90"
              >
                {t("settings.notification.permission.actions.test")}
              </button>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-text-tertiary">
            {t("settings.notification.permission.requirements")}
          </p>
        </div>
      )}
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
