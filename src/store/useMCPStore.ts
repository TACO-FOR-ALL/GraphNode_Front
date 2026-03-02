// MCP 상태 관리 Zustand Store
import { create } from "zustand";
import type {
  MCPServerConfig,
  MCPServerState,
  MCPTool,
  BuiltinServerInfo,
} from "@/types/mcp";

interface MCPState {
  // 서버 설정
  servers: MCPServerConfig[];
  builtinServers: MCPServerConfig[];
  customServers: MCPServerConfig[];
  builtinServerInfo: BuiltinServerInfo[];

  // 서버 상태
  serverStates: MCPServerState[];

  // 로딩 상태
  isLoading: boolean;
  error: string | null;

  // 초기화
  initialize: () => Promise<void>;

  // 서버 상태 업데이트
  setServerStates: (states: MCPServerState[]) => void;

  // 서버 관리
  addServer: (server: MCPServerConfig) => Promise<void>;
  updateServer: (server: MCPServerConfig) => Promise<void>;
  deleteServer: (serverId: string) => Promise<void>;

  // 연결 관리
  connectServer: (serverId: string) => Promise<void>;
  disconnectServer: (serverId: string) => Promise<void>;
  toggleServer: (serverId: string, enabled: boolean) => Promise<void>;

  // Built-in 서버 설정
  updateBuiltinSettings: (
    serverId: string,
    settings: Record<string, unknown>
  ) => Promise<void>;

  // Custom 서버 일괄 교체 (JSON 에디터용)
  replaceCustomServers: (servers: MCPServerConfig[]) => Promise<void>;

  // 유틸리티
  getServerState: (serverId: string) => MCPServerState | undefined;
  getAllTools: () => Promise<Array<{ serverId: string; tools: MCPTool[] }>>;
}

export const useMCPStore = create<MCPState>((set, get) => ({
  servers: [],
  builtinServers: [],
  customServers: [],
  builtinServerInfo: [],
  serverStates: [],
  isLoading: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });

    try {
      const [servers, builtinServers, customServers, builtinServerInfo, states] =
        await Promise.all([
          window.mcpAPI.getServers(),
          window.mcpAPI.getBuiltinServers(),
          window.mcpAPI.getCustomServers(),
          window.mcpAPI.getBuiltinServerInfo(),
          window.mcpAPI.getAllServerStates(),
        ]);

      set({
        servers,
        builtinServers,
        customServers,
        builtinServerInfo,
        serverStates: states,
        isLoading: false,
      });

      // 상태 변경 이벤트 구독
      window.mcpAPI.onStateChanged((newStates) => {
        set({ serverStates: newStates });
      });
    } catch (error) {
      console.error("[MCPStore] Initialize failed:", error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  setServerStates: (states) => {
    set({ serverStates: states });
  },

  addServer: async (server) => {
    try {
      await window.mcpAPI.addServer(server);
      const [servers, customServers] = await Promise.all([
        window.mcpAPI.getServers(),
        window.mcpAPI.getCustomServers(),
      ]);
      set({ servers, customServers });
    } catch (error) {
      console.error("[MCPStore] Add server failed:", error);
      throw error;
    }
  },

  updateServer: async (server) => {
    try {
      await window.mcpAPI.updateServer(server);
      const [servers, builtinServers, customServers] = await Promise.all([
        window.mcpAPI.getServers(),
        window.mcpAPI.getBuiltinServers(),
        window.mcpAPI.getCustomServers(),
      ]);
      set({ servers, builtinServers, customServers });
    } catch (error) {
      console.error("[MCPStore] Update server failed:", error);
      throw error;
    }
  },

  deleteServer: async (serverId) => {
    try {
      await window.mcpAPI.deleteServer(serverId);
      const [servers, customServers] = await Promise.all([
        window.mcpAPI.getServers(),
        window.mcpAPI.getCustomServers(),
      ]);
      set({ servers, customServers });
    } catch (error) {
      console.error("[MCPStore] Delete server failed:", error);
      throw error;
    }
  },

  connectServer: async (serverId) => {
    try {
      await window.mcpAPI.connectServer(serverId);
    } catch (error) {
      console.error("[MCPStore] Connect server failed:", error);
      throw error;
    }
  },

  disconnectServer: async (serverId) => {
    try {
      await window.mcpAPI.disconnectServer(serverId);
    } catch (error) {
      console.error("[MCPStore] Disconnect server failed:", error);
      throw error;
    }
  },

  toggleServer: async (serverId, enabled) => {
    try {
      await window.mcpAPI.toggleServer(serverId, enabled);
      const [servers, builtinServers, customServers] = await Promise.all([
        window.mcpAPI.getServers(),
        window.mcpAPI.getBuiltinServers(),
        window.mcpAPI.getCustomServers(),
      ]);
      set({ servers, builtinServers, customServers });
    } catch (error) {
      console.error("[MCPStore] Toggle server failed:", error);
      throw error;
    }
  },

  updateBuiltinSettings: async (serverId, settings) => {
    try {
      await window.mcpAPI.updateBuiltinSettings(serverId, settings);
      const builtinServers = await window.mcpAPI.getBuiltinServers();
      set({ builtinServers });
    } catch (error) {
      console.error("[MCPStore] Update builtin settings failed:", error);
      throw error;
    }
  },

  replaceCustomServers: async (newServers) => {
    try {
      // 기존 커스텀 서버 모두 삭제
      const currentCustom = get().customServers;
      for (const server of currentCustom) {
        await window.mcpAPI.deleteServer(server.id);
      }

      // 새 서버 추가
      for (const server of newServers) {
        await window.mcpAPI.addServer(server);
      }

      // 상태 새로고침
      const [servers, customServers] = await Promise.all([
        window.mcpAPI.getServers(),
        window.mcpAPI.getCustomServers(),
      ]);
      set({ servers, customServers });
    } catch (error) {
      console.error("[MCPStore] Replace custom servers failed:", error);
      throw error;
    }
  },

  getServerState: (serverId) => {
    return get().serverStates.find((s) => s.id === serverId);
  },

  getAllTools: async () => {
    return await window.mcpAPI.getAllTools();
  },
}));
