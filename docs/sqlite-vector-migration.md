# SQLite + 벡터 계층 상태

이 문서는 초기 계획 문서에서 갱신된 버전입니다.
현재 GraphNode는 SQLite 본체 위에 로컬 임베딩 계층을 실제 런타임으로 포함합니다.

현재 기본 SQLite 스키마에는 아래 임베딩 관련 테이블이 포함됩니다.

- `embedding_queue`
- `chat_embeddings`

반면 과거 실험 단계의 아래 테이블은 현행 스키마가 아니며, compatibility migration 정리 대상입니다.

- `note_chunks`
- `embeddings`
- `embedding_jobs`

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

### 현재 임베딩 계층

- 채팅 메시지에서 Q&A pair를 추출
- 작업 큐는 `embedding_queue`
- 실제 벡터 저장은 `chat_embeddings`
- 생성/검색 서비스는 Electron main의 `embeddingService`

현재 구조는 CRUD와 sync를 안정적으로 유지하면서도 로컬 semantic search를 가능하게 합니다.

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

### 현재까지 완료된 단계

- SQLite가 notes/folders/threads/outbox의 기본 저장소가 됨
- 채팅 스레드 기반 임베딩 큐/저장 테이블이 런타임에 포함됨
- 메인 프로세스에서 모델 로드, 배치 추론, 유사도 검색, 초기 마이그레이션을 처리함

### 남은 확장 후보

- note chunking 기반 임베딩 계층 추가
- note/graph 문맥을 섞은 retrieval 설계
- richer ranking / RAG 흐름 추가
