// MCP 설정 패널
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import SettingsPanelLayout from "./SettingsPanelLayout";
import SettingCategoryTitle from "./SettingCategoryTitle";
import MCPBuiltInServers from "./MCPBuiltInServers";
import MCPCustomServers from "./MCPCustomServers";
import MCPJsonEditor from "./MCPJsonEditor";
import { useMCPStore } from "@/store/useMCPStore";

export default function MCPPanel() {
  const { t } = useTranslation();
  const {
    builtinServers,
    customServers,
    serverStates,
    builtinServerInfo,
    isLoading,
    error,
    initialize,
    toggleServer,
    updateBuiltinSettings,
    addServer,
    deleteServer,
    replaceCustomServers,
  } = useMCPStore();

  const [isDevMode, setIsDevMode] = useState(false);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 개발자 모드 로드 (localStorage에서)
  useEffect(() => {
    const devMode = localStorage.getItem("graphnode-dev-mode") === "true";
    setIsDevMode(devMode);
  }, []);

  if (isLoading) {
    return (
      <SettingsPanelLayout>
        <SettingCategoryTitle
          title={t("settings.mcp.title")}
          subtitle={t("settings.mcp.subtitle")}
        />
        <div className="flex items-center justify-center py-8 w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </SettingsPanelLayout>
    );
  }

  if (error) {
    return (
      <SettingsPanelLayout>
        <SettingCategoryTitle
          title={t("settings.mcp.title")}
          subtitle={t("settings.mcp.subtitle")}
        />
        <div className="flex flex-col items-center justify-center py-8 w-full gap-2">
          <p className="text-red-500">{error}</p>
          <button
            onClick={initialize}
            className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors text-sm"
          >
            {t("visualize.error.retry")}
          </button>
        </div>
      </SettingsPanelLayout>
    );
  }

  return (
    <SettingsPanelLayout>
      {/* 메인 타이틀 */}
      <SettingCategoryTitle
        title={t("settings.mcp.title")}
        subtitle={t("settings.mcp.subtitle")}
      />

      {/* Built-in 서버 섹션 */}
      <div className="w-full flex flex-col gap-3">
        <h3 className="text-sm font-medium text-text-secondary">
          {t("settings.mcp.builtinSection")}
        </h3>
        <MCPBuiltInServers
          servers={builtinServers}
          serverStates={serverStates}
          builtinServerInfo={builtinServerInfo}
          onToggle={toggleServer}
          onUpdateSettings={updateBuiltinSettings}
        />
      </div>

      {/* Custom 서버 섹션 */}
      <div className="w-full flex flex-col gap-3 mt-4">
        <h3 className="text-sm font-medium text-text-secondary">
          {t("settings.mcp.customSection")}
        </h3>

        {/* 개발자 모드 활성화 안내 or 커스텀 서버 관리 */}
        {isDevMode ? (
          <>
            {/* 커스텀 서버 카드 목록 */}
            <MCPCustomServers
              servers={customServers}
              serverStates={serverStates}
              onToggle={toggleServer}
              onAdd={addServer}
              onDelete={deleteServer}
            />

            {/* JSON 에디터 */}
            <MCPJsonEditor
              servers={customServers}
              onSave={replaceCustomServers}
            />
          </>
        ) : (
          <div className="p-4 bg-bg-secondary rounded-lg border border-base-border">
            <p className="text-sm text-text-secondary">
              {t("settings.mcp.enableDevMode")}
            </p>
          </div>
        )}
      </div>

      {/* MCP 정보 섹션 */}
      <div className="w-full flex flex-col gap-2 mt-4">
        <a
          className="text-sm text-primary cursor-pointer hover:underline"
          onClick={(e) => {
            e.preventDefault();
            window.systemAPI.openExternal(
              "https://graphnode.site/dev/docs/mcp",
            );
          }}
        >
          {t("settings.mcp.about.docsLink")}
        </a>
        <a
          className="text-sm text-primary cursor-pointer hover:underline"
          onClick={(e) => {
            e.preventDefault();
            window.systemAPI.openExternal("https://modelcontextprotocol.io");
          }}
        >
          {t("settings.mcp.about.learnMore")}
        </a>
      </div>
    </SettingsPanelLayout>
  );
}
