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

### Sentry 소스맵 업로드

- 빌드 시 `@sentry/vite-plugin`으로 소스맵 업로드를 수행합니다.
- 업로드는 아래 환경 변수가 모두 준비된 경우에만 활성화됩니다.
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT_WEB`
  - `SENTRY_PROJECT_ELECTRON`
- 선택:
  - `SENTRY_RELEASE`
  - `SENTRY_DEBUG`
  - `VITE_SENTRY_ENABLED`
  - `VITE_SENTRY_DSN_WEB`
  - `VITE_SENTRY_DSN_ELECTRON`
- 권장 토큰 scope:
  - `project:releases`
  - `org:read`

동작 방식:

- `dist/**/*` 렌더러 번들은 웹과 Electron renderer가 함께 사용하므로 `SENTRY_PROJECT_WEB`과 `SENTRY_PROJECT_ELECTRON` 양쪽으로 업로드됩니다.
- `dist-electron/**/*`의 Electron `main/preload` 번들은 `SENTRY_PROJECT_ELECTRON`으로만 업로드됩니다.
- 업로드가 성공하면 `.map` 파일은 산출물에서 삭제되어 배포물에 포함되지 않습니다.
- 런타임 이벤트 전송은 기본적으로 production build 또는 packaged app에서만 활성화됩니다.
- 로컬에서 강제로 테스트하고 싶으면 `VITE_SENTRY_ENABLED=true`를 주입합니다.

업데이트 규칙:

- 소스맵 업로드는 "한 번만" 하는 작업이 아니라 배포 빌드마다 다시 수행해야 합니다.
- 이유는 release와 번들 파일명이 빌드 결과물마다 달라질 수 있고, Sentry는 해당 배포본과 일치하는 소스맵이 있어야 스택트레이스를 원본 코드로 복원할 수 있기 때문입니다.
- SDK 설치/초기화 코드는 한 번 설정하면 되지만, 소스맵 업로드는 새 코드를 배포할 때마다 다시 필요합니다.
- 코드 변경 없이 Sentry UI 설정만 바꾸는 경우에는 소스맵 재업로드가 필요하지 않습니다.

배포 시 포함되는 명령:

- 웹 배포용 production build:

```bash
infisical run --env=prod -- npm run build
```

- Electron 설치 파일 생성:

```bash
infisical run --env=prod -- npm run dist
```

- 위 명령들은 `SENTRY_*` 환경 변수가 준비되어 있으면 빌드 과정에서 release 생성과 소스맵 업로드를 함께 수행합니다.
- 웹은 원격 renderer를 사용하므로 웹 재배포 때 renderer 소스맵이 다시 업로드됩니다.
- Electron `main/preload` 변경은 설치 파일 안에 포함되므로 앱 배포 전 `npm run dist`로 새 설치본을 다시 빌드해야 합니다.

운영 체크포인트:

- CI/CD 또는 배포 환경(Vercel, Infisical, GitHub Actions 등)에도 동일한 `SENTRY_*` 값을 넣어야 합니다.
- 로컬에서 한 번 업로드에 성공했더라도 실제 배포 환경에서 다시 빌드하면 그 배포에 맞는 release/소스맵이 다시 생성됩니다.
- 배포 후에는 Sentry에서 해당 release가 생성되었는지와 source map artifact bundle이 올라갔는지 확인합니다.

프로덕션 검증:

- 환경 변수 점검:

```bash
infisical run --env=prod -- npm run sentry:check
```

- 웹/앱 배포 후 DevTools 콘솔에서 아래 명령으로 테스트 이벤트를 보낼 수 있습니다.

```js
await window.__graphnodeSentry?.smokeTestRenderer();
await window.__graphnodeSentry?.smokeTestPreload();
await window.__graphnodeSentry?.smokeTestMain();
await window.__graphnodeSentry?.smokeTestAll();
```

- 확인할 항목:
  - 이벤트가 웹/Electron 프로젝트 각각에 들어오는지
  - 스택트레이스가 `src/*`, `electron/*` 원본 파일 기준으로 보이는지
  - release 값이 웹/앱 빌드에서 동일하게 잡히는지

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
