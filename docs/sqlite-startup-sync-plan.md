# SQLite Startup Sync 계획

## 목표

기존 IndexedDB 데이터를 로컬에서 직접 마이그레이션하는 대신, 앱 시작 시 서버 동기화 결과를 이용해 SQLite를 채우는 것이 목표입니다.

## 이 경로를 선택한 이유

- IndexedDB -> SQLite 로컬 마이그레이션 로직이 불안정해질 수 있음
- 서버를 source of truth로 유지할 수 있음
- `src/App.tsx`의 기존 `pullOnce()` 흐름과 잘 맞음
- CLI/shared storage rollout과도 자연스럽게 연결됨

## 기존 동작

- `src/App.tsx`는 앱 시작 시 `pullOnce()`를 호출
- `src/managers/pullWorker.ts`는 pull 결과를 로컬 저장소에 반영

## 목표 동작

- `src/App.tsx`는 계속 startup pull을 수행
- pull 결과를 SQLite에도 기록
- SQLite는 자체 bootstrap 상태와 sync cursor를 관리
- IndexedDB는 전환 중 레거시 참조 경로로만 유지

## 권장 rollout

### 1단계

기존 startup pull 흐름은 유지하고, SQLite bootstrap metadata를 추가합니다.

관련 key:

- `sqlite.sync.cursor`
- `sqlite.bootstrap.state`
- `sqlite.compat.migration.version`

정의 위치:

- `packages/storage/src/sync-bootstrap.ts`
- `packages/storage/src/sqlite-migrations.ts`

설명:

- `sqlite.sync.cursor`
  - 마지막으로 서버와 맞춰진 sync 기준 시점
- `sqlite.bootstrap.state`
  - 현재 SQLite가 startup sync를 마쳐 사용 가능한 상태인지 표시
- `sqlite.compat.migration.version`
  - 과거 로컬 DB 구조를 현재 런타임 기준으로 정리했는지 표시하는 version key

### 2단계

기존 pull worker 동작을 SQLite에도 mirror하는 sync writer를 추가합니다.

대상:

- notes
- folders
- conversations/threads

현재 상태:

- renderer `pullOnce()`는 startup pull payload를 `window.graphnodeAPI.applyStartupSync(...)`로 전달
- main process는 이 payload를 받아 SQLite에 기록
- bootstrap metadata와 server cursor는 `app_meta`에 저장

### 3단계

성공적인 startup pull 이후:

- SQLite를 bootstrapped 상태로 표시
- 최신 server cursor를 SQLite metadata에 저장

### 4단계

SQLite parity가 확인되면:

- desktop read path를 Dexie에서 SQLite-backed repository로 전환
- IndexedDB는 transition 동안 rollback/debug 용도로만 유지

## 중요한 제약

이 계획은 계정의 canonical note set이 서버에 존재한다는 가정을 둡니다.

만약 IndexedDB에만 존재하는 진짜 로컬 전용 노트가 있다면, Dexie를 완전히 제거하기 전에 별도 export/import 경로가 필요합니다.
