import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useOnboardingStore } from "@/store/useOnboardingStore";
import OnboardingModal from "./OnboardingModal";
import {
  FiBell,
  FiHardDrive,
  FiCheck,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";

type PermStatus = "idle" | "checking" | "granted" | "denied";

const isElectron = () => typeof window !== "undefined" && !!window.systemAPI;
const isMac = () =>
  typeof window !== "undefined" && window.windowAPI?.platform === "darwin";

export default function OnboardingPermissions() {
  const { t } = useTranslation();
  const { nextStep } = useOnboardingStore();

  const [notifStatus, setNotifStatus] = useState<PermStatus>("idle");
  const [fdaStatus, setFdaStatus] = useState<PermStatus>("idle");
  const [fdaPolling, setFdaPolling] = useState(false);

  // 초기 상태 확인
  useEffect(() => {
    // 알림 현재 상태 확인
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "granted") setNotifStatus("granted");
      else if (Notification.permission === "denied") setNotifStatus("denied");
    } else {
      setNotifStatus("granted"); // 지원 안 하는 환경 = 막히지 않음
    }

    // Full Disk Access 현재 상태 확인 (macOS only)
    if (isElectron() && isMac()) {
      window.systemAPI.checkFullDiskAccess().then((status) => {
        setFdaStatus(status === "granted" ? "granted" : "idle");
      });
    } else {
      setFdaStatus("granted"); // 비macOS는 해당 없음
    }
  }, []);

  // FDA 폴링: 설정 열고 나서 사용자가 허용했는지 감지
  useEffect(() => {
    if (!fdaPolling) return;
    if (fdaStatus === "granted") {
      setFdaPolling(false);
      return;
    }

    const interval = setInterval(async () => {
      if (!isElectron()) return;
      const status = await window.systemAPI.checkFullDiskAccess();
      if (status === "granted") {
        setFdaStatus("granted");
        setFdaPolling(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fdaPolling, fdaStatus]);

  // 앱 포커스 시 재확인
  useEffect(() => {
    const onFocus = async () => {
      if (fdaStatus === "denied" && isElectron() && isMac()) {
        const status = await window.systemAPI.checkFullDiskAccess();
        if (status === "granted") setFdaStatus("granted");
      }
      if (notifStatus === "denied" && typeof Notification !== "undefined") {
        if (Notification.permission === "granted") setNotifStatus("granted");
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fdaStatus, notifStatus]);

  const handleRequestNotification = useCallback(async () => {
    setNotifStatus("checking");
    try {
      const result = await Notification.requestPermission();
      setNotifStatus(result === "granted" ? "granted" : "denied");
    } catch {
      setNotifStatus("denied");
    }
  }, []);

  const handleOpenFdaSettings = useCallback(async () => {
    if (!isElectron()) return;
    await window.systemAPI.openSystemSettings("fullDiskAccess");
    setFdaStatus("denied");
    setFdaPolling(true);
  }, []);

  const showFda = isMac();

  return (
    <OnboardingModal>
      <div className="flex flex-col px-8 pt-6 pb-8">
        {/* 헤더 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {t("onboarding.permissions.title")}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t("onboarding.permissions.subtitle")}
          </p>
        </div>

        {/* 권한 카드 목록 */}
        <div className="space-y-3 mb-7">
          {/* 알림 권한 */}
          <PermissionCard
            icon={<FiBell className="w-5 h-5" />}
            iconColor="bg-blue-500/15 text-blue-500 border-blue-500/30"
            title={t("onboarding.permissions.notifications.title")}
            description={t("onboarding.permissions.notifications.description")}
            status={notifStatus}
            onRequest={handleRequestNotification}
            onOpenSettings={() =>
              window.systemAPI?.openSystemSettings("notifications")
            }
          />

          {/* 전체 디스크 접근 (macOS only) */}
          {showFda && (
            <PermissionCard
              icon={<FiHardDrive className="w-5 h-5" />}
              iconColor="bg-orange-500/15 text-orange-500 border-orange-500/30"
              title={t("onboarding.permissions.fullDiskAccess.title")}
              description={t(
                "onboarding.permissions.fullDiskAccess.description",
              )}
              status={fdaStatus}
              isPolling={fdaPolling}
              onOpenSettings={handleOpenFdaSettings}
              settingsOnly
            />
          )}
        </div>
        <div className="mt-[-24px] mb-5 text-xs text-text-tertiary">
          {t("onboarding.permissions.fullDiskAccess.hint")}
        </div>

        {/* 계속 버튼 (권한 없어도 계속 가능) */}
        <button
          onClick={nextStep}
          className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          {t("onboarding.next")}
        </button>

        <p className="text-xs text-text-tertiary text-center mt-3">
          {t("onboarding.permissions.skipHint")}
        </p>
      </div>
    </OnboardingModal>
  );
}

// ── 권한 카드 ────────────────────────────────────────────────────────────────

interface PermissionCardProps {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  description: string;
  hint?: string;
  status: PermStatus;
  isPolling?: boolean;
  onRequest?: () => void;
  onOpenSettings?: () => void;
  settingsOnly?: boolean;
}

function PermissionCard({
  icon,
  iconColor,
  title,
  description,
  hint,
  status,
  isPolling,
  onRequest,
  onOpenSettings,
  settingsOnly,
}: PermissionCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={`
        p-4 rounded-xl border-2 transition-all duration-200
        ${
          status === "granted"
            ? "border-green-500/30 bg-green-500/5"
            : "border-base-border bg-bg-secondary"
        }
      `}
    >
      <div className="flex items-center gap-4">
        {/* 아이콘 */}
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${
            status === "granted"
              ? "bg-green-500/15 text-green-500 border-green-500/30"
              : iconColor
          }`}
        >
          {icon}
        </div>

        {/* 텍스트 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="text-xs text-text-tertiary mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>

        {/* 상태 / 액션 */}
        <div className="flex-shrink-0">
          {status === "granted" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/15 text-green-600 text-xs font-medium">
              <FiCheck className="w-3.5 h-3.5" />
              {t("onboarding.permissions.status.granted")}
            </div>
          )}

          {status === "checking" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-primary border border-base-border text-text-tertiary text-xs">
              <FiLoader className="w-3.5 h-3.5 animate-spin" />
              {t("onboarding.permissions.status.checking")}
            </div>
          )}

          {(status === "idle" || status === "denied") && (
            <div className="flex flex-col items-end gap-1.5">
              {status === "denied" && (
                <div className="flex items-center gap-1 text-xs text-orange-500">
                  <FiAlertCircle className="w-3 h-3" />
                  {isPolling
                    ? t("onboarding.permissions.status.waiting")
                    : t("onboarding.permissions.status.denied")}
                </div>
              )}
              {/* settingsOnly: 설정 앱 열기만 가능 (FDA 등) */}
              {settingsOnly ? (
                <button
                  onClick={onOpenSettings}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    status === "idle"
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "bg-bg-primary border border-base-border text-text-secondary hover:border-primary hover:text-primary"
                  }`}
                >
                  {status === "idle"
                    ? t("onboarding.permissions.action.request")
                    : t("onboarding.permissions.action.openSettings")}
                </button>
              ) : (
                <>
                  {status === "idle" && onRequest && (
                    <button
                      onClick={onRequest}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      {t("onboarding.permissions.action.request")}
                    </button>
                  )}
                  {status === "denied" && onOpenSettings && (
                    <button
                      onClick={onOpenSettings}
                      className="px-3 py-1.5 rounded-lg bg-bg-primary border border-base-border text-text-secondary text-xs hover:border-primary hover:text-primary transition-colors"
                    >
                      {t("onboarding.permissions.action.openSettings")}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FDA 안내 힌트 (목록에 없을 때 + 버튼으로 추가하는 방법) */}
      {hint && status !== "granted" && (
        <p className="mt-2.5 text-xs text-text-tertiary leading-relaxed pl-[60px]">
          {hint}
        </p>
      )}
    </div>
  );
}
