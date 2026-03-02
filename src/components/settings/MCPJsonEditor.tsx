import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FiSave, FiAlertCircle, FiCheck } from "react-icons/fi";
import type { MCPServerConfig } from "@/types/mcp";

interface MCPJsonEditorProps {
  servers: MCPServerConfig[];
  onSave: (servers: MCPServerConfig[]) => Promise<void>;
}

interface MCPJsonConfig {
  mcp: Array<{
    name: string;
    command: string;
    args?: string | string[];
    env?: Record<string, string>;
  }>;
}

// 기본 JSON 템플릿
const DEFAULT_TEMPLATE = `{
  "mcp": [
    {
      "name": "Example Server",
      "command": "npx",
      "args": "-y @modelcontextprotocol/server-example",
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  ]
}`;

export default function MCPJsonEditor({ servers, onSave }: MCPJsonEditorProps) {
  const { t } = useTranslation();
  const [jsonValue, setJsonValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 서버 목록을 JSON으로 변환
  const serversToJson = useCallback((serverList: MCPServerConfig[]): string => {
    const mcpConfig: MCPJsonConfig = {
      mcp: serverList.map((server) => ({
        name: server.name,
        command: server.command || "",
        args: server.args?.join(" ") || "",
        env: server.env || {},
      })),
    };

    if (mcpConfig.mcp.length === 0) {
      return DEFAULT_TEMPLATE;
    }

    return JSON.stringify(mcpConfig, null, 2);
  }, []);

  // 초기 로드
  useEffect(() => {
    setJsonValue(serversToJson(servers));
  }, [servers, serversToJson]);

  // JSON 유효성 검사
  const validateJson = (
    value: string,
  ): { valid: boolean; config?: MCPJsonConfig; error?: string } => {
    try {
      const parsed = JSON.parse(value) as MCPJsonConfig;

      if (!parsed.mcp || !Array.isArray(parsed.mcp)) {
        return { valid: false, error: t("settings.mcp.json.errorMcpArray") };
      }

      for (let i = 0; i < parsed.mcp.length; i++) {
        const server = parsed.mcp[i];
        if (!server.name || typeof server.name !== "string") {
          return {
            valid: false,
            error: t("settings.mcp.json.errorName", { index: i + 1 }),
          };
        }
        if (!server.command || typeof server.command !== "string") {
          return {
            valid: false,
            error: t("settings.mcp.json.errorCommand", { index: i + 1 }),
          };
        }
      }

      return { valid: true, config: parsed };
    } catch (e) {
      return { valid: false, error: t("settings.mcp.json.errorParse") };
    }
  };

  // JSON을 서버 설정으로 변환
  const jsonToServers = (config: MCPJsonConfig): MCPServerConfig[] => {
    return config.mcp.map((item, index) => {
      // args 처리: string이면 split, array면 그대로
      let args: string[] = [];
      if (typeof item.args === "string") {
        args = item.args.trim().split(/\s+/).filter(Boolean);
      } else if (Array.isArray(item.args)) {
        args = item.args;
      }

      return {
        id: `custom-json-${index}-${Date.now()}`,
        name: item.name,
        type: "custom" as const,
        enabled: false,
        command: item.command,
        args,
        env: item.env || {},
      };
    });
  };

  // 저장 핸들러
  const handleSave = async () => {
    const validation = validateJson(jsonValue);

    if (!validation.valid) {
      setError(validation.error || "Invalid JSON");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const newServers = jsonToServers(validation.config!);
      await onSave(newServers);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      setError(t("settings.mcp.json.errorSave"));
    } finally {
      setIsSaving(false);
    }
  };

  // 텍스트 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonValue(e.target.value);
    setError(null);
    setSaveSuccess(false);
  };

  // 키보드 단축키 (Cmd/Ctrl + S)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 에디터 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-tertiary">
          {t("settings.mcp.json.hint")}
        </p>
        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <FiCheck className="w-3 h-3" />
              {t("settings.mcp.json.saved")}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-white disabled:opacity-50 hover:bg-primary/90 transition-colors text-sm"
          >
            <FiSave className="w-4 h-4" />
            {isSaving ? t("settings.my.api.saving") : t("settings.my.api.save")}
          </button>
        </div>
      </div>

      {/* JSON 에디터 */}
      <div className="relative">
        <textarea
          value={jsonValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className={`w-full h-[400px] px-8 py-2.5 rounded-lg border font-mono text-sm resize-none focus:outline-none focus:ring-2 transition-colors
            ${
              error
                ? "border-red-500 bg-red-500/5 focus:ring-red-500/50"
                : "border-base-border bg-bg-secondary text-text-primary focus:ring-primary/50"
            }`}
          placeholder={DEFAULT_TEMPLATE}
        />

        {/* 라인 넘버 오버레이 (선택적) */}
        <div className="absolute top-2.5 left-0 w-8 text-right pr-2 text-text-tertiary text-sm font-mono pointer-events-none select-none">
          {jsonValue.split("\n").map((_, i) => (
            <div key={i} className="leading-[1.43]">
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30">
          <FiAlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {/* 도움말 */}
      <div className="p-4 rounded-lg bg-bg-secondary border border-base-border">
        <h4 className="text-sm font-medium text-text-primary mb-2">
          {t("settings.mcp.json.formatTitle")}
        </h4>
        <pre className="text-xs text-text-tertiary font-mono overflow-x-auto">
          {`{
  "mcp": [
    {
      "name": "서버 이름",
      "command": "npx",
      "args": "-y @package/name --option value",
      "env": {
        "API_KEY": "your-key"
      }
    }
  ]
}`}
        </pre>
      </div>

      {/* 경고 */}
      <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30">
        <p className="text-xs text-yellow-700 dark:text-yellow-400">
          {t("settings.mcp.custom.warning")}
        </p>
      </div>
    </div>
  );
}
