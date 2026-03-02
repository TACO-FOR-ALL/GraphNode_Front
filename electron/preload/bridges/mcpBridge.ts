// MCP Preload Bridge
import { ipcRenderer, contextBridge } from "electron";
import type {
  MCPServerConfig,
  MCPServerState,
  MCPTool,
  MCPToolCallResult,
} from "../../main/mcp/types";
import type { BuiltinServerInfo } from "../../main/mcp/builtins";

export default function exposeMCPBridge() {
  contextBridge.exposeInMainWorld("mcpAPI", {
    // 서버 목록
    getServers: (): Promise<MCPServerConfig[]> =>
      ipcRenderer.invoke("mcp:get-servers"),

    getBuiltinServers: (): Promise<MCPServerConfig[]> =>
      ipcRenderer.invoke("mcp:get-builtin-servers"),

    getCustomServers: (): Promise<MCPServerConfig[]> =>
      ipcRenderer.invoke("mcp:get-custom-servers"),

    getBuiltinServerInfo: (): Promise<BuiltinServerInfo[]> =>
      ipcRenderer.invoke("mcp:get-builtin-server-info"),

    // 서버 상태
    getServerState: (serverId: string): Promise<MCPServerState | undefined> =>
      ipcRenderer.invoke("mcp:get-server-state", serverId),

    getAllServerStates: (): Promise<MCPServerState[]> =>
      ipcRenderer.invoke("mcp:get-all-server-states"),

    // 서버 관리
    addServer: (server: MCPServerConfig): Promise<boolean> =>
      ipcRenderer.invoke("mcp:add-server", server),

    updateServer: (server: MCPServerConfig): Promise<boolean> =>
      ipcRenderer.invoke("mcp:update-server", server),

    updateServerConfig: (
      serverId: string,
      updates: Partial<MCPServerConfig>
    ): Promise<MCPServerConfig> =>
      ipcRenderer.invoke("mcp:update-server-config", serverId, updates),

    deleteServer: (serverId: string): Promise<boolean> =>
      ipcRenderer.invoke("mcp:delete-server", serverId),

    // 연결 관리
    connectServer: (serverId: string): Promise<MCPServerState> =>
      ipcRenderer.invoke("mcp:connect-server", serverId),

    disconnectServer: (serverId: string): Promise<MCPServerState> =>
      ipcRenderer.invoke("mcp:disconnect-server", serverId),

    toggleServer: (
      serverId: string,
      enabled: boolean
    ): Promise<MCPServerState> =>
      ipcRenderer.invoke("mcp:toggle-server", serverId, enabled),

    // 도구 및 리소스
    callTool: (
      serverId: string,
      toolName: string,
      arguments_: Record<string, unknown>
    ): Promise<MCPToolCallResult> =>
      ipcRenderer.invoke("mcp:call-tool", serverId, toolName, arguments_),

    readResource: (
      serverId: string,
      uri: string
    ): Promise<{ contents: unknown[] }> =>
      ipcRenderer.invoke("mcp:read-resource", serverId, uri),

    getAllTools: (): Promise<Array<{ serverId: string; tools: MCPTool[] }>> =>
      ipcRenderer.invoke("mcp:get-all-tools"),

    // Built-in 서버 설정
    updateBuiltinSettings: (
      serverId: string,
      settings: Record<string, unknown>
    ): Promise<MCPServerConfig> =>
      ipcRenderer.invoke("mcp:update-builtin-settings", serverId, settings),

    // Google OAuth
    startGoogleOAuth: (
      serverType: "google-drive" | "google-calendar"
    ): Promise<{ success: boolean; credentialsPath?: string; error?: string }> =>
      ipcRenderer.invoke("mcp:start-google-oauth", serverType),

    checkGoogleOAuth: (
      serverType: "google-drive" | "google-calendar"
    ): Promise<{ authenticated: boolean; credentialsPath?: string }> =>
      ipcRenderer.invoke("mcp:check-google-oauth", serverType),

    disconnectGoogleOAuth: (
      serverType: "google-drive" | "google-calendar"
    ): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("mcp:disconnect-google-oauth", serverType),

    openGoogleCloudConsole: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke("mcp:open-google-cloud-console"),

    // Google 자격 증명 파일 선택
    selectGoogleCredentialsFile: (): Promise<{
      success: boolean;
      canceled?: boolean;
      error?: string;
      credentialsPath?: string;
      clientId?: string;
    }> => ipcRenderer.invoke("mcp:select-google-credentials-file"),

    // Google 자격 증명 파일 처리 (드래그앤드롭)
    processGoogleCredentialsFile: (
      filePath: string
    ): Promise<{
      success: boolean;
      error?: string;
      credentialsPath?: string;
      clientId?: string;
    }> => ipcRenderer.invoke("mcp:process-google-credentials-file", filePath),

    // Google 자격 증명 내용 저장 (드래그앤드롭 시 file.path 없을 때)
    saveGoogleCredentialsContent: (
      content: string
    ): Promise<{
      success: boolean;
      error?: string;
      credentialsPath?: string;
      clientId?: string;
    }> => ipcRenderer.invoke("mcp:save-google-credentials-content", content),

    // 상태 변경 이벤트 구독
    onStateChanged: (
      callback: (states: MCPServerState[]) => void
    ): (() => void) => {
      const handler = (_: unknown, states: MCPServerState[]) => callback(states);
      ipcRenderer.on("mcp:state-changed", handler);
      return () => {
        ipcRenderer.removeListener("mcp:state-changed", handler);
      };
    },
  });
}
