# Troubleshooting

## 1) `npm run dev`는 되는데 API 호출이 실패함

증상:

- `VITE_API_BASE`가 비어 있어 SSE/REST 호출이 실패

확인/해결:

1. 개발 실행을 `infisical run -- npm run dev`로 실행했는지 확인
2. 루트에 `.infisical.json`이 존재하는지 확인
3. `infisical export`로 주입되는 변수에 `VITE_API_BASE`가 있는지 확인

## 2) `window.*API`가 undefined 에러

증상:

- `window.keytarAPI`, `window.systemAPI`, `window.mcpAPI` 등 접근 시 undefined

원인:

- Electron preload가 없는 환경(웹 단독 실행/테스트 환경)에서 브리지 API 접근

확인/해결:

1. Electron 포함 개발 실행(`infisical run -- npm run dev`)인지 확인
2. 브리지 API 사용 코드에 런타임 가드(`window?.xxxAPI`) 적용
3. 타입 선언(`src/types/global.d.ts`)과 preload 노출이 일치하는지 확인

## 3) 그래프 생성 버튼이 계속 비활성화됨

증상:

- `EmptyGraph`에서 생성 중 상태가 해제되지 않음

원인 후보:

- SSE 이벤트(`GRAPH_GENERATION_COMPLETED`/`FAILED`) 미수신
- persist된 `graph-generation-state` 값이 true로 남아 복원됨

확인/해결:

1. 네트워크 탭에서 `/v1/notifications/stream` 연결 상태 확인
2. 콘솔에서 notification 이벤트 수신 여부 확인
3. 임시로 저장 상태 초기화:
   - `localStorage.removeItem("graph-generation-state")`

## 4) MCP 서버가 앱 재시작 후 연결되지 않음

증상:

- 이전에 enabled로 저장한 서버가 자동 연결되지 않음

확인/해결:

1. 설정에서 서버 `enabled` 상태 확인
2. 메인 프로세스 로그에서 `autoConnectEnabledServers` 실행 여부 확인
3. 서버별 인증 정보(예: Notion API Key, Google credentials) 유효성 점검

## 5) macOS에서 keytar/서명 관련 빌드 실패

증상:

- `npm run dist` 또는 mac 타깃 빌드 시 keychain/identity/notarize 관련 오류

확인/해결:

1. `package.json`의 `build.mac.identity`가 현재 로컬 인증서와 일치하는지 확인
2. notarize에 필요한 Apple 인증 환경변수/자격정보 확인
3. 로컬 개발 단계에서는 `npm run build`와 `npm test`를 먼저 통과시킨 뒤 패키징

## 6) IPC 추가 후 렌더러에서 호출 실패

확인 순서:

1. `electron/main/ipc/*.ts`에 `ipcMain.handle` 등록
2. `electron/main/ipc/index.ts`에서 모듈 연결
3. `electron/preload/bridges/*.ts`에서 `contextBridge` 노출
4. `src/types/global.d.ts` 타입 선언 반영
5. Electron 프로세스 재시작
