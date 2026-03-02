// MCP 서버 카드 컴포넌트
import { useTranslation } from "react-i18next";
import type { MCPServerConfig, MCPServerState } from "@/types/mcp";
import { FiFolder, FiLink, FiSettings, FiTrash2 } from "react-icons/fi";
import { SiNotion, SiGoogledrive, SiGooglecalendar } from "react-icons/si";
import Toggle from "@/components/common/Toggle";

interface MCPServerCardProps {
  server: MCPServerConfig;
  state?: MCPServerState;
  onToggle: (enabled: boolean) => void;
  onSettings?: () => void;
  onDelete?: () => void;
  isCustom?: boolean;
  available?: boolean;
  unavailableReason?: string;
}

// Built-in 서버 아이콘 매핑
function getServerIcon(builtinType?: string) {
  switch (builtinType) {
    case "filesystem":
      return <FiFolder className="w-5 h-5" />;
    case "notion":
      return <SiNotion className="w-5 h-5" />;
    case "google-drive":
      return <SiGoogledrive className="w-5 h-5" />;
    case "google-calendar":
      return <SiGooglecalendar className="w-5 h-5" />;
    default:
      return <FiLink className="w-5 h-5" />;
  }
}

// 상태 표시 컴포넌트
function StatusIndicator({ status }: { status?: MCPServerState["status"] }) {
  const statusColors = {
    connected: "bg-green-500",
    connecting: "bg-yellow-500 animate-pulse",
    disconnected: "bg-gray-400",
    error: "bg-red-500",
  };

  return (
    <div
      className={`w-2.5 h-2.5 rounded-full ${statusColors[status || "disconnected"]}`}
    />
  );
}

export default function MCPServerCard({
  server,
  state,
  onToggle,
  onSettings,
  onDelete,
  isCustom = false,
  available = true,
  unavailableReason,
}: MCPServerCardProps) {
  const { t } = useTranslation();
  const isConnecting = state?.status === "connecting";
  const isDisabled = !available;

  return (
    <div className={`w-full flex items-center justify-between p-4 rounded-lg border border-base-border bg-bg-secondary transition-colors ${isDisabled ? "opacity-60" : "hover:bg-bg-tertiary/30"}`}>
      {/* 왼쪽: 아이콘 및 정보 */}
      <div className="flex items-center gap-3">
        {/* 아이콘 */}
        <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-primary">
          {getServerIcon(server.builtinType)}
        </div>

        {/* 서버 정보 */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-medium">{server.name}</span>
            <StatusIndicator status={state?.status} />
          </div>

          {/* 상태 텍스트 */}
          <span className="text-xs text-text-tertiary">
            {isDisabled && unavailableReason ? (
              <span className="text-yellow-600 dark:text-yellow-500">
                {unavailableReason}
              </span>
            ) : (
              <>
                {state?.status === "connected" && t("settings.mcp.status.connected")}
                {state?.status === "connecting" && t("settings.mcp.status.connecting")}
                {state?.status === "disconnected" && t("settings.mcp.status.disconnected")}
                {state?.status === "error" && (
                  <span className="text-red-500">
                    {t("settings.mcp.status.error")}: {state.error}
                  </span>
                )}
              </>
            )}
          </span>

          {/* 도구 개수 */}
          {state?.status === "connected" && state.tools && (
            <span className="text-xs text-text-tertiary">
              {t("settings.mcp.toolsCount", { count: state.tools.length })}
            </span>
          )}
        </div>
      </div>

      {/* 오른쪽: 액션 버튼들 */}
      <div className="flex items-center gap-3">
        {/* 설정 버튼 (Built-in 서버만) */}
        {onSettings && (
          <button
            onClick={onSettings}
            className="p-2 rounded-md hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
            title={t("settings.mcp.configure")}
          >
            <FiSettings className="w-4 h-4" />
          </button>
        )}

        {/* 삭제 버튼 (Custom 서버만) */}
        {isCustom && onDelete && (
          <button
            onClick={onDelete}
            className="p-2 rounded-md hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors"
            title={t("settings.mcp.delete")}
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        )}

        {/* 활성화 토글 */}
        <Toggle
          isOn={server.enabled}
          onChange={onToggle}
          disabled={isConnecting || isDisabled}
        />
      </div>
    </div>
  );
}
