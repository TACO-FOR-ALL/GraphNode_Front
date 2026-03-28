# 기능 맵

이 문서는 GraphNode Front의 화면 진입점과 핵심 모듈 책임을 빠르게 파악하기 위한 요약 문서입니다.

## 주요 라우트

- `/login`: 로그인 및 계정 진입 화면
- `/`: 홈 화면. 최근 노트와 빠른 입력 진입점 제공
- `/chat/:threadId?`: 채팅 스레드 조회 및 새 대화 시작
- `/note/:noteId?`: 마크다운 노트 편집
- `/visualize`: 그래프 생성 및 시각화
- `/microscope`: 생성된 microscope 워크스페이스 조회
- `/microscope/:nodeId`: 대화 노드 기준 microscope 분석 요청 또는 결과 조회
- `/graph-lab`: 실험용 그래프 렌더링 페이지
- `/settings`: 계정, 알림, 언어, MCP, Data Privacy 등 설정 패널

## 앱 부팅 시 수행되는 핵심 작업

`src/main.tsx`

- `startSyncLoop()`로 outbox 동기화 루프 시작
- `initI18n()` 완료 후 React 앱 렌더링
- `src/queryClient.ts`의 공용 React Query `QueryClient` 주입

`src/App.tsx`

- 사용자 설정 로드 및 그래프 색상 적용
- 언어 설정을 서버 선호 언어와 동기화
- changelog 기준 임베딩 모델 버전 확인 및 필요 시 다운로드
- 기존 스레드 임베딩 초기 마이그레이션 실행
- 임베딩 상태 이벤트를 구독해 전역 store에 반영
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
- `electron/main/embedding/embeddingService.ts`: 채팅 Q&A pair 임베딩 생성과 유사도 검색

### 그래프 시각화

- `src/routes/Visualize.tsx`: 시각화 메인 화면
- `src/routes/MicroscopePage.tsx`: microscope 워크스페이스 브라우징 및 분석 요청 화면
- `src/routes/GraphTestPage.tsx`: 실험용 그래프 렌더링 테스트 페이지
- `src/components/visualize/Graph2D.tsx`, `src/components/visualize/Graph3D.tsx`: 그래프 렌더링
- `src/components/microscope/MicroScopeVisualization.tsx`: microscope 그래프 렌더링 및 컨텍스트 노드 선택
- `src/store/useGraphGenerationStore.ts`: 그래프 생성 진행 상태
- `src/store/useMicroscopeGenerationStore.ts`: microscope 분석 진행 상태

### 설정 및 외부 연동

- `src/routes/Settings.tsx`: 설정 카테고리 엔트리
- `src/components/settings/MCPPanel.tsx`: MCP 서버 관리
- `src/components/settings/ApiKeyManager.tsx`: API 키 관리
- `src/components/settings/DataPrivacyPanel.tsx`: import/export, CLI 설치, 데이터 삭제
- `src/components/settings/DeveloperToolsPanel.tsx`: 강제 sync, 그래프 디버그, 임베딩 상태/샘플 확인
- `electron/main/mcp/*`: 내장/커스텀 MCP 서버 런타임

## 상태와 데이터 흐름

- UI/환경설정 상태: `src/store/*`의 Zustand 스토어
- 서버 캐시: React Query
- 공용 React Query 인스턴스: `src/queryClient.ts`
- 로컬 영속성(활성): SQLite
- 로컬 semantic retrieval: `embedding_queue`, `chat_embeddings`
- 로컬 영속성(레거시): `src/legacy/indexeddb/graphnode.db.ts`
- 동기화: `src/managers/outboxRepo.ts`, `src/managers/syncWorker.ts`, `src/managers/pullWorker.ts`
- 실시간 알림: `src/managers/notificationClient.ts`, `src/store/useNotificationStore.ts`
- 시각화-에이전트 연계: `src/store/useAgentToolBoxStore.ts`, `src/components/layout/AiAgentChatBox.tsx`
- 임베딩 상태 표시: `src/store/useEmbeddingStatusStore.ts`, `src/components/sidebar/SideNavigationBar.tsx`

## 처음 읽어볼 파일 추천

1. `src/App.tsx`
2. `src/routes/Home.tsx`
3. `src/managers/noteRepo.ts`
4. `src/managers/outboxRepo.ts`
5. `docs/architecture.md`
6. `docs/data-sync-ipc.md`
7. `docs/microscope-agent-flow.md`
8. `docs/embedding-runtime.md`
