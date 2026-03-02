// Google OAuth MCP 서버 설정 모달
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FiX, FiFile, FiExternalLink, FiCheck, FiAlertCircle, FiUpload } from "react-icons/fi";
import type { MCPServerConfig } from "@/types/mcp";

interface MCPGoogleSettingsProps {
  server: MCPServerConfig;
  onClose: () => void;
  onSave: (settings: Record<string, unknown>) => Promise<void>;
}

export default function MCPGoogleSettings({
  server,
  onClose,
  onSave,
}: MCPGoogleSettingsProps) {
  const { t } = useTranslation();
  const [credentialsPath, setCredentialsPath] = useState(
    server.settings?.googleOAuthCredentialsPath || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    credentialsPath?: string;
  } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);
  const [loadedClientId, setLoadedClientId] = useState<string | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const serverType = server.builtinType as "google-drive" | "google-calendar";
  const serviceName =
    serverType === "google-drive" ? "Google Drive" : "Google Calendar";

  // OAuth 상태 확인
  useEffect(() => {
    checkAuthStatus();
  }, [serverType]);

  const checkAuthStatus = async () => {
    try {
      const status = await window.mcpAPI.checkGoogleOAuth(serverType);
      setAuthStatus(status);
      if (status.credentialsPath) {
        setCredentialsPath(status.credentialsPath);
        setCredentialsLoaded(true);
      }
    } catch (error) {
      console.error("Failed to check OAuth status:", error);
    }
  };

  // 자격 증명 파일 처리
  const handleCredentialsFile = useCallback(async (filePath: string) => {
    setAuthError(null);
    const result = await window.mcpAPI.processGoogleCredentialsFile(filePath);

    if (result.success) {
      setCredentialsPath(result.credentialsPath || "");
      setCredentialsLoaded(true);
      setLoadedClientId(result.clientId || null);
    } else {
      setAuthError(result.error || "Failed to load credentials file");
    }
  }, []);

  // 파일 선택 버튼 클릭
  const handleSelectFile = async () => {
    const result = await window.mcpAPI.selectGoogleCredentialsFile();

    if (result.canceled) {
      return;
    }

    if (result.success) {
      setCredentialsPath(result.credentialsPath || "");
      setCredentialsLoaded(true);
      setLoadedClientId(result.clientId || null);
      setAuthError(null);
    } else {
      setAuthError(result.error || "Failed to load credentials file");
    }
  };

  // 드래그앤드롭 핸들러
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith(".json")) {
      setAuthError("Please drop a JSON file");
      return;
    }

    // Electron에서 file.path가 있으면 사용, 없으면 FileReader로 내용 읽기
    if (file.path) {
      await handleCredentialsFile(file.path);
    } else {
      // FileReader로 파일 내용 읽어서 전달
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const result = await window.mcpAPI.saveGoogleCredentialsContent(content);
          if (result.success) {
            setCredentialsPath(result.credentialsPath || "");
            setCredentialsLoaded(true);
            setLoadedClientId(result.clientId || null);
            setAuthError(null);
          } else {
            setAuthError(result.error || "Failed to save credentials");
          }
        } catch (err) {
          setAuthError("Failed to read file");
        }
      };
      reader.onerror = () => {
        setAuthError("Failed to read file");
      };
      reader.readAsText(file);
    }
  }, [handleCredentialsFile]);

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await window.mcpAPI.startGoogleOAuth(serverType);
      if (result.success) {
        setAuthStatus({ authenticated: true, credentialsPath: result.credentialsPath });
        setCredentialsPath(result.credentialsPath || "");
      } else {
        setAuthError(result.error || "Authentication failed");
      }
    } catch (error) {
      console.error("OAuth error:", error);
      setAuthError(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        googleOAuthCredentialsPath: credentialsPath,
        googleOAuthAuthenticated: authStatus?.authenticated || false,
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const openGoogleCloudConsole = async () => {
    await window.mcpAPI.openGoogleCloudConsole();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-primary rounded-xl shadow-xl w-[500px] max-h-[80vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-base-border">
          <div className="flex items-center gap-2">
            <FiFile className="w-5 h-5 text-text-primary" />
            <h2 className="text-lg font-medium text-text-primary">
              {t("settings.mcp.google.title", { service: serviceName })}
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
          {/* 인증 상태 */}
          <div className={`p-3 rounded-md flex items-center gap-3 ${
            authStatus?.authenticated
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-yellow-500/10 border border-yellow-500/30"
          }`}>
            {authStatus?.authenticated ? (
              <>
                <FiCheck className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    {t("settings.mcp.google.authenticated")}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    {t("settings.mcp.google.connectedTo", { service: serviceName })}
                  </p>
                </div>
              </>
            ) : (
              <>
                <FiAlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    {t("settings.mcp.google.notAuthenticated")}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-500">
                    {t("settings.mcp.google.authRequired")}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* 에러 메시지 */}
          {authError && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
            </div>
          )}

          {/* 인증 버튼 */}
          {!authStatus?.authenticated && (
            <button
              onClick={handleAuthenticate}
              disabled={isAuthenticating || !credentialsLoaded}
              className="w-full py-3 rounded-md bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t("settings.mcp.google.authenticating")}
                </>
              ) : !credentialsLoaded ? (
                t("settings.mcp.google.uploadFirst")
              ) : (
                t("settings.mcp.google.authenticate")
              )}
            </button>
          )}

          {/* 자격 증명 파일 업로드 영역 */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-text-primary">
              {t("settings.mcp.google.credentialsFile")}
            </p>

            {/* 드래그앤드롭 영역 */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer
                ${isDragging
                  ? "border-primary bg-primary/10"
                  : credentialsLoaded
                    ? "border-green-500/50 bg-green-500/5"
                    : "border-base-border hover:border-primary/50 hover:bg-bg-tertiary/50"
                }
              `}
              onClick={handleSelectFile}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                {credentialsLoaded ? (
                  <>
                    <FiCheck className="w-8 h-8 text-green-500" />
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      {t("settings.mcp.google.credentialsLoaded")}
                    </p>
                    {loadedClientId && (
                      <p className="text-xs text-text-tertiary truncate max-w-full">
                        {loadedClientId.slice(0, 30)}...
                      </p>
                    )}
                    <p className="text-xs text-text-tertiary">
                      {t("settings.mcp.google.clickToChange")}
                    </p>
                  </>
                ) : (
                  <>
                    <FiUpload className="w-8 h-8 text-text-tertiary" />
                    <p className="text-sm text-text-secondary">
                      {t("settings.mcp.google.dropOrClick")}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      client_secret_*.json
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 설명 */}
          <p className="text-sm text-text-secondary">
            {t("settings.mcp.google.description", { service: serviceName })}
          </p>

          {/* Google Cloud Console 안내 */}
          <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/30">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                {t("settings.mcp.google.howToGetCredentials")}
              </p>
              <ol className="text-xs text-blue-700 dark:text-blue-400 list-decimal list-inside space-y-1">
                <li>{t("settings.mcp.google.step1")}</li>
                <li>{t("settings.mcp.google.step2")}</li>
                <li>{t("settings.mcp.google.step3")}</li>
                <li>{t("settings.mcp.google.step4")}</li>
              </ol>
              <button
                onClick={openGoogleCloudConsole}
                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
              >
                {t("settings.mcp.google.openConsole")}
                <FiExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-base-border">
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
