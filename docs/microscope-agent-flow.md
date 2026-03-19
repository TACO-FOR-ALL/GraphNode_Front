# Microscope And Agent Flow

이 문서는 microscope 분석 기능, SSE 알림, agent toolbox 연계 동작을 현재 코드 기준으로 요약합니다.

## 주요 진입점

- `src/routes/MicroscopePage.tsx`
- `src/components/microscope/MicroScopeVisualization.tsx`
- `src/store/useMicroscopeGenerationStore.ts`
- `src/store/useAgentToolBoxStore.ts`
- `src/store/useNotificationStore.ts`
- `src/components/layout/AiAgentChatBox.tsx`

## 사용자 흐름

1. 사용자가 `/microscope/:nodeId`로 진입하거나 관련 UI에서 특정 대화 노드를 선택합니다.
2. `MicroscopePage`가 기존 워크스페이스 목록을 React Query로 조회합니다.
3. 아직 결과가 없으면 `api.microscope.ingestFromConversation(nodeId)`로 분석을 요청합니다.
4. 서버가 SSE 알림을 보내면 `useNotificationStore`가 microscope 생성 상태를 갱신합니다.
5. `MICROSCOPE_WORKSPACE_COMPLETED` 수신 시 공용 `queryClient`로 `["microscope-workspaces"]` 캐시를 invalidate 합니다.
6. 다시 조회된 워크스페이스를 선택하면 그래프 데이터를 가져와 `MicroScopeVisualization`에 렌더링합니다.

## 상태 책임 분리

### React Query

- 워크스페이스 목록: `["microscope-workspaces"]`
- 워크스페이스 그래프 상세: `["microscope-workspace-graph", selectedWorkspaceId]`
- 캐시 invalidation은 microscope 완료 알림 처리에서 공용 `src/queryClient.ts` 인스턴스를 사용합니다.

### Zustand

- `useMicroscopeGenerationStore`
  - microscope 분석이 진행 중인지 저장
  - `persist`를 사용해 새로고침 후에도 진행 상태를 유지
- `useAgentToolBoxStore`
  - agent toolbox 열림/닫힘 상태
  - microscope에서 선택한 노드 목록(`microscopeNodes`)
  - 외부에서 주입하는 응답 문자열(`response`)

## SSE 알림과 상태 전이

`src/store/useNotificationStore.ts`는 microscope 관련 이벤트를 다음과 같이 처리합니다.

- `MICROSCOPE_INGEST_REQUESTED`: 생성 상태를 `true`로 전환
- `MICROSCOPE_INGEST_REQUEST_FAILED`: 생성 상태를 `false`로 전환
- `MICROSCOPE_DOCUMENT_COMPLETED`: 생성 상태를 `false`로 전환
- `MICROSCOPE_DOCUMENT_FAILED`: 생성 상태를 `false`로 전환
- `MICROSCOPE_WORKSPACE_COMPLETED`: 생성 상태를 `false`로 전환하고 워크스페이스 목록 캐시 invalidate

즉, microscope 화면은 직접 polling하지 않고 SSE 이벤트와 React Query 재조회 조합으로 최신 상태를 맞춥니다.

## 시각화와 Agent 연계

`MicroScopeVisualization`은 그래프에서 선택한 노드를 `onCtrlClickNodes`로 상위에 전달할 수 있습니다.

- `MicroscopePage`는 전달받은 노드를 `useAgentToolBoxStore.setMicroscopeNodes(...)`에 저장
- 동시에 agent toolbox를 열어 후속 질의가 가능한 상태로 전환
- `AiAgentChatBox`는 `microscopeNodes`를 source chip으로 동기화
- 사용자가 source chip을 제거하면 store의 `microscopeNodes`도 함께 정리

이 구조 덕분에 사용자는 그래프에서 고른 노드를 그대로 agent 질의 컨텍스트로 재사용할 수 있습니다.

## 유지보수 시 체크포인트

- microscope 관련 새 SSE 타입을 추가하면 `useNotificationStore.ts`의 상태 전이와 알림 문구를 함께 갱신합니다.
- 워크스페이스 조회 query key를 바꾸면 notification 쪽 invalidation key도 함께 변경해야 합니다.
- agent toolbox와 microscope 노드 공유 모델을 바꾸면 `MicroscopePage`, `AiAgentChatBox`, `useAgentToolBoxStore` 세 곳을 같이 봐야 합니다.
