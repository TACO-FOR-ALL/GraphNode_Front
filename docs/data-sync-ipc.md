# Data Sync And IPC

## 로컬 DB 스키마

`src/db/graphnode.db.ts` 기준:

- `threads`: 채팅 스레드
- `notes`: 노트
- `folders`: 노트 폴더
- `outbox`: 서버로 보낼 작업 큐

현재 스키마 버전은 `3`입니다.

## Outbox 패턴

쓰기 작업은 로컬 반영 후 `outbox`에 enqueue 됩니다.

- note: `create`, `update`, `move`, `delete`
- thread: `update`, `delete`

`outboxRepo`는 중복 작업을 줄이기 위해 coalescing을 적용합니다.

- `note.delete`: 기존 pending note op 제거 후 delete만 유지
- `note.create`가 pending일 때 `note.update`/`note.move`를 create payload에 병합
- `note.update`, `note.move`, `thread.update`는 엔티티당 1개 pending op 유지

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

## Pull 동기화

`src/managers/syncNoteWorker.ts`:

- 서버 노트를 가져와 로컬에 `bulkPut`
- 단, outbox에 `pending/processing` 중인 noteId는 덮어쓰지 않음

## IPC 표면

Main 등록 (`electron/main/ipc/index.ts`):

- `system:*`: locale, 외부 링크, 앱 설정, 재시작
- `window:*`: 창 최소화/최대화/종료
- `openai:*`: OpenAI 요청/키 검증/제목 생성
- `keytar:*`: API 키 및 사용자 정보 저장
- `file:*`: 대용량 파일 스트림 읽기(progress 이벤트 포함)

Preload 노출 (`electron/preload/bridges/*`):

- `window.systemAPI`
- `window.windowAPI`
- `window.openaiAPI`
- `window.keytarAPI`
- `window.fileAPI`
- `window.notification`

타입 정의는 `src/types/global.d.ts`에 선언되어 있습니다.

## 운영 체크포인트

- OpenAI 요청은 반드시 `openaiAPI`를 통해 호출
- Keytar 서비스명은 `graphnode`로 고정
- 새 IPC 추가 시:
1. `electron/main/ipc/*` 핸들러 작성
2. `electron/preload/bridges/*` 노출
3. `src/types/global.d.ts` 타입 선언 추가
