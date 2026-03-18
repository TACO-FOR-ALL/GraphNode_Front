import type { ChatCompletion } from "openai/resources/chat/completions";
import { Me } from "./Me";
import type { OutboxOpType } from "./Outbox";
import type {
  MCPServerConfig,
  MCPServerState,
  MCPTool,
  MCPToolCallResult,
} from "./mcp";
import type { BuiltinServerInfo } from "./mcp";

export {};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type SQLiteOutboxOp = {
  opId: string;
  entityId: string;
  type: OutboxOpType;
  payload: unknown;
  status: "pending" | "processing";
  retryCount: number;
  nextRetryAt: number;
  createdAt: number;
  updatedAt: number;
  lastError?: string;
};

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
    graphnodeAPI: {
      getPaths: () => Promise<{
        home: string;
        cliNotes: string;
      }>;
      getCliInstallStatus: () => Promise<{
        platform: string;
        supported: boolean;
        cliEntryPath: string | null;
        installDir: string;
        commandPath: string;
        isInstalled: boolean;
        pathConfigured: boolean;
        shellConfigPath?: string | null;
      }>;
      installBundledCli: () => Promise<{
        ok: true;
        platform: string;
        cliEntryPath: string;
        installDir: string;
        commandPath: string;
        pathUpdated: boolean;
        requiresNewTerminal: boolean;
        shellConfigPath?: string | null;
      }>;
      getSQLiteStatus: () => Promise<{
        databasePath: string;
        bootstrap: {
          state: string;
          lastServerTime: string | null;
          lastBootstrappedAt: string | null;
        } | null;
        cursor: {
          serverTime: string;
        } | null;
      }>;
      listSQLiteNotes: () => Promise<
        Array<{
          id: string;
          title: string;
          content: string;
          folderId: string | null;
          createdAt: number;
          updatedAt: number;
        }>
      >;
      listSQLiteFolders: () => Promise<Array<{ id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number }>>;
      listSQLiteThreads: () => Promise<Array<{ id: string; title: string; messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; ts: number; temp?: boolean }>; updatedAt: number }>>;
      getSQLiteNoteById: (id: string) => Promise<{
        id: string;
        title: string;
        content: string;
        folderId: string | null;
        createdAt: number;
        updatedAt: number;
      } | null>;
      getSQLiteFolderById: (id: string) => Promise<{ id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number } | null>;
      getSQLiteFoldersByParentId: (parentId: string | null) => Promise<Array<{ id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number }>>;
      getSQLiteThreadById: (id: string) => Promise<{ id: string; title: string; messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; ts: number; temp?: boolean }>; updatedAt: number } | null>;
      searchSQLiteNotes: (query: string) => Promise<
        Array<{
          id: string;
          title: string;
          content: string;
          folderId: string | null;
          createdAt: number;
          updatedAt: number;
        }>
      >;
      searchSQLiteThreads: (query: string) => Promise<Array<{ id: string; title: string; messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; ts: number; temp?: boolean }>; updatedAt: number }>>;
      upsertSQLiteNote: (note: {
        id: string;
        title: string;
        content: string;
        folderId: string | null;
        createdAt: number;
        updatedAt: number;
      }) => Promise<{ ok: true; note: unknown }>;
      upsertSQLiteFolder: (folder: { id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number }) => Promise<{ ok: true; folder: unknown }>;
      upsertSQLiteThread: (thread: { id: string; title: string; messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; ts: number; temp?: boolean }>; updatedAt: number }) => Promise<{ ok: true; thread: unknown }>;
      bulkUpsertSQLiteNotes: (notes: Array<{
        id: string;
        title: string;
        content: string;
        folderId: string | null;
        createdAt: number;
        updatedAt: number;
      }>) => Promise<{ ok: true; count: number }>;
      bulkUpsertSQLiteFolders: (folders: Array<{ id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number }>) => Promise<{ ok: true; count: number }>;
      bulkUpsertSQLiteThreads: (threads: Array<{ id: string; title: string; messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; ts: number; temp?: boolean }>; updatedAt: number }>) => Promise<{ ok: true; count: number }>;
      deleteSQLiteNote: (id: string) => Promise<{ ok: true; id: string }>;
      bulkDeleteSQLiteNotes: (ids: string[]) => Promise<{ ok: true; count: number }>;
      bulkDeleteSQLiteFolders: (ids: string[]) => Promise<{ ok: true; count: number }>;
      bulkDeleteSQLiteThreads: (ids: string[]) => Promise<{ ok: true; count: number }>;
      clearSQLiteNotes: () => Promise<{ ok: true }>;
      clearSQLiteFolders: () => Promise<{ ok: true }>;
      clearSQLiteThreads: () => Promise<{ ok: true }>;
      listSQLiteOutboxByEntityId: (entityId: string) => Promise<SQLiteOutboxOp[]>;
      listSQLiteOutboxByEntityIds: (entityIds: string[]) => Promise<SQLiteOutboxOp[]>;
      getSQLitePendingOutbox: (entityId: string, type: string) => Promise<SQLiteOutboxOp | null>;
      putSQLiteOutbox: (op: {
        opId: string;
        entityId: string;
        entityType: string;
        type: string;
        payload: unknown;
        status: "pending" | "processing";
        retryCount: number;
        nextRetryAt: number;
        createdAt: number;
        updatedAt: number;
        lastError?: string;
      }) => Promise<{ ok: true }>;
      updateSQLiteOutbox: (opId: string, updates: Record<string, unknown>) => Promise<{ ok: boolean }>;
      deleteSQLiteOutbox: (opId: string) => Promise<{ ok: true }>;
      bulkDeleteSQLiteOutbox: (opIds: string[]) => Promise<{ ok: true; count: number }>;
      deleteSQLiteOutboxByEntityType: (entityType: string) => Promise<{ ok: true; count: number }>;
      requeueStaleSQLiteOutbox: (now: number) => Promise<{ ok: true }>;
      listSQLitePendingOutboxDue: (now: number, limit: number) => Promise<SQLiteOutboxOp[]>;
      replaceSQLiteOutboxEntityId: (oldEntityId: string, newEntityId: string) => Promise<{ ok: true }>;
      listSQLiteTrashedNotes: () => Promise<Array<{
        id: string;
        originalNote: {
          id: string;
          title: string;
          content: string;
          folderId: string | null;
          createdAt: number;
          updatedAt: number;
        };
        deletedAt: number;
        expiresAt: number;
      }>>;
      listSQLiteTrashedThreads: () => Promise<Array<{
        id: string;
        originalThread: {
          id: string;
          title: string;
          messages: Array<{
            id: string;
            role: "user" | "assistant" | "system";
            content: string;
            ts: number;
            temp?: boolean;
          }>;
          updatedAt: number;
        };
        deletedAt: number;
        expiresAt: number;
      }>>;
      listSQLiteTrashedFolders: () => Promise<Array<{
        id: string;
        originalFolder: {
          id: string;
          name: string;
          parentId: string | null;
          createdAt: number;
          updatedAt: number;
        };
        noteIds: string[];
        deletedAt: number;
        expiresAt: number;
      }>>;
      getSQLiteTrashedNoteById: (id: string) => Promise<{
        id: string;
        originalNote: {
          id: string;
          title: string;
          content: string;
          folderId: string | null;
          createdAt: number;
          updatedAt: number;
        };
        deletedAt: number;
        expiresAt: number;
      } | null>;
      getSQLiteTrashedThreadById: (id: string) => Promise<{
        id: string;
        originalThread: {
          id: string;
          title: string;
          messages: Array<{
            id: string;
            role: "user" | "assistant" | "system";
            content: string;
            ts: number;
            temp?: boolean;
          }>;
          updatedAt: number;
        };
        deletedAt: number;
        expiresAt: number;
      } | null>;
      getSQLiteTrashedFolderById: (id: string) => Promise<{
        id: string;
        originalFolder: {
          id: string;
          name: string;
          parentId: string | null;
          createdAt: number;
          updatedAt: number;
        };
        noteIds: string[];
        deletedAt: number;
        expiresAt: number;
      } | null>;
      upsertSQLiteTrashedNote: (trashedNote: {
        id: string;
        originalNote: unknown;
        deletedAt: number;
        expiresAt: number;
      }) => Promise<{ ok: true }>;
      upsertSQLiteTrashedThread: (trashedThread: {
        id: string;
        originalThread: unknown;
        deletedAt: number;
        expiresAt: number;
      }) => Promise<{ ok: true }>;
      upsertSQLiteTrashedFolder: (trashedFolder: {
        id: string;
        originalFolder: unknown;
        noteIds: string[];
        deletedAt: number;
        expiresAt: number;
      }) => Promise<{ ok: true }>;
      deleteSQLiteTrashedNote: (id: string) => Promise<{ ok: true }>;
      deleteSQLiteTrashedThread: (id: string) => Promise<{ ok: true }>;
      deleteSQLiteTrashedFolder: (id: string) => Promise<{ ok: true }>;
      clearSQLiteTrash: () => Promise<{ ok: true }>;
      bulkDeleteExpiredSQLiteTrash: (now: number) => Promise<{ ok: true }>;
      exportSQLiteNotesToDirectory: (notes: Array<{
        id: string;
        title: string;
        content: string;
        folderId: string | null;
        createdAt: number;
        updatedAt: number;
      }>) => Promise<{ canceled: boolean; directory?: string; count?: number }>;
      exportSQLiteThreadsToDirectory: (threads: Array<{
        id: string;
        title: string;
        messages: Array<{
          id: string;
          role: "user" | "assistant" | "system";
          content: string;
          ts: number;
          temp?: boolean;
        }>;
        updatedAt: number;
      }>) => Promise<{ canceled: boolean; directory?: string; filePath?: string; count?: number }>;
      applyStartupSync: (payload: {
        notes: {
          upserts: Array<{
            id: string;
            title: string;
            content: string;
            folderId: string | null;
            createdAt: number;
            updatedAt: number;
          }>;
          deleteIds: string[];
        };
        folders: {
          upserts: Array<{
            id: string;
            name: string;
            parentId: string | null;
            createdAt: number;
            updatedAt: number;
          }>;
          deleteIds: string[];
        };
        threads: {
          upserts: Array<{
            id: string;
            title: string;
            messages: Array<{
              id: string;
              role: "user" | "assistant" | "system";
              content: string;
              ts: number;
              temp?: boolean;
            }>;
            updatedAt: number;
          }>;
          deleteIds: string[];
        };
        serverTime: string;
      }) => Promise<{
        databasePath: string;
        synced: {
          notes: number;
          noteDeletes: number;
          folders: number;
          folderDeletes: number;
          threads: number;
          threadDeletes: number;
        };
      }>;
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
