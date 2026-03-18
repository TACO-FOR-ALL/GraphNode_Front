# 데이터 동기화와 IPC

## 현재 런타임 모델

GraphNode의 현재 활성 로컬 런타임 저장소는 `SQLite`입니다.

핵심 코드 경로:

- Renderer repo 계층
  - `/Users/johnhan/Development/GraphNode_Front/src/managers/noteRepo.ts`
  - `/Users/johnhan/Development/GraphNode_Front/src/managers/folderRepo.ts`
  - `/Users/johnhan/Development/GraphNode_Front/src/managers/threadRepo.ts`
  - `/Users/johnhan/Development/GraphNode_Front/src/managers/outboxRepo.ts`
  - `/Users/johnhan/Development/GraphNode_Front/src/managers/trashRepo.ts`
- Electron main SQLite 처리
  - `/Users/johnhan/Development/GraphNode_Front/electron/main/sqlite`
- IPC 등록
  - `/Users/johnhan/Development/GraphNode_Front/electron/main/ipc/graphnode.ts`
- Preload bridge
  - `/Users/johnhan/Development/GraphNode_Front/electron/preload/bridges/graphnodeBridge.ts`

기존 Dexie 코드는 아래로 이동했습니다.

- `/Users/johnhan/Development/GraphNode_Front/src/legacy/indexeddb`

즉, Dexie/IndexedDB는 현재 active runtime path가 아닙니다.

## SQLite 스키마 영역

SQLite 스키마 정의 위치:

- `/Users/johnhan/Development/GraphNode_Front/packages/storage/src/sqlite-schema.js`

현재 동기화/런타임에서 사용하는 주요 테이블:

- `notes`
- `folders`
- `threads`
- `outbox_ops`
- `trash_notes`
- `trash_threads`
- `trash_folders`
- `app_meta`

현재 기본 SQLite 스키마에는 임베딩/벡터 검색용 테이블을 포함하지 않습니다.
관련 구조는 실제 요구사항이 정리된 뒤 별도 migration으로 추가할 예정입니다.

## Pull 동기화 흐름

Pull sync 진입점:

- `/Users/johnhan/Development/GraphNode_Front/src/managers/pullWorker.ts`

현재 동작 순서:

1. `localStorage`에서 마지막 커서(`graphnode_syncronization`)를 읽음
2. `api.sync.pull(since)` 호출
3. 서버 DTO를 다음 mapper로 정규화
   - `mapNote`
   - `mapFolder`
   - `mapConversation`
4. notes/folders/threads 각각에 대해
   - pending 또는 processing outbox op가 걸린 엔티티는 덮어쓰지 않음
   - 활성 엔티티는 local repo에 upsert
   - soft delete된 엔티티는 local repo에서 삭제
5. 새 `serverTime`을 커서로 저장
6. 같은 payload를 `window.graphnodeAPI.applyStartupSync(...)`로 SQLite bootstrap sync에도 반영

핵심 포인트:

- startup sync payload는 notes, folders, threads, bootstrap meta, cursor meta를 SQLite에 함께 기록합니다.

## SQLite startup bootstrap

메인 처리 위치:

- `/Users/johnhan/Development/GraphNode_Front/electron/main/sqlite/startupSync.ts`

이 레이어의 책임:

- notes/folders/threads bulk upsert/delete
- SQLite bootstrap 상태 저장
- SQLite sync cursor 저장
- renderer/CLI에서 읽을 SQLite entity 조회

bootstrap meta key 정의:

- `/Users/johnhan/Development/GraphNode_Front/packages/storage/src/sync-bootstrap.js`

## Push sync / outbox loop

동기화 루프 진입점:

- `/Users/johnhan/Development/GraphNode_Front/src/managers/startSyncLoop.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/managers/syncWorker.ts`

현재 동작:

- 앱 시작 시 `syncOnce()` 즉시 실행
- 온라인 상태에서 주기적으로 재실행
- 오래된 `processing` 작업을 다시 `pending`으로 복구
- SQLite outbox에서 실행 가능한 작업을 읽음
- 서버 mutation 전송
- 성공한 작업은 outbox에서 삭제
- 실패한 작업은 exponential backoff + jitter로 재시도

폴더 생성 특이사항:

- `folder.create` 이후 서버가 다른 ID를 반환하면, 로컬 SQLite의 folder, 해당 folder를 참조하는 note, 이후 outbox 참조를 모두 서버 ID 기준으로 치환합니다.

## Outbox 모델

Outbox는 SQLite에 저장되며 아래 계층을 통해 다뤄집니다.

- `/Users/johnhan/Development/GraphNode_Front/electron/main/sqlite/outbox.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/managers/outboxRepo.ts`

대상 엔티티:

- note
- folder
- thread

주요 op type:

- `note.create`
- `note.update`
- `note.move`
- `note.delete`
- `folder.create`
- `folder.update`
- `folder.delete`
- `thread.update`
- `thread.delete`

## 휴지통 모델

휴지통 처리 역시 SQLite 기반입니다.

- `/Users/johnhan/Development/GraphNode_Front/electron/main/sqlite/trash.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/managers/trashRepo.ts`

현재 동작:

- 삭제 시 즉시 hard delete하지 않고 trash로 이동
- notes, threads, folders를 각각 별도 관리
- 만료된 trash는 cleanup에서 정리
- Data Privacy 동작에서 명시적으로 비울 수 있음

## Data Privacy 관련 동작

Settings UI:

- `/Users/johnhan/Development/GraphNode_Front/src/components/settings/DataPrivacyPanel.tsx`

현재 SQLite 기준으로 연결된 기능:

- 전체 채팅 삭제
- 전체 노트 삭제
- 전체 노트 markdown export
- 전체 채팅 `conversations.json` export
- macOS/Windows 현재 사용자용 CLI 설치

관련 main-process 모듈:

- `/Users/johnhan/Development/GraphNode_Front/electron/main/sqlite/exportData.ts`
- `/Users/johnhan/Development/GraphNode_Front/electron/main/cli/installCli.ts`

## IPC 표면

IPC 등록 위치:

- `/Users/johnhan/Development/GraphNode_Front/electron/main/ipc/index.ts`
- `/Users/johnhan/Development/GraphNode_Front/electron/main/ipc/graphnode.ts`

Preload 노출 위치:

- `/Users/johnhan/Development/GraphNode_Front/electron/preload/bridges/index.ts`
- `/Users/johnhan/Development/GraphNode_Front/electron/preload/bridges/graphnodeBridge.ts`

타입 선언 위치:

- `/Users/johnhan/Development/GraphNode_Front/src/types/global.d.ts`

현재 `graphnode:*` IPC 범위:

- SQLite notes/folders/threads read/write
- SQLite outbox 관리
- SQLite trash 관리
- startup sync apply/bootstrap status
- 데이터 export
- CLI install/status

## 운영 체크리스트

동기화/SQLite 동작을 추가하거나 수정할 때는 아래 순서를 같이 맞춰야 합니다.

1. `electron/main/sqlite` 또는 `electron/main/cli`에 메인 처리 추가
2. `electron/main/ipc/graphnode.ts`에 IPC 등록
3. `electron/preload/bridges/graphnodeBridge.ts`에 preload bridge 노출
4. `src/types/global.d.ts`에 renderer 타입 추가
5. 런타임 모델이 바뀌었다면 이 문서도 갱신

## 관련 문서

- `/Users/johnhan/Development/GraphNode_Front/docs/sqlite-runtime-status.md`
- `/Users/johnhan/Development/GraphNode_Front/docs/sqlite-startup-sync-plan.md`
- `/Users/johnhan/Development/GraphNode_Front/docs/legacy-dexie-removal-plan.md`
