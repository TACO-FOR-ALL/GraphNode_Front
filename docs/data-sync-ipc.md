# Data Sync And IPC

## 로컬 DB 스키마

`src/db/graphnode.db.ts` 기준:

- `threads`: 채팅 스레드
- `notes`: 노트
- `folders`: 노트 폴더
- `outbox`: 서버로 보낼 작업 큐
- `trashedNotes`: 휴지통으로 이동한 노트
- `trashedThreads`: 휴지통으로 이동한 채팅
- `trashedFolders`: 휴지통으로 이동한 폴더

현재 스키마 버전은 `5`입니다.

## Outbox 패턴

쓰기 작업은 로컬 반영 후 `outbox`에 enqueue 됩니다.

- note: `create`, `update`, `move`, `delete`
- thread: `update`, `delete`
- folder: `create`, `update`, `delete`

`outboxRepo`는 중복 작업을 줄이기 위해 coalescing을 적용합니다.

- `note.delete`: 기존 pending note op 제거 후 delete만 유지
- `note.create`가 pending일 때 `note.update`/`note.move`를 create payload에 병합
- `note.update`, `note.move`, `thread.update`는 엔티티당 1개 pending op 유지
- `folder.delete`: 기존 pending folder op 제거 후 delete만 유지
- `folder.create`가 pending일 때 `folder.update`를 create payload에 병합
- `folder.update`는 엔티티당 1개 pending op 유지

## 동기화 루프

`src/managers/startSyncLoop.ts`:

- 앱 시작 시 `syncOnce()` 즉시 1회 실행
- 5초 주기로 온라인 상태에서 `syncOnce()` 실행
- `online` 이벤트 발생 시 즉시 동기화

`src/managers/syncWorker.ts`:

- 60초 이상 `processing` 상태인 작업은 `pending`으로 복구
- `[status+nextRetryAt]` 인덱스로 실행 대상 선별
- 성공 시 outbox 삭제
- 실패 시 exponential backoff (최대 60초 + jitter) 적용
- 폴더 생성 성공 후 서버가 다른 ID를 반환하면 로컬 `folders`, `notes.folderId`, 후속 `outbox` 참조를 한 트랜잭션에서 치환

## Pull 동기화

`src/managers/syncNoteWorker.ts`:

- 서버 노트를 가져와 로컬에 `bulkPut`
- 단, outbox에 `pending/processing` 중인 noteId는 덮어쓰지 않음
- 서버 시각 값은 `createdAt`, `updatedAt` 모두 number timestamp로 정규화

## 실시간 알림(SSE)과 그래프 생성 상태

`src/managers/notificationClient.ts`:

- `EventSource`로 `${VITE_API_BASE}/v1/notifications/stream` 구독
- 쿠키 인증(`withCredentials: true`)
- 연결 오류 시 지수 백오프 재연결(최대 5회)

`src/store/useNotificationStore.ts`:

- `GRAPH_GENERATION_REQUESTED` 수신 시 `useGraphGenerationStore.setGenerating(true)`
- `GRAPH_GENERATION_COMPLETED` / `GRAPH_GENERATION_FAILED` 수신 시 `setGenerating(false)`
- 일반 알림은 최대 50개 유지 + unread badge 업데이트
- 설정값에 따라 네이티브 알림과 알림음을 함께 처리

`src/components/visualize/EmptyGraph.tsx`:

- 생성 버튼 클릭 시 `api.graphAi.generateGraph()` 호출
- `isGenerating`이 true면 버튼 비활성화 및 진행 UI 표시
- 실패 케이스에서 로컬 상태를 false로 복구

## 휴지통 흐름

삭제는 즉시 hard delete 하지 않고 `trashRepo`를 통해 휴지통으로 이동합니다.

- 노트/채팅/폴더는 각각 `trashed*` 테이블에 백업본과 만료 시각을 저장
- 앱 시작 시 `trashRepo.cleanupExpiredItems()`가 만료된 항목을 정리
- 폴더 삭제 시 하위 폴더를 재귀적으로 휴지통으로 이동하고, 포함된 노트는 루트로 이동한 뒤 서버 소프트 삭제를 맞춥니다.

## IPC 표면

Main 등록 (`electron/main/ipc/index.ts`):

- `system:*`: locale, 외부 링크, 앱 설정, 재시작
- `window:*`: 창 최소화/최대화/종료
- `openai:*`: OpenAI 요청/키 검증/제목 생성
- `keytar:*`: API 키 및 사용자 정보 저장
- `file:*`: 대용량 파일 스트림 읽기(progress 이벤트 포함)
- `mcp:*`: MCP 서버 등록/연결/도구 실행
- `auth:*`: 로그인 상태 및 인증 관련 브리지

Preload 노출 (`electron/preload/bridges/*`):

- `window.systemAPI`
- `window.windowAPI`
- `window.openaiAPI`
- `window.keytarAPI`
- `window.fileAPI`
- `window.notification`
- `window.mcpAPI`
- `window.authAPI`

타입 정의는 `src/types/global.d.ts`에 선언되어 있습니다.

## 운영 체크포인트

- OpenAI 요청은 반드시 `openaiAPI`를 통해 호출
- Keytar 서비스명은 `graphnode`로 고정
- 서버 SDK 호출은 `src/apiClient.ts`의 `createGraphNodeClient()` 인스턴스를 통해 일관되게 사용
- 새 IPC 추가 시:
1. `electron/main/ipc/*` 핸들러 작성
2. `electron/preload/bridges/*` 노출
3. `src/types/global.d.ts` 타입 선언 추가
