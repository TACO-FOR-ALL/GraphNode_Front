# 아키텍처

## 런타임 구조

GraphNode Front는 Electron의 3계층 구조를 사용합니다.

1. Main Process (`electron/main`)
2. Preload (`electron/preload`)
3. Renderer (`src`)

Main은 OS 자원 접근과 IPC 핸들러를 담당하고, Renderer는 UI와 상태, 로컬 데이터 접근을 담당합니다.

현재 로컬 데이터의 활성 저장 경로는 SQLite이며, Renderer는 직접 SQLite 파일을 열지 않고 preload bridge를 통해 Electron main의 SQLite IPC를 사용합니다.

## 앱 부팅 순서

1. Electron app 시작
2. `electron/main/main.ts`에서 하드웨어 가속 설정 로드
3. 스플래시 창 생성 후 렌더러 URL 결정
   - 개발 모드: `VITE_DEV_SERVER_URL`
   - 패키지 모드: `https://graphnode.site/app`
4. Renderer `src/main.tsx`에서
   - `startSyncLoop()` 시작
   - i18n 초기화
   - `QueryClientProvider` + `App` 렌더
5. `src/App.tsx`에서 startup pull sync, 설정 로드, 알림 연결 등 초기화 수행

## 라우팅 구조

Router는 `HashRouter` 기반입니다.

- `/login`
- `/` (Home)
- `/chat/:threadId?`
- `/note/:noteId?`
- `/visualize`
- `/visualize/:nodeId`
- `/settings`

## 상태 관리

- 서버 상태: React Query
- UI/설정 상태: Zustand
- 로컬 영속성: SQLite
- 레거시 참조: Dexie/IndexedDB

주요 Zustand 스토어:

- `useGraphGenerationStore`: 그래프 생성 진행 상태 관리
- `useNotificationStore`: 알림 목록/읽음 상태/연결 상태 관리

## 보안 경계

- Renderer는 Node API에 직접 접근하지 않습니다.
- `contextBridge.exposeInMainWorld(...)`로 필요한 API만 노출합니다.
- 민감 로직은 Main Process에서 실행합니다.
  - OpenAI API 호출
  - keytar 접근
  - 파일 시스템 접근
  - SQLite 접근

## 핵심 설계 포인트

- 오프라인 우선 변경 기록: Outbox 패턴
- SQLite 중심 로컬 저장소 통합
- CLI와 데스크탑이 같은 저장소를 공유
- 동기화 재시도(backoff) + coalescing으로 서버 호출 수 절감
- SSE 알림 이벤트를 UI 상태와 연결해 장시간 작업 상태를 반영
