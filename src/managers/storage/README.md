# Storage 구조

`src/managers/storage`는 repository가 의존하는 저장소 계층을 역할별로 나눈 디렉토리입니다.

- `contracts/`
  - note / folder / thread 저장소 인터페이스와 입력 타입을 정의합니다.
- `adapters/sqlite/`
  - 현재 활성 SQLite 구현체를 둡니다.
- `selectors/`
  - repository가 어떤 저장소 구현을 사용할지 선택하는 로직을 둡니다.

레거시 Dexie 구현은 이 디렉토리가 아니라 다음 경로에 보관합니다.

- `src/legacy/indexeddb/`
