// Built-in MCP 서버 섹션
import { useState } from "react";
import type { MCPServerConfig, MCPServerState, BuiltinServerInfo } from "@/types/mcp";
import MCPServerCard from "./MCPServerCard";
import MCPFilesystemSettings from "./MCPFilesystemSettings";
import MCPNotionSettings from "./MCPNotionSettings";
import MCPGoogleSettings from "./MCPGoogleSettings";

interface MCPBuiltInServersProps {
  servers: MCPServerConfig[];
  serverStates: MCPServerState[];
  builtinServerInfo: BuiltinServerInfo[];
  onToggle: (serverId: string, enabled: boolean) => Promise<void>;
  onUpdateSettings: (
    serverId: string,
    settings: Record<string, unknown>
  ) => Promise<void>;
}

export default function MCPBuiltInServers({
  servers,
  serverStates,
  builtinServerInfo,
  onToggle,
  onUpdateSettings,
}: MCPBuiltInServersProps) {
  const [settingsServerId, setSettingsServerId] = useState<string | null>(null);

  const handleToggle = async (serverId: string, enabled: boolean) => {
    try {
      // Google 서버이고 비활성화하는 경우 OAuth 연결도 해제
      if (!enabled) {
        const server = servers.find((s) => s.id === serverId);
        if (server?.builtinType === "google-calendar") {
          await window.mcpAPI.disconnectGoogleOAuth("google-calendar");
        }
      }
      await onToggle(serverId, enabled);
    } catch (error) {
      console.error("Failed to toggle server:", error);
    }
  };

  const getServerState = (serverId: string) => {
    return serverStates.find((s) => s.id === serverId);
  };

  const getServerInfo = (builtinType?: string) => {
    return builtinServerInfo.find((info) => info.type === builtinType);
  };

  const selectedServer = servers.find((s) => s.id === settingsServerId);

  const needsSettings = (builtinType?: string) => {
    return ["filesystem", "notion", "google-calendar"].includes(
      builtinType || ""
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 서버 목록 */}
      <div className="flex flex-col gap-3">
        {servers.map((server) => {
          const serverInfo = getServerInfo(server.builtinType);
          return (
            <MCPServerCard
              key={server.id}
              server={server}
              state={getServerState(server.id)}
              onToggle={(enabled) => handleToggle(server.id, enabled)}
              onSettings={
                needsSettings(server.builtinType)
                  ? () => setSettingsServerId(server.id)
                  : undefined
              }
              available={serverInfo?.available ?? true}
              unavailableReason={serverInfo?.unavailableReason}
            />
          );
        })}
      </div>

      {/* Filesystem 설정 모달 */}
      {settingsServerId && selectedServer?.builtinType === "filesystem" && (
        <MCPFilesystemSettings
          server={selectedServer}
          onClose={() => setSettingsServerId(null)}
          onSave={async (settings) => {
            await onUpdateSettings(settingsServerId, settings);
            setSettingsServerId(null);
          }}
        />
      )}

      {/* Notion 설정 모달 */}
      {settingsServerId && selectedServer?.builtinType === "notion" && (
        <MCPNotionSettings
          server={selectedServer}
          onClose={() => setSettingsServerId(null)}
          onSave={async (settings) => {
            await onUpdateSettings(settingsServerId, settings);
            setSettingsServerId(null);
          }}
        />
      )}

      {/* Google Calendar 설정 모달 */}
      {settingsServerId &&
        selectedServer?.builtinType === "google-calendar" && (
          <MCPGoogleSettings
            server={selectedServer}
            onClose={() => setSettingsServerId(null)}
            onSave={async (settings) => {
              await onUpdateSettings(settingsServerId, settings);
              setSettingsServerId(null);
            }}
          />
        )}
    </div>
  );
}
