# 개발 가이드

## 기술 스택 요약

- Renderer: React 19 + TypeScript + Vite + React Router
- Desktop: Electron (`vite-plugin-electron/simple`)
- 상태 관리: Zustand, React Query
- 로컬 DB: SQLite (`node:sqlite`, Electron main IPC 기반)
- 레거시 로컬 DB: Dexie (IndexedDB), 롤백/참고용
- 테스트: Jest (`ts-jest`, `jsdom`)

## 요구 사항

- Node.js 22+
- npm 10+
- Infisical CLI (`@infisical/cli`)
- macOS/Windows/Linux

## 로컬 실행

```bash
npm install
infisical run -- npm run dev
```

- `infisical run -- npm run dev`는 Infisical에서 환경 변수를 주입한 뒤 Vite + Electron(main/preload 빌드)을 함께 실행합니다.
- 개발 URL은 `http://localhost:5173` 입니다.

## 빌드/테스트

```bash
npm run build
npm test
npm run dist
```

배포 스크립트:

- `npm run dist:mac:arm`
- `npm run dist:mac:intel`
- `npm run dist:mac:all`
- `npm run dist:windows`

CLI 관련:

- `npm run graphnode -- help`
- `npm run graphnode:release-check`

## 주요 폴더 역할

- `src/routes`: 화면 단위 엔트리 컴포넌트
- `src/components`: 재사용 UI
- `src/store`: Zustand 전역 상태
- `src/managers`: 로컬 저장소, 동기화, 클라이언트 로직
- `src/legacy/indexeddb`: 레거시 Dexie 스키마/어댑터
- `packages/storage`: SQLite schema, migration plan, shared storage helper
- `electron/main`: BrowserWindow, IPC handler, 앱 설정
- `electron/preload`: renderer에 노출되는 bridge
- `apps/cli`: graphnode CLI 패키지

## 개발 시 주의할 점

- OpenAI 요청은 renderer에서 직접 호출하지 않고 `openaiIPC`를 통해 main process에서 수행합니다.
- 민감 정보(API 키, 사용자 정보)는 `keytar`에 저장됩니다.
- 노트/폴더/스레드 변경은 repository를 통해 처리해 SQLite + Outbox 동기화 일관성을 유지하세요.
- 실시간 기능(알림/SSE, 그래프 생성)은 `VITE_API_BASE` 주입이 필요하므로 개발 실행은 Infisical 명령 기준으로 맞추세요.
- React Query 캐시 무효화가 컴포넌트 밖에서도 필요하면 `src/queryClient.ts`의 공용 인스턴스를 사용하세요.
- microscope 관련 상태는 `useMicroscopeGenerationStore`, agent 연계 상태는 `useAgentToolBoxStore`에 모여 있습니다.

## SQLite 전환 상태

- 현재 active runtime path는 SQLite 기반입니다.
- renderer는 `window.graphnodeAPI`를 통해 main process의 SQLite IPC를 사용합니다.
- Dexie 코드는 레거시 어댑터와 옛 테스트에만 남아 있으며, 신규 코드는 Dexie를 직접 참조하지 않아야 합니다.

## 코딩 컨벤션

### TypeScript 타입 정의

- 프론트엔드 타입은 camelCase를 사용합니다.
- 서버 API 응답이 snake_case인 경우 `dtoMappers.ts`에서 camelCase로 변환합니다.

```ts
// 서버 응답 (snake_case)
{ cluster_id: "...", node_ids: [...], top_keywords: [...] }

// 프론트엔드 타입 (camelCase)
type GraphSubcluster = {
  clusterId: string;
  nodeIds: number[];
  topKeywords: string[];
};
```

### Zustand 사용 원칙

1. 기본적으로 selector 패턴을 우선합니다.
2. 여러 값을 함께 읽을 때는 객체 selector + shallow 비교를 사용합니다.
3. 렌더링과 무관한 단발성 읽기는 `getState()`를 사용합니다.
4. 전체 구독은 꼭 필요한 경우에만 사용합니다.
