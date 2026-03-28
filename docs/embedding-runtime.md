# Embedding Runtime

이 문서는 현재 GraphNode Front의 로컬 임베딩 런타임을 설명합니다.

## 목적

임베딩 계층은 채팅 스레드의 Q&A 문맥을 로컬에서 벡터화해,
semantic retrieval과 유사도 검색에 활용하기 위한 보조 저장 계층입니다.

기본 데이터의 source of truth는 여전히 SQLite의 notes/folders/threads/outbox입니다.

## 핵심 구성 요소

### 메인 프로세스

- `electron/main/embedding/embeddingService.ts`
  - 모델 로드
  - Q&A pair 추출
  - 큐 처리
  - 상태 push
  - 유사도 검색

- `electron/main/sqlite/embedding.ts`
  - `embedding_queue`, `chat_embeddings` CRUD helper
  - migration flag, queue 통계, 샘플 조회

- `electron/main/ipc/embedding.ts`
  - renderer에서 사용하는 embedding IPC 등록

### renderer

- `src/store/useEmbeddingStatusStore.ts`
  - 현재 처리 중 여부
  - pending 개수
  - embedding 개수
  - model loaded 여부

- `src/store/useEmbeddingModelStore.ts`
  - 모델 다운로드 진행률 UI 상태

- `src/components/sidebar/SideNavigationBar.tsx`
  - 프로필 영역에 embedding 처리 상태 점 표시

- `src/components/settings/DeveloperToolsPanel.tsx`
  - embedding status / sample inspect

## 앱 시작 시 동작

### main process

앱 시작 시 `electron/main/main.ts`에서 `embeddingService.start()`를 호출합니다.

이때 수행되는 작업:

1. SQLite 열기
2. 이전 실행에서 남은 `processing` 잡 복구
3. 모델 백그라운드 로드
4. 주기적 큐 처리 시작

앱 종료 시에는 `embeddingService.stop()`으로 남은 processing 잡을 다시 복구합니다.

### renderer

`src/App.tsx`에서는 다음을 수행합니다.

1. changelog에 지정된 모델명 확인
2. 필요 시 새 모델 다운로드
3. 기존 스레드 임베딩 초기 마이그레이션 실행
4. `window.graphnodeAPI.onEmbeddingStatusChanged(...)`로 상태 구독

## 데이터 모델

### embedding_queue

- 스레드별 Q&A pair 처리 대기열
- 상태: `pending`, `processing`, `done`, `failed`
- 최대 재시도 횟수 이후 `failed`로 전환

### chat_embeddings

- Q&A pair별 실제 벡터 저장
- `thread_id`, `user_message_id`, `assistant_message_id`로 추적
- `model_name`을 함께 보존

## Q&A pair 추출 규칙

현재 서비스는 스레드 메시지에서 아래 규칙으로 임베딩 대상을 만듭니다.

- `system` 메시지는 무시
- 연속된 `user` 메시지는 하나의 질문으로 묶음
- 연속된 `assistant` 메시지는 마지막 응답을 기준으로 사용
- assistant 응답이 비어 있으면 skip

최종 입력 텍스트는 `Q: ... A: ...` 형식으로 결합됩니다.

## IPC 표면

현재 renderer에서 사용하는 주요 메서드:

- `window.graphnodeAPI.enqueueThreadEmbedding(threadId)`
- `window.graphnodeAPI.searchEmbeddings(queryText, limit?)`
- `window.graphnodeAPI.getEmbeddingStatus()`
- `window.graphnodeAPI.runEmbeddingMigration()`
- `window.graphnodeAPI.inspectEmbeddings(limit?)`
- `window.graphnodeAPI.clearAllEmbeddings()`
- `window.graphnodeAPI.onEmbeddingMigrationProgress(listener)`
- `window.graphnodeAPI.onEmbeddingStatusChanged(listener)`

## 개발자 도구 연계

개발자 도구가 활성화되면 `DataPrivacyPanel` 아래 `DeveloperToolsPanel`이 나타납니다.

여기서 확인 가능한 항목:

- 강제 sync
- 그래프 디버그 호출
- embedding status 조회
- embedding sample inspect

추가로 채팅/서버 데이터 전체 삭제 시 임베딩도 함께 비우는 경로가 포함되어 있습니다.

## 유지보수 체크포인트

- embedding 상태 타입을 바꾸면 `electron/main/ipc/embedding.ts`, preload bridge, `src/types/global.d.ts`, `useEmbeddingStatusStore.ts`를 같이 갱신해야 합니다.
- queue 상태 전이 규칙을 바꾸면 stuck job 복구 로직과 developer tools inspect 결과 해석도 같이 바뀝니다.
- 모델 업데이트 정책을 바꾸면 `src/managers/embeddingModelManager.ts`와 changelog의 `model` 필드를 함께 봐야 합니다.
