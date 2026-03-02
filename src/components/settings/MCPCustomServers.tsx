// Custom MCP 서버 섹션 (개발자 모드)
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiPlus, FiX } from "react-icons/fi";
import type { MCPServerConfig, MCPServerState } from "@/types/mcp";
import MCPServerCard from "./MCPServerCard";
import uuid from "@/utils/uuid";

interface MCPCustomServersProps {
  servers: MCPServerConfig[];
  serverStates: MCPServerState[];
  onToggle: (serverId: string, enabled: boolean) => Promise<void>;
  onAdd: (server: MCPServerConfig) => Promise<void>;
  onDelete: (serverId: string) => Promise<void>;
}

export default function MCPCustomServers({
  servers,
  serverStates,
  onToggle,
  onAdd,
  onDelete,
}: MCPCustomServersProps) {
  const { t } = useTranslation();
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [newServer, setNewServer] = useState({
    name: "",
    command: "",
    args: "",
    env: "",
  });
  const [isAdding, setIsAdding] = useState(false);

  const handleToggle = async (serverId: string, enabled: boolean) => {
    setIsToggling(serverId);
    try {
      await onToggle(serverId, enabled);
    } catch (error) {
      console.error("Failed to toggle server:", error);
    } finally {
      setIsToggling(null);
    }
  };

  const handleDelete = async (serverId: string) => {
    if (
      window.confirm(t("settings.mcp.custom.confirmDelete"))
    ) {
      try {
        await onDelete(serverId);
      } catch (error) {
        console.error("Failed to delete server:", error);
      }
    }
  };

  const handleAddServer = async () => {
    if (!newServer.name.trim() || !newServer.command.trim()) {
      return;
    }

    setIsAdding(true);
    try {
      // Parse args (space-separated)
      const args = newServer.args
        .trim()
        .split(/\s+/)
        .filter((arg) => arg);

      // Parse env (KEY=VALUE format, newline-separated)
      const envEntries = newServer.env
        .trim()
        .split("\n")
        .filter((line) => line.includes("="))
        .map((line) => {
          const [key, ...valueParts] = line.split("=");
          return [key.trim(), valueParts.join("=").trim()];
        });
      const env = Object.fromEntries(envEntries);

      const server: MCPServerConfig = {
        id: `custom-${uuid()}`,
        name: newServer.name.trim(),
        type: "custom",
        enabled: false,
        command: newServer.command.trim(),
        args,
        env,
      };

      await onAdd(server);
      setNewServer({ name: "", command: "", args: "", env: "" });
      setIsAddingServer(false);
    } catch (error) {
      console.error("Failed to add server:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const getServerState = (serverId: string) => {
    return serverStates.find((s) => s.id === serverId);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 서버 목록 */}
      <div className="flex flex-col gap-3">
        {servers.length === 0 && !isAddingServer && (
          <p className="text-sm text-text-tertiary py-4 text-center">
            {t("settings.mcp.custom.noServers")}
          </p>
        )}

        {servers.map((server) => (
          <MCPServerCard
            key={server.id}
            server={server}
            state={getServerState(server.id)}
            onToggle={(enabled) => handleToggle(server.id, enabled)}
            onDelete={() => handleDelete(server.id)}
            isCustom
          />
        ))}
      </div>

      {/* 서버 추가 폼 */}
      {isAddingServer ? (
        <div className="p-4 rounded-lg border border-base-border bg-bg-secondary">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text-primary">
              {t("settings.mcp.custom.addTitle")}
            </h3>
            <button
              onClick={() => setIsAddingServer(false)}
              className="p-1 rounded-md hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {/* 이름 */}
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                {t("settings.mcp.custom.name")}
              </label>
              <input
                type="text"
                value={newServer.name}
                onChange={(e) =>
                  setNewServer({ ...newServer, name: e.target.value })
                }
                placeholder={t("settings.mcp.custom.namePlaceholder")}
                className="w-full px-3 py-2 rounded-md border border-base-border bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* 명령어 */}
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                {t("settings.mcp.custom.command")}
              </label>
              <input
                type="text"
                value={newServer.command}
                onChange={(e) =>
                  setNewServer({ ...newServer, command: e.target.value })
                }
                placeholder={t("settings.mcp.custom.commandPlaceholder")}
                className="w-full px-3 py-2 rounded-md border border-base-border bg-bg-primary text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* 인자 */}
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                {t("settings.mcp.custom.args")}
              </label>
              <input
                type="text"
                value={newServer.args}
                onChange={(e) =>
                  setNewServer({ ...newServer, args: e.target.value })
                }
                placeholder={t("settings.mcp.custom.argsPlaceholder")}
                className="w-full px-3 py-2 rounded-md border border-base-border bg-bg-primary text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* 환경 변수 */}
            <div>
              <label className="block text-xs text-text-secondary mb-1">
                {t("settings.mcp.custom.env")}
              </label>
              <textarea
                value={newServer.env}
                onChange={(e) =>
                  setNewServer({ ...newServer, env: e.target.value })
                }
                placeholder={t("settings.mcp.custom.envPlaceholder")}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-base-border bg-bg-primary text-text-primary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setIsAddingServer(false)}
                className="px-3 py-1.5 rounded-md text-text-secondary hover:bg-bg-tertiary transition-colors text-sm"
              >
                {t("settings.dataPrivacy.cancel")}
              </button>
              <button
                onClick={handleAddServer}
                disabled={
                  !newServer.name.trim() || !newServer.command.trim() || isAdding
                }
                className="px-3 py-1.5 rounded-md bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors text-sm"
              >
                {isAdding ? t("settings.my.api.saving") : t("settings.mcp.custom.add")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingServer(true)}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-dashed border-base-border text-text-secondary hover:text-text-primary hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          <span className="text-sm">{t("settings.mcp.custom.addServer")}</span>
        </button>
      )}

      {/* 경고 */}
      <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30">
        <p className="text-xs text-yellow-700 dark:text-yellow-400">
          {t("settings.mcp.custom.warning")}
        </p>
      </div>
    </div>
  );
}
