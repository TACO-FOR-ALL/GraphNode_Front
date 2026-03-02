// Notion MCP 서버 설정 모달
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiX, FiKey, FiExternalLink, FiCheck, FiAlertCircle } from "react-icons/fi";
import type { MCPServerConfig } from "@/types/mcp";

interface MCPNotionSettingsProps {
  server: MCPServerConfig;
  onClose: () => void;
  onSave: (settings: Record<string, unknown>) => Promise<void>;
}

export default function MCPNotionSettings({
  server,
  onClose,
  onSave,
}: MCPNotionSettingsProps) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState(server.settings?.notionApiKey || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message?: string } | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveResult(null);

    try {
      // 설정 저장
      await onSave({ notionApiKey: apiKey });

      // 서버 재연결 (설정 변경 반영)
      const state = await window.mcpAPI.getServerState(server.id);
      if (state?.status === "connected") {
        await window.mcpAPI.disconnectServer(server.id);
      }
      await window.mcpAPI.connectServer(server.id);

      setSaveResult({ success: true });
      setTimeout(() => setSaveResult(null), 3000);
    } catch (error) {
      console.error("Failed to save/connect:", error);
      setSaveResult({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const openNotionIntegrations = () => {
    window.open("https://www.notion.so/my-integrations", "_blank");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-primary rounded-xl shadow-xl w-[500px] max-h-[80vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-base-border">
          <div className="flex items-center gap-2">
            <FiKey className="w-5 h-5 text-text-primary" />
            <h2 className="text-lg font-medium text-text-primary">
              {t("settings.mcp.notion.title")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
          {/* 설명 */}
          <p className="text-sm text-text-secondary">
            {t("settings.mcp.notion.description")}
          </p>

          {/* API 키 입력 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text-primary">
              {t("settings.mcp.notion.apiKeyLabel")}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("settings.mcp.notion.apiKeyPlaceholder")}
              className="w-full px-3 py-2 rounded-md border border-base-border bg-bg-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Notion 통합 생성 안내 */}
          <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/30">
            <div className="flex flex-col gap-2">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                {t("settings.mcp.notion.howToGetKey")}
              </p>
              <button
                onClick={openNotionIntegrations}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t("settings.mcp.notion.openIntegrations")}
                <FiExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 연결 에러 표시 */}
          {saveResult && !saveResult.success && saveResult.message && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30">
              <div className="flex items-start gap-2">
                <FiAlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">
                  {saveResult.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-base-border">
          {saveResult?.success && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mr-auto">
              <FiCheck className="w-4 h-4" />
              {t("settings.mcp.notion.saved")}
            </span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-text-secondary hover:bg-bg-tertiary transition-colors text-sm"
          >
            {t("settings.dataPrivacy.cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !apiKey.trim()}
            className="px-4 py-2 rounded-md bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors text-sm"
          >
            {isSaving ? t("settings.my.api.saving") : t("settings.my.api.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
