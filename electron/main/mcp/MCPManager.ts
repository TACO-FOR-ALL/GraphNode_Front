import { BrowserWindow } from "electron";
import { MCPClient } from "./MCPClient";
import {
  MCPServerConfig,
  MCPServerState,
  MCPTool,
  MCPResource,
  MCPToolCallResult,
} from "./types";
import { loadMCPConfig, saveMCPConfig } from "./config";
import { getBuiltinServerConfig } from "./builtins";

class MCPManager {
  private static instance: MCPManager;
  private clients: Map<string, MCPClient> = new Map();
  private states: Map<string, MCPServerState> = new Map();

  private constructor() {}

  static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  // 서버 설정 목록 가져오기
  async getServers(): Promise<MCPServerConfig[]> {
    const config = await loadMCPConfig();
    return config.servers;
  }

  // 서버 상태 가져오기
  getServerState(serverId: string): MCPServerState | undefined {
    return this.states.get(serverId);
  }

  // 모든 서버 상태 가져오기
  getAllServerStates(): MCPServerState[] {
    return Array.from(this.states.values());
  }

  // 서버 추가
  async addServer(server: MCPServerConfig): Promise<void> {
    const config = await loadMCPConfig();
    const existingIndex = config.servers.findIndex((s) => s.id === server.id);

    if (existingIndex >= 0) {
      config.servers[existingIndex] = server;
    } else {
      config.servers.push(server);
    }

    await saveMCPConfig(config);

    // 상태 초기화
    this.states.set(server.id, {
      id: server.id,
      status: "disconnected",
    });

    this.notifyStateChange();
  }

  // 서버 업데이트
  async updateServer(server: MCPServerConfig): Promise<void> {
    const config = await loadMCPConfig();
    const index = config.servers.findIndex((s) => s.id === server.id);

    if (index < 0) {
      throw new Error(`Server not found: ${server.id}`);
    }

    // 연결 중인 경우 먼저 해제
    if (this.clients.has(server.id)) {
      await this.disconnectServer(server.id);
    }

    config.servers[index] = server;
    await saveMCPConfig(config);

    this.notifyStateChange();
  }

  // 서버 삭제
  async deleteServer(serverId: string): Promise<void> {
    // 연결 중인 경우 먼저 해제
    if (this.clients.has(serverId)) {
      await this.disconnectServer(serverId);
    }

    const config = await loadMCPConfig();
    config.servers = config.servers.filter((s) => s.id !== serverId);
    await saveMCPConfig(config);

    this.states.delete(serverId);
    this.notifyStateChange();
  }

  // 서버 연결
  async connectServer(serverId: string): Promise<void> {
    const config = await loadMCPConfig();
    let serverConfig = config.servers.find((s) => s.id === serverId);

    if (!serverConfig) {
      throw new Error(`Server not found: ${serverId}`);
    }

    // Built-in 서버인 경우 설정 merge
    if (serverConfig.type === "builtin" && serverConfig.builtinType) {
      const builtinConfig = getBuiltinServerConfig(
        serverConfig.builtinType,
        serverConfig.settings,
      );
      serverConfig = { ...serverConfig, ...builtinConfig };
    }

    // 이미 연결 중인 경우
    if (this.clients.has(serverId)) {
      const existingClient = this.clients.get(serverId);
      if (existingClient?.isConnected()) {
        return;
      }
      // 연결이 끊어진 클라이언트 정리
      this.clients.delete(serverId);
    }

    // 상태 업데이트
    this.updateState(serverId, { status: "connecting" });

    try {
      const client = new MCPClient(serverConfig);

      // 이벤트 핸들러 설정
      client.on("error", (error: Error) => {
        console.error(`[MCPManager] Server ${serverId} error:`, error);
        this.updateState(serverId, {
          status: "error",
          error: error.message,
        });
      });

      client.on("close", () => {
        console.log(`[MCPManager] Server ${serverId} closed`);
        this.clients.delete(serverId);
        this.updateState(serverId, { status: "disconnected" });
      });

      // 연결
      await client.connect();
      this.clients.set(serverId, client);

      // 도구 및 리소스 목록 가져오기
      let tools: MCPTool[] = [];
      let resources: MCPResource[] = [];

      try {
        const toolsResult = await client.listTools();
        tools = toolsResult.tools || [];
      } catch (e) {
        console.warn(`[MCPManager] Failed to list tools for ${serverId}:`, e);
      }

      try {
        const resourcesResult = await client.listResources();
        resources = resourcesResult.resources || [];
      } catch (e) {
        console.warn(
          `[MCPManager] Failed to list resources for ${serverId}:`,
          e,
        );
      }

      this.updateState(serverId, {
        status: "connected",
        tools,
        resources,
        lastConnected: Date.now(),
        error: undefined,
      });
    } catch (error) {
      console.error(`[MCPManager] Failed to connect ${serverId}:`, error);
      this.updateState(serverId, {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  // 서버 연결 해제
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      await client.disconnect();
      this.clients.delete(serverId);
    }
    this.updateState(serverId, {
      status: "disconnected",
      tools: undefined,
      resources: undefined,
    });
  }

  // 도구 호출
  async callTool(
    serverId: string,
    toolName: string,
    arguments_: Record<string, unknown>,
  ): Promise<MCPToolCallResult> {
    const client = this.clients.get(serverId);
    if (!client?.isConnected()) {
      throw new Error(`Server not connected: ${serverId}`);
    }

    return await client.callTool(toolName, arguments_);
  }

  // 리소스 읽기
  async readResource(
    serverId: string,
    uri: string,
  ): Promise<{ contents: unknown[] }> {
    const client = this.clients.get(serverId);
    if (!client?.isConnected()) {
      throw new Error(`Server not connected: ${serverId}`);
    }

    return await client.readResource(uri);
  }

  // 연결된 모든 서버의 도구 목록 가져오기
  getAllTools(): Array<{ serverId: string; tools: MCPTool[] }> {
    const result: Array<{ serverId: string; tools: MCPTool[] }> = [];

    for (const [serverId, state] of this.states) {
      if (state.status === "connected" && state.tools) {
        result.push({ serverId, tools: state.tools });
      }
    }

    return result;
  }

  // 상태 업데이트 및 알림
  private updateState(
    serverId: string,
    updates: Partial<MCPServerState>,
  ): void {
    const current = this.states.get(serverId) || {
      id: serverId,
      status: "disconnected" as const,
    };
    this.states.set(serverId, { ...current, ...updates });
    this.notifyStateChange();
  }

  // 렌더러에 상태 변경 알림
  private notifyStateChange(): void {
    const windows = BrowserWindow.getAllWindows();
    const states = this.getAllServerStates();

    for (const window of windows) {
      if (!window.isDestroyed()) {
        window.webContents.send("mcp:state-changed", states);
      }
    }
  }

  // 앱 시작 시 enabled 서버 자동 연결
  async autoConnectEnabledServers(): Promise<void> {
    const config = await loadMCPConfig();

    for (const server of config.servers) {
      if (server.enabled) {
        try {
          await this.connectServer(server.id);
        } catch (error) {
          console.error(
            `[MCPManager] Failed to auto-connect ${server.id}:`,
            error,
          );
        }
      } else {
        // 상태 초기화
        this.states.set(server.id, {
          id: server.id,
          status: "disconnected",
        });
      }
    }
  }

  // 앱 종료 시 모든 서버 연결 해제
  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys());
    for (const serverId of serverIds) {
      try {
        await this.disconnectServer(serverId);
      } catch (error) {
        console.error(`[MCPManager] Failed to disconnect ${serverId}:`, error);
      }
    }
  }
}

export default MCPManager;
