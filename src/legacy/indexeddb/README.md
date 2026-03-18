# 레거시 IndexedDB / Dexie

이 디렉토리는 과거에 renderer 로컬 저장소로 사용하던
`Dexie + IndexedDB` 경로를 보관하는 레거시 영역입니다.

현재 런타임의 기본 저장소는 `SQLite`이지만, 전환 검증과 롤백 가능성을
고려해 일부 Dexie 관련 코드를 완전히 삭제하지 않고 이 위치에 정리해두고 있습니다.

이 디렉토리는 단계적 제거 작업의 기준점으로 사용합니다.

1. 기본 런타임 저장소는 계속 `SQLite`를 사용합니다.
2. `Dexie`는 검증 기간 동안에만 롤백용 레거시 코드로 유지합니다.
3. 남아 있는 직접 `Dexie` 의존을 줄여서 이 경로로 완전히 격리합니다.
4. 기능 동등성이 충분히 확인되면 레거시 경로를 최종 삭제합니다.

## 현재 레거시 후보

- `src/legacy/indexeddb/graphnode.db.ts`
- `src/legacy/indexeddb/dexieNoteStorage.ts`
- `src/legacy/indexeddb/dexieFolderStorage.ts`
- `src/legacy/indexeddb/dexieThreadStorage.ts`
- `src/managers/__test__/*` 아래의 Dexie 기반 저장소 테스트

## 최종 삭제 전 확인 기준

- notes / folders / threads 읽기가 모든 경로에서 기본적으로 SQLite를 사용한다
- outbox / trash가 SQLite 기반 IPC를 통해 동작한다
- 여러 차례 앱 실행 이후에도 쓰기 흐름이 안정적이다
- startup sync가 SQLite를 안정적으로 채운다
- CLI와 데스크탑 앱이 동일한 기준 노트 집합을 보여준다
- IndexedDB를 제거해도 될 만큼 롤백 필요성이 충분히 낮다
