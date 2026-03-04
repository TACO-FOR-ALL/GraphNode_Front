# Testing Strategy

## 목적

- 핵심 로컬 데이터 로직(Repository, Outbox coalescing)의 회귀를 빠르게 검출
- 파싱/유틸 로직의 입력 변형 케이스를 안정적으로 보장
- UI E2E 대신 도메인 로직 단위 테스트에 집중

## 테스트 실행

```bash
npm test
```

Jest 설정 파일:

- `jest.config.ts`
- `jest.setup.ts`

## 현재 테스트 범위

Repository / 데이터 계층:

- `src/managers/__test__/noteRepo.test.ts`
- `src/managers/__test__/folderRepo.test.ts`
- `src/managers/__test__/threadRepo.test.ts`
- `src/managers/__test__/outboxRepo.test.ts`

스토어 계층:

- `src/store/__test__/useNotificationStore.test.ts`

유틸 계층:

- `src/utils/__test__/parseConversations.test.ts`
- `src/utils/__test__/toMarkdown.test.ts`
- `src/utils/__test__/buildFolderTree.test.ts`
- `src/utils/__test__/extractTitleFromMarkdown.test.ts`
- `src/utils/__test__/sortItemByDate.test.ts`
- `src/utils/__test__/uuid.test.ts`

## 우선순위 기준

1. 데이터 무결성 영향이 큰 코드(삭제, 이동, 동기화)
2. 외부 입력 파싱 코드(JSON/대화 내보내기/markdown 변환)
3. 동시성/재시도 로직(Outbox, sync worker)
4. UI 렌더링 상세보다 상태 전이 규칙

## 테스트 작성 가이드

- Arrange-Act-Assert 구조를 유지합니다.
- 테스트명은 행동과 기대 결과를 함께 적습니다.
- 시간 의존 로직은 `Date.now` mock으로 고정합니다.
- Repository 테스트는 Dexie 상태를 각 테스트마다 초기화합니다.
- Outbox 테스트는 coalescing 규칙을 명시적으로 검증합니다.

## 권장 보강 영역

- `syncWorker` 재시도/복구 로직 단위 테스트
- `notificationClient` 재연결(backoff) 시나리오 테스트
- `useGraphGenerationStore` persist 복원 시나리오 테스트
