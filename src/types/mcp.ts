export type MCPServerType = "builtin" | "custom";

export type MCPServerStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type BuiltinServerType = "filesystem" | "notion" | "google-calendar";

// MCP 서버 설정
export interface MCPServerConfig {
  id: string;
  name: string;
  type: MCPServerType;
  builtinType?: BuiltinServerType;
  enabled: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  settings?: MCPServerSettings;
}

// Built-in 서버별 설정 타입
export interface MCPServerSettings {
  // Filesystem
  allowedPaths?: string[];
  // Notion
  notionApiKey?: string;
  // Google OAuth credentials 파일 경로 (deprecated - 이제 토큰 사용)
  googleOAuthCredentialsPath?: string;
  // Google OAuth 인증 완료 여부
  googleOAuthAuthenticated?: boolean;
}

// MCP 서버 상태
export interface MCPServerState {
  id: string;
  status: MCPServerStatus;
  error?: string;
  tools?: MCPTool[];
  resources?: MCPResource[];
  lastConnected?: number;
}

// MCP Tool 정의 (JSON Schema 기반)
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, MCPToolProperty>;
    required?: string[];
  };
}

export interface MCPToolProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: MCPToolProperty;
}

// MCP Resource 정의
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// MCP Tool 호출 결과
export interface MCPToolCallResult {
  content: MCPContent[];
  isError?: boolean;
}

export interface MCPContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: MCPResource;
}

// Built-in 서버 정보
export interface BuiltinServerInfo {
  type: BuiltinServerType;
  name: string;
  description: string;
  icon: string;
  requiresAuth: boolean;
  authProvider?: "google" | "notion";
  available: boolean;
  unavailableReason?: string;
}

// JSON-RPC 메시지 타입
export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

// MCP 프로토콜 응답 타입
export interface MCPInitializeResult {
  protocolVersion: string;
  capabilities: MCPCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface MCPCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: Record<string, unknown>;
}

export interface MCPToolsListResult {
  tools: MCPTool[];
}

export interface MCPResourcesListResult {
  resources: MCPResource[];
}

// 전체 MCP 설정
export interface MCPConfig {
  servers: MCPServerConfig[];
}

// IPC 이벤트 페이로드
export interface MCPConnectPayload {
  serverId: string;
}

export interface MCPDisconnectPayload {
  serverId: string;
}

export interface MCPToolCallPayload {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface MCPServerUpdatePayload {
  server: MCPServerConfig;
}

export interface MCPServerDeletePayload {
  serverId: string;
}
