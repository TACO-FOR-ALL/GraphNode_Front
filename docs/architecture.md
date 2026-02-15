# Architecture

## 런타임 구조

GraphNode Front는 Electron 3계층 구조를 사용합니다.

1. Main Process (`electron/main`)
2. Preload (`electron/preload`)
3. Renderer (`src`)

Main은 OS 자원 접근과 IPC 핸들러를 담당하고, Renderer는 UI/상태/로컬DB를 담당합니다.

## 앱 부팅 순서

1. Electron app 시작
2. `electron/main/main.ts`에서 하드웨어 가속 설정 로드
3. 스플래시 창 생성 후 렌더러 URL 확인
- 개발 모드: `VITE_DEV_SERVER_URL`
- 패키지 모드: `https://graphnode.site/app`
4. Renderer `src/main.tsx`에서:
- `startSyncLoop()` 시작
- i18n 초기화
- `QueryClientProvider` + `App` 렌더

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
- UI/설정 상태: Zustand (`src/store/*`)
- 로컬 데이터 영속성: Dexie (`threads`, `notes`, `folders`, `outbox`)

## 보안 경계

- Renderer는 Node API에 직접 접근하지 않습니다.
- `contextBridge.exposeInMainWorld(...)`로 필요한 API만 노출합니다.
- 민감 로직은 Main Process에서 실행합니다.
  - 예: OpenAI API 호출, keytar 접근, 파일 스트리밍

## 핵심 설계 포인트

- 오프라인 우선 변경 기록: Outbox 패턴
- DB 트랜잭션 기반 원자성 보장 (`db.transaction`)
- 동기화 재시도(backoff) + coalescing으로 API 호출 수 절감
