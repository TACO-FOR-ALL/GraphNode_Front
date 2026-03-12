import type { ChatCompletion } from "openai/resources/chat/completions";
import { Me } from "./Me";
import type {
  MCPServerConfig,
  MCPServerState,
  MCPTool,
  MCPToolCallResult,
} from "./mcp";
import type { BuiltinServerInfo } from "./mcp";

export {};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

declare global {
  const __APP_VERSION__: string;
  interface File {
    path?: string;
  }
  interface Window {
    windowAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      platform: "darwin" | "win32" | "linux";
    };
    electron: {
      send: (channel: string, ...args: any[]) => void;
    };
    systemAPI: {
      getLocale: () => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      getSettings: () => Promise<{
        hardwareAcceleration: boolean;
        desktopNotification: boolean;
      }>;
      saveSettings: (settings: {
        hardwareAcceleration?: boolean;
        desktopNotification?: boolean;
      }) => Promise<{
        hardwareAcceleration: boolean;
        desktopNotification: boolean;
      }>;
      restartApp: () => Promise<void>;
    };
    openaiAPI: {
      checkAPIKeyValid: (apiKey: string) => Promise<Result<true>>;
      request: (
        apiKey: string,
        stream: boolean,
        model: string,
        messages: ChatMessageRequest[],
      ) => Promise<Result<ChatCompletion>>;
      requestGenerateThreadTitle: (
        apiKey: string,
        firstUserMessage: string,
        opts?: { timeoutMs?: number },
      ) => Promise<Result<string>>;
    };
    keytarAPI: {
      getAPIKey: (modelName: string) => Promise<string | null>;
      setAPIKey: (modelName: string, apiKey: string) => Promise<void>;
      deleteAPIKey: (modelName: string) => Promise<void>;
      getMe: () => Promise<Me | null>;
      setMe: (me: Me) => Promise<void>;
    };
    fileAPI: {
      readFileStream: (absPath: string, id: string) => void;
      onReadProgress: (
        cb: (p: { id: string; percent: number }) => void,
      ) => () => void;
      onReadComplete: (
        cb: (p: { id: string; text: string }) => void,
      ) => () => void;
      onReadError: (
        cb: (p: { id: string; message: string }) => void,
      ) => () => void;
    };
    notification: {
      start: (senderId: string) => void;
      onToken: (callback: (token: string) => void) => void;
      onReceive: (callback: (notification: any) => void) => void;
      onError: (callback: (error: any) => void) => void;
      activateWindow: () => void;
      setBadge: (count: number) => void;
      showNative: (options: {
        title: string;
        body: string;
        silent?: boolean;
      }) => void;
    };
    mcpAPI: {
      // 서버 목록
      getServers: () => Promise<MCPServerConfig[]>;
      getBuiltinServers: () => Promise<MCPServerConfig[]>;
      getCustomServers: () => Promise<MCPServerConfig[]>;
      getBuiltinServerInfo: () => Promise<BuiltinServerInfo[]>;
      // 서버 상태
      getServerState: (serverId: string) => Promise<MCPServerState | undefined>;
      getAllServerStates: () => Promise<MCPServerState[]>;
      // 서버 관리
      addServer: (server: MCPServerConfig) => Promise<boolean>;
      updateServer: (server: MCPServerConfig) => Promise<boolean>;
      updateServerConfig: (
        serverId: string,
        updates: Partial<MCPServerConfig>,
      ) => Promise<MCPServerConfig>;
      deleteServer: (serverId: string) => Promise<boolean>;
      // 연결 관리
      connectServer: (serverId: string) => Promise<MCPServerState>;
      disconnectServer: (serverId: string) => Promise<MCPServerState>;
      toggleServer: (
        serverId: string,
        enabled: boolean,
      ) => Promise<MCPServerState>;
      // 도구 및 리소스
      callTool: (
        serverId: string,
        toolName: string,
        arguments_: Record<string, unknown>,
      ) => Promise<MCPToolCallResult>;
      readResource: (
        serverId: string,
        uri: string,
      ) => Promise<{ contents: unknown[] }>;
      getAllTools: () => Promise<Array<{ serverId: string; tools: MCPTool[] }>>;
      // Built-in 서버 설정
      updateBuiltinSettings: (
        serverId: string,
        settings: Record<string, unknown>,
      ) => Promise<MCPServerConfig>;
      // Google OAuth
      startGoogleOAuth: (
        serverType: "google-drive" | "google-calendar",
      ) => Promise<{
        success: boolean;
        credentialsPath?: string;
        error?: string;
      }>;
      checkGoogleOAuth: (
        serverType: "google-drive" | "google-calendar",
      ) => Promise<{ authenticated: boolean; credentialsPath?: string }>;
      disconnectGoogleOAuth: (
        serverType: "google-drive" | "google-calendar",
      ) => Promise<{ success: boolean }>;
      openGoogleCloudConsole: () => Promise<{ success: boolean }>;
      // Google 자격 증명 파일
      selectGoogleCredentialsFile: () => Promise<{
        success: boolean;
        canceled?: boolean;
        error?: string;
        credentialsPath?: string;
        clientId?: string;
      }>;
      processGoogleCredentialsFile: (
        filePath: string,
      ) => Promise<{
        success: boolean;
        error?: string;
        credentialsPath?: string;
        clientId?: string;
      }>;
      saveGoogleCredentialsContent: (
        content: string,
      ) => Promise<{
        success: boolean;
        error?: string;
        credentialsPath?: string;
        clientId?: string;
      }>;
      // 상태 변경 이벤트
      onStateChanged: (
        callback: (states: MCPServerState[]) => void,
      ) => () => void;
    };
  }
}
