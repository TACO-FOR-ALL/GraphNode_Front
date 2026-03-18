# SQLite 런타임 상태

## 요약

현재 데스크탑 앱의 active runtime path는 SQLite-backed IPC를 사용합니다.

적용 범위:

- notes
- folders
- threads
- outbox
- trash

CLI도 같은 SQLite DB를 읽고 씁니다.

## SQLite 호환 마이그레이션

현재 SQLite를 열 때 `app_meta`에 저장된 compatibility migration version을 확인합니다.

- key: `sqlite.compat.migration.version`
- 구현 위치:
  - `/Users/johnhan/Development/GraphNode_Front/packages/storage/src/sqlite-migrations.ts`

현재 version은 `1`이며, 다음 항목을 1회성으로 정리합니다.

- 과거 임베딩 실험 테이블
  - `note_chunks`
  - `embeddings`
  - `embedding_jobs`
- 관련 인덱스
- migration 적용 결과는 `app_meta`에 기록되며, 같은 버전이면 다시 실행하지 않습니다.

이미 version이 최신이면 migration은 다시 실행되지 않습니다.

## 남아 있는 Dexie 사용

Dexie는 더 이상 active runtime path의 일부가 아닙니다.

남은 참조는 레거시 또는 유지보수 표면에 한정됩니다.

- `/Users/johnhan/Development/GraphNode_Front/src/legacy/indexeddb/graphnode.db.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/legacy/indexeddb/dexieNoteStorage.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/legacy/indexeddb/dexieFolderStorage.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/legacy/indexeddb/dexieThreadStorage.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/managers/__test__/` 아래 Dexie 기반 테스트
- `/Users/johnhan/Development/GraphNode_Front/package.json`의 `dexie` 의존성

## 확인된 항목

- repository selector가 기본적으로 SQLite adapter를 반환
- outbox coalescing이 `window.graphnodeAPI`를 통해 동작
- trash 동작이 SQLite IPC를 통해 동작
- 현재 SQLite runtime path 기준으로 build 통과
- 실제 로컬 DB에서 예전 임베딩 실험 테이블이 제거됨

## 다음 정리 후보

1. 남은 레거시 Dexie 파일 정리
2. Dexie 기반 테스트 제거 또는 SQLite 기준 재작성
3. 롤백 필요성이 사라진 뒤 `package.json`에서 `dexie` 제거
