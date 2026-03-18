# 레거시 Dexie 제거 계획

## 결정

Dexie는 즉시 삭제하기보다, 레거시로 격리한 뒤 최종적으로 제거하는 것이 안전합니다.

권장 경로:

1. Dexie/IndexedDB를 레거시로 취급
2. active runtime path에서 사용 중단
3. SQLite parity가 확인된 뒤 최종 제거

## 지금 바로 삭제하지 않는 이유

현재 남은 Dexie 의존성은 대부분 아래 범위에 한정됩니다.

- 레거시 DB 정의
- 롤백 대비용 Dexie storage adapter
- Dexie 형태를 mock하는 repository 테스트

이들을 너무 빨리 삭제하면:

- 롤백이 어려워지고
- SQLite에서 아직 충분히 밟히지 않은 edge flow가 깨질 가능성이 높아집니다.

## 현재 레거시 표면

### 레거시 런타임 후보

- `/Users/johnhan/Development/GraphNode_Front/src/legacy/indexeddb/graphnode.db.ts`

### Dexie adapter

- `/Users/johnhan/Development/GraphNode_Front/src/legacy/indexeddb/dexieNoteStorage.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/legacy/indexeddb/dexieFolderStorage.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/legacy/indexeddb/dexieThreadStorage.ts`

### Dexie 형태 mock 테스트

- `/Users/johnhan/Development/GraphNode_Front/src/managers/__test__/noteRepo.test.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/managers/__test__/folderRepo.test.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/managers/__test__/threadRepo.test.ts`
- `/Users/johnhan/Development/GraphNode_Front/src/managers/__test__/outboxRepo.test.ts`

## 권장 은퇴 단계

### 1단계: 레거시 표시

- `src/legacy/indexeddb/README.md` 유지
- Dexie 관련 파일 인벤토리 문서화
- 새 direct Dexie 접근 금지

### 2단계: 활성 사용 축소

- repository read/write를 SQLite-backed adapter로 이동
- outbox/trash를 SQLite IPC로 이동
- startup sync를 SQLite 기준으로 유지
- `src/legacy/indexeddb/graphnode.db.ts` 직접 import 금지

### 3단계: 레거시 코드 고립

활성 import가 충분히 줄어들면 아래 항목을 `src/legacy/indexeddb/` 아래로만 제한합니다.

- `graphnode.db.ts`
- Dexie storage adapter
- 롤백용 임시 shim/bridge

이 시점엔 active runtime path가 기본적으로 이 코드에 의존하지 않아야 합니다.

### 4단계: 최종 제거

아래 조건이 모두 만족되면 삭제합니다.

- startup sync가 안정적으로 SQLite를 채움
- note/folder/thread CRUD가 Dexie 없이 동작
- outbox/trash flow가 Dexie 없이 동작
- search/sidebar/editor가 SQLite-backed repo를 사용
- CLI와 desktop이 같은 SQLite note set을 읽음
- 회귀 검증이 안정적임
