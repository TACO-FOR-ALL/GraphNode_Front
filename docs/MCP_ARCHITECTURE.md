# MCP (Model Context Protocol) 아키텍처

## 개요

MCP는 AI 에이전트가 외부 도구 및 리소스에 접근할 수 있게 해주는 프로토콜입니다.
GraphNode에서는 Filesystem, Notion, Google Calendar 등의 서비스를 MCP를 통해 연동합니다.

## 파일 구조

```
electron/main/
├── ipc/
│   └── mcp.ts              # IPC 핸들러 (렌더러 ↔ 메인 통신)
│
└── mcp/
    ├── index.ts            # 모듈 진입점 (re-export)
    ├── config.ts           # 설정 파일 관리 (JSON 저장/로드)
    ├── types.ts            # 타입 정의 (src/types/mcp.ts re-export)
    ├── MCPManager.ts       # 서버 라이프사이클 관리 (싱글톤)
    ├── MCPClient.ts        # MCP 프로토콜 클라이언트 (JSON-RPC)
    │
    └── builtins/
        ├── index.ts        # 빌트인 서버 메타데이터
        ├── filesystem.ts   # Filesystem 서버 설정
        ├── notion.ts       # Notion 서버 설정
        └── googleCalendar.ts # Google Calendar 서버 설정

electron/preload/
└── bridges/
    └── mcpBridge.ts        # window.mcpAPI 노출

src/
├── types/
│   └── mcp.ts              # 공통 타입 정의 (메인 소스)
│
├── store/
│   └── useMCPStore.ts      # Zustand 상태 관리
│
└── components/settings/
    ├── MCPPanel.tsx        # MCP 설정 메인 패널
    ├── MCPBuiltInServers.tsx   # 빌트인 서버 목록
    ├── MCPCustomServers.tsx    # 커스텀 서버 목록
    ├── MCPServerCard.tsx       # 서버 카드 컴포넌트
    ├── MCPJsonEditor.tsx       # JSON 에디터
    ├── MCPFilesystemSettings.tsx   # Filesystem 설정 모달
    ├── MCPNotionSettings.tsx       # Notion 설정 모달
    └── MCPGoogleSettings.tsx       # Google Calendar 설정 모달
```

## 각 파일의 역할

### Electron Main Process

| 파일 | 역할 |
|------|------|
| `ipc/mcp.ts` | 렌더러와 메인 프로세스 간 IPC 통신 핸들러. `mcp:connect-server`, `mcp:call-tool` 등 채널 등록 |
| `mcp/config.ts` | MCP 서버 설정을 `~/Library/Application Support/GraphNode/mcp-config.json`에 저장/로드 |
| `mcp/MCPManager.ts` | 여러 MCP 클라이언트의 라이프사이클 관리. 연결/해제, 상태 관리, 싱글톤 패턴 |
| `mcp/MCPClient.ts` | 개별 MCP 서버와 JSON-RPC 통신. 도구 호출, 리소스 읽기 등 실제 프로토콜 구현 |
| `mcp/builtins/index.ts` | Filesystem, Notion, Google Calendar 등 기본 제공 서버의 메타데이터 및 설정 |

### Renderer Process (React)

| 파일 | 역할 |
|------|------|
| `useMCPStore.ts` | Zustand 스토어. 서버 목록, 연결 상태, 도구 정보 관리 |
| `MCPPanel.tsx` | 설정 화면의 MCP 탭. 빌트인/커스텀 서버 섹션 렌더링 |
| `MCPServerCard.tsx` | 개별 서버 카드. 상태 표시, 토글, 설정 버튼 |

## 호출 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                        Renderer Process                          │
│                                                                   │
│  React Component                                                  │
│       │                                                           │
│       ▼                                                           │
│  useMCPStore.ts ──▶ window.mcpAPI.callTool(...)                 │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │ IPC (contextBridge)
┌────────────────────────────┼──────────────────────────────────────┐
│                        Main Process                               │
│                            │                                      │
│                            ▼                                      │
│  ipc/mcp.ts ──▶ ipcMain.handle("mcp:call-tool", ...)            │
│       │                                                           │
│       ▼                                                           │
│  MCPManager.ts ──▶ manager.callTool(serverId, toolName, args)    │
│       │                                                           │
│       ▼                                                           │
│  MCPClient.ts ──▶ client.callTool(toolName, args)                │
│       │                                                           │
│       ▼                                                           │
│  JSON-RPC over stdio                                              │
│       │                                                           │
└───────┼───────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────┐
│   External MCP    │
│      Server       │
│                   │
│ (npx @modelcontext│
│  protocol/...)    │
└───────────────────┘
```

## 타입 정의

모든 MCP 관련 타입은 `src/types/mcp.ts`에 정의되어 있습니다.
`electron/main/mcp/types.ts`는 이를 re-export합니다.

### 주요 타입

```typescript
// 서버 설정
interface MCPServerConfig {
  id: string;
  name: string;
  type: "builtin" | "custom";
  builtinType?: "filesystem" | "notion" | "google-calendar";
  enabled: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  settings?: MCPServerSettings;
}

// 서버 상태
interface MCPServerState {
  id: string;
  status: "disconnected" | "connecting" | "connected" | "error";
  error?: string;
  tools?: MCPTool[];
  resources?: MCPResource[];
}

// MCP 도구
interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, MCPToolProperty>;
    required?: string[];
  };
}
```

## IPC 채널

| 채널 | 설명 |
|------|------|
| `mcp:get-servers` | 모든 서버 설정 가져오기 |
| `mcp:get-builtin-servers` | 빌트인 서버만 가져오기 |
| `mcp:get-custom-servers` | 커스텀 서버만 가져오기 |
| `mcp:get-server-state` | 특정 서버 상태 가져오기 |
| `mcp:get-all-server-states` | 모든 서버 상태 가져오기 |
| `mcp:connect-server` | 서버 연결 |
| `mcp:disconnect-server` | 서버 연결 해제 |
| `mcp:toggle-server` | 서버 활성화/비활성화 (설정 저장 + 연결/해제) |
| `mcp:call-tool` | MCP 도구 호출 |
| `mcp:get-all-tools` | 연결된 모든 서버의 도구 목록 |
| `mcp:add-server` | 커스텀 서버 추가 |
| `mcp:delete-server` | 서버 삭제 |

## 빌트인 서버

### Filesystem
- 로컬 파일 시스템 접근
- 허용된 디렉토리만 접근 가능 (보안)
- 설정: `allowedPaths` 배열

### Notion
- Notion 워크스페이스 접근
- API 키 인증 방식
- 설정: `notionApiKey`

### Google Calendar
- Google Calendar 이벤트 접근
- OAuth credentials 파일 업로드 방식
- `@cocal/google-calendar-mcp` 사용

## 앱 시작 시 자동 연결

`ipc/mcp.ts`에서 앱 시작 시 `enabled: true`인 서버들을 자동으로 연결합니다:

```typescript
export default function mcpIPC() {
  const manager = MCPManager.getInstance();

  // 앱 시작 시 enabled 서버 자동 연결
  manager.autoConnectEnabledServers().catch((error) => {
    console.error("[MCP] Failed to auto-connect servers:", error);
  });

  // IPC 핸들러 등록...
}
```

## 디버깅

DevTools 콘솔에서 `window.mcpAPI`로 직접 테스트 가능:

```javascript
// 서버 목록 확인
await mcpAPI.getServers()

// 서버 연결
await mcpAPI.connectServer("custom-json-0-123456")

// 도구 목록 확인
await mcpAPI.getAllTools()

// 도구 호출
await mcpAPI.callTool("server-id", "tool-name", { arg: "value" })
```

## 설정 파일 위치

- macOS: `~/Library/Application Support/GraphNode/mcp-config.json`
- Windows: `%APPDATA%/GraphNode/mcp-config.json`
- Linux: `~/.config/GraphNode/mcp-config.json`
