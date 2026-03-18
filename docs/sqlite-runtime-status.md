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

## 다음 정리 후보

1. 남은 레거시 Dexie 파일 정리
2. Dexie 기반 테스트 제거 또는 SQLite 기준 재작성
3. 롤백 필요성이 사라진 뒤 `package.json`에서 `dexie` 제거
