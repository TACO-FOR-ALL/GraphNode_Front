# Feature Map

이 문서는 GraphNode Front의 화면 진입점과 핵심 모듈 책임을 빠르게 파악하기 위한 요약 문서입니다.

## 주요 라우트

- `/login`: 로그인 및 계정 진입 화면
- `/`: 홈 화면. 최근 노트와 빠른 입력 진입점 제공
- `/chat/:threadId?`: 채팅 스레드 조회 및 새 대화 시작
- `/note/:noteId?`: 마크다운 노트 편집
- `/visualize`: 그래프 생성 및 시각화
- `/visualize/:nodeId`: 특정 노드 상세 그래프 조회
- `/settings`: 계정, 알림, 언어, MCP 등 설정 패널

## 앱 부팅 시 수행되는 핵심 작업

`src/main.tsx`

- `startSyncLoop()`로 outbox 동기화 루프 시작
- `initI18n()` 완료 후 React 앱 렌더링
- React Query 전역 `QueryClient` 주입

`src/App.tsx`

- 사용자 설정 로드 및 그래프 색상 적용
- 언어 설정을 서버 선호 언어와 동기화
- 최초 실행 시 기본 노트 생성
- 서버 최신 데이터 1회 pull 수행
- SSE 알림 연결, 온보딩, 변경로그 모달, 전역 단축키 초기화

## 핵심 도메인 모듈

### 노트

- `src/routes/Note.tsx`: 노트 화면 진입점
- `src/managers/noteRepo.ts`: 노트 생성/수정/이동/삭제와 outbox enqueue
- `src/components/notes/MarkdownEditor.tsx`: Tiptap 기반 편집기

### 채팅

- `src/routes/Chat.tsx`: 채팅 화면 레이아웃
- `src/components/ChatWindow.tsx`: 메시지 목록 및 스레드 표시
- `src/components/chat/ChatSendBox.tsx`: 메시지 입력과 전송
- `src/managers/threadRepo.ts`: 로컬 스레드 CRUD

### 그래프 시각화

- `src/routes/Visualize.tsx`: 시각화 메인 화면
- `src/routes/VisualizeDetail.tsx`: 노드 상세 화면
- `src/components/visualize/Graph2D.tsx`, `src/components/visualize/Graph3D.tsx`: 그래프 렌더링
- `src/store/useGraphGenerationStore.ts`: 그래프 생성 진행 상태

### 설정 및 외부 연동

- `src/routes/Settings.tsx`: 설정 카테고리 엔트리
- `src/components/settings/MCPPanel.tsx`: MCP 서버 관리
- `src/components/settings/ApiKeyManager.tsx`: OpenAI 등 API 키 관리
- `electron/main/mcp/*`: 내장/커스텀 MCP 서버 런타임

## 상태와 데이터 흐름

- UI/환경설정 상태: `src/store/*`의 Zustand 스토어
- 서버 캐시: React Query
- 로컬 영속성: `src/db/graphnode.db.ts`의 Dexie 스키마
- 동기화: `src/managers/outboxRepo.ts`, `src/managers/syncWorker.ts`, `src/managers/syncNoteWorker.ts`
- 실시간 알림: `src/managers/notificationClient.ts`, `src/store/useNotificationStore.ts`

## 처음 읽어볼 파일 추천

1. `src/App.tsx`
2. `src/routes/Home.tsx`
3. `src/managers/noteRepo.ts`
4. `src/managers/outboxRepo.ts`
5. `docs/architecture.md`
6. `docs/data-sync-ipc.md`
