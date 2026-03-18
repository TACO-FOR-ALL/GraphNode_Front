# SQLite + 벡터 확장 전환 계획

이 문서는 현재 적용된 기본 스키마 설명이 아니라, 추후 임베딩/유사도 검색 기능을
도입할 때의 확장 방향을 정리한 계획 문서입니다.

현재 기본 SQLite 스키마에는 `note_chunks`, `embeddings`, `embedding_jobs` 테이블이
포함되어 있지 않습니다.

## 왜 저장소를 바꾸는가

기존 노트 DB는 renderer 안의 Dexie/IndexedDB에 있었고, 이는 Electron UI에는 편리했지만 일반 Node CLI가 같은 source of truth를 읽고 쓰는 것을 막았습니다.

목표 아키텍처:

1. SQLite가 notes, folders, threads, outbox의 기본 로컬 DB가 된다.
2. 임베딩은 기본 데이터 옆에 붙는 보조 계층이지, 기본 저장소를 대체하지 않는다.
3. Electron 앱과 CLI가 같은 저장소 계층을 바라본다.

## 전환 정책

- 기존 IndexedDB 데이터는 레거시 데이터로 취급
- 강제 1회성 로컬 IndexedDB 마이그레이션은 필수가 아님
- 전환 중에는 startup sync가 SQLite를 자연스럽게 채우도록 사용 가능
- SQLite parity가 확인되기 전까지 IndexedDB는 레거시 fallback/참고 경로로 남길 수 있음

## 권장 아키텍처

### 기본 데이터베이스

- SQLite 파일 위치:
  - macOS: `~/Library/Application Support/GraphNode/graphnode.db`
  - fallback/dev: `~/.graphnode/graphnode.db`
- source of truth:
  - `notes`
  - `folders`
  - `threads`
  - `outbox_ops`

### 시맨틱 검색 계층

- 노트 내용을 `note_chunks`로 분할
- embedding vector는 `embeddings`에 저장
- 백그라운드 작업 상태는 `embedding_jobs`에 저장

이 구조는 CRUD와 sync를 안정적으로 유지하면서도 로컬 semantic search를 가능하게 합니다.

## 왜 순수 벡터 DB를 메인 저장소로 쓰지 않는가

벡터 DB는 nearest-neighbor retrieval에는 강하지만, 앱 전체 저장소 역할로는 한계가 있습니다.

- 폴더 계층 구조
- sync queue
- trash/delete lifecycle
- 정확한 CRUD와 migration
- deterministic ordering/filtering

GraphNode에는 다음 조합이 더 적합합니다.

- SQLite: canonical app data
- Vector index/search: retrieval

## 마이그레이션 단계

### 1단계: 저장소 추상화

- direct Dexie 접근을 storage adapter 뒤로 숨김
- 현재 앱 동작은 유지
- `SQLiteStorageAdapter`를 추가하되 아직 전면 활성화하지 않음

상태:

- `DexieNoteStorageAdapter`는 `src/legacy/indexeddb/dexieNoteStorage.ts`에 남아 있음
- 노트 저장의 활성 경로는 renderer IPC adapter인 `src/managers/storage/adapters/sqlite/sqliteRendererNoteStorage.ts`를 사용함
- `noteRepo`는 이제 Dexie 직접 의존 대신 adapter contract를 따름

### 2단계: dual-write 또는 import

- 오프라인 전용 레거시 사용자가 정말 필요한 경우에만 고려
- 기본 전략은 startup sync로 SQLite bootstrap
- 서버 상태와 count, last updated timestamp를 비교 검증

### 3단계: read switch

- desktop read path를 SQLite-backed repository로 전환
- Dexie는 rollback/debug 용으로만 남김

### 4단계: vector 기능 추가

- note chunking 추가
- embedding 생성 작업 추가
- vector search/related notes/RAG 흐름 추가
