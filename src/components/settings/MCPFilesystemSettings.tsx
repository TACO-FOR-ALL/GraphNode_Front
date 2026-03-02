// Filesystem MCP 서버 설정 모달
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FiX, FiPlus, FiTrash2, FiFolder, FiInfo, FiCheck, FiAlertCircle } from "react-icons/fi";
import type { MCPServerConfig } from "@/types/mcp";

interface MCPFilesystemSettingsProps {
  server: MCPServerConfig;
  onClose: () => void;
  onSave: (settings: Record<string, unknown>) => Promise<void>;
}

// OS 감지
function getOS(): "mac" | "windows" | "linux" {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "mac";
  if (platform.includes("win")) return "windows";
  return "linux";
}

export default function MCPFilesystemSettings({
  server,
  onClose,
  onSave,
}: MCPFilesystemSettingsProps) {
  const { t } = useTranslation();
  const [allowedPaths, setAllowedPaths] = useState<string[]>(
    server.settings?.allowedPaths || []
  );
  const [newPath, setNewPath] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message?: string } | null>(null);

  // OS별 예시 경로
  const os = useMemo(() => getOS(), []);
  const pathExamples = useMemo(() => {
    switch (os) {
      case "mac":
        return {
          placeholder: "/Users/username/Documents",
          examples: [
            "/Users/username/Documents",
            "/Users/username/Desktop",
            "/Users/username/Downloads",
            "~/Projects",
          ],
        };
      case "windows":
        return {
          placeholder: "C:\\Users\\username\\Documents",
          examples: [
            "C:\\Users\\username\\Documents",
            "C:\\Users\\username\\Desktop",
            "C:\\Users\\username\\Downloads",
            "D:\\Projects",
          ],
        };
      default: // linux
        return {
          placeholder: "/home/username/Documents",
          examples: [
            "/home/username/Documents",
            "/home/username/Desktop",
            "/home/username/Downloads",
            "~/projects",
          ],
        };
    }
  }, [os]);

  const handleAddPath = () => {
    const trimmedPath = newPath.trim();
    if (trimmedPath && !allowedPaths.includes(trimmedPath)) {
      setAllowedPaths([...allowedPaths, trimmedPath]);
      setNewPath("");
    }
  };

  const handleRemovePath = (path: string) => {
    setAllowedPaths(allowedPaths.filter((p) => p !== path));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveResult(null);

    try {
      // 설정 저장
      await onSave({ allowedPaths });

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
      handleAddPath();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-primary rounded-xl shadow-xl w-[500px] max-h-[80vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-base-border">
          <div className="flex items-center gap-2">
            <FiFolder className="w-5 h-5 text-text-primary" />
            <h2 className="text-lg font-medium text-text-primary">
              {t("settings.mcp.filesystem.title")}
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
            {t("settings.mcp.filesystem.description")}
          </p>

          {/* OS별 예시 */}
          <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-2">
              <FiInfo className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                  {t("settings.mcp.filesystem.examplePaths")} ({os === "mac" ? "macOS" : os === "windows" ? "Windows" : "Linux"})
                </p>
                <ul className="text-xs text-blue-600 dark:text-blue-500 space-y-0.5">
                  {pathExamples.examples.map((example, idx) => (
                    <li key={idx} className="font-mono">{example}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 경로 입력 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={pathExamples.placeholder}
              className="flex-1 px-3 py-2 rounded-md border border-base-border bg-bg-secondary text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleAddPath}
              disabled={!newPath.trim()}
              className="px-3 py-2 rounded-md bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            >
              <FiPlus className="w-4 h-4" />
            </button>
          </div>

          {/* 경로 목록 */}
          <div className="flex flex-col gap-2">
            {allowedPaths.length === 0 ? (
              <p className="text-sm text-text-tertiary py-4 text-center">
                {t("settings.mcp.filesystem.noPathsAdded")}
              </p>
            ) : (
              allowedPaths.map((path) => (
                <div
                  key={path}
                  className="flex items-center justify-between p-3 rounded-md bg-bg-secondary border border-base-border"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FiFolder className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                    <span className="text-sm text-text-primary truncate">
                      {path}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemovePath(path)}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* 보안 경고 */}
          <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              {t("settings.mcp.filesystem.securityWarning")}
            </p>
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
              {t("settings.mcp.filesystem.saved")}
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
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors text-sm"
          >
            {isSaving ? t("settings.my.api.saving") : t("settings.my.api.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
