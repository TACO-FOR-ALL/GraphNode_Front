import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { MCPConfig, MCPServerConfig, BuiltinServerType } from "./types";

const CONFIG_FILE_NAME = "mcp-config.json";

function getConfigPath(): string {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, CONFIG_FILE_NAME);
}

// 기본 Built-in 서버 설정
function getDefaultBuiltinServers(): MCPServerConfig[] {
  return [
    {
      id: "builtin-filesystem",
      name: "Filesystem",
      type: "builtin",
      builtinType: "filesystem",
      enabled: false,
      settings: {
        allowedPaths: [],
      },
    },
    {
      id: "builtin-notion",
      name: "Notion",
      type: "builtin",
      builtinType: "notion",
      enabled: false,
      settings: {},
    },
    {
      id: "builtin-google-calendar",
      name: "Google Calendar",
      type: "builtin",
      builtinType: "google-calendar",
      enabled: false,
      settings: {},
    },
  ];
}

function getDefaultConfig(): MCPConfig {
  return {
    servers: getDefaultBuiltinServers(),
  };
}

// 설정 로드
export async function loadMCPConfig(): Promise<MCPConfig> {
  const configPath = getConfigPath();

  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(data) as MCPConfig;

      // Built-in 서버가 없으면 추가
      const builtinTypes: BuiltinServerType[] = [
        "filesystem",
        "notion",
        "google-calendar",
      ];
      const defaultBuiltins = getDefaultBuiltinServers();

      for (const builtinType of builtinTypes) {
        const exists = config.servers.some(
          (s) => s.type === "builtin" && s.builtinType === builtinType,
        );
        if (!exists) {
          const defaultServer = defaultBuiltins.find(
            (s) => s.builtinType === builtinType,
          );
          if (defaultServer) {
            config.servers.push(defaultServer);
          }
        }
      }

      return config;
    }
  } catch (error) {
    console.error("[MCP Config] Failed to load config:", error);
  }

  // 기본 설정 반환 및 저장
  const defaultConfig = getDefaultConfig();
  await saveMCPConfig(defaultConfig);
  return defaultConfig;
}

// 설정 저장
export async function saveMCPConfig(config: MCPConfig): Promise<void> {
  const configPath = getConfigPath();

  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("[MCP Config] Failed to save config:", error);
    throw error;
  }
}

// 특정 서버 설정 가져오기
export async function getServerConfig(
  serverId: string,
): Promise<MCPServerConfig | undefined> {
  const config = await loadMCPConfig();
  return config.servers.find((s) => s.id === serverId);
}

// 특정 서버 설정 업데이트
export async function updateServerConfig(
  serverId: string,
  updates: Partial<MCPServerConfig>,
): Promise<MCPServerConfig> {
  const config = await loadMCPConfig();
  const index = config.servers.findIndex((s) => s.id === serverId);

  if (index < 0) {
    throw new Error(`Server not found: ${serverId}`);
  }

  config.servers[index] = { ...config.servers[index], ...updates };
  await saveMCPConfig(config);

  return config.servers[index];
}

// Custom 서버 설정 가져오기
export async function getCustomServers(): Promise<MCPServerConfig[]> {
  const config = await loadMCPConfig();
  return config.servers.filter((s) => s.type === "custom");
}

// Built-in 서버 설정 가져오기
export async function getBuiltinServers(): Promise<MCPServerConfig[]> {
  const config = await loadMCPConfig();
  return config.servers.filter((s) => s.type === "builtin");
}
