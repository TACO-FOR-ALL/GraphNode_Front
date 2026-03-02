# 개발 변경 로그

## 2026-03-02 (feat/MCP 브랜치)

### MCP 기능 개선

#### 앱 시작 시 자동 연결
- `electron/main/ipc/mcp.ts`에서 `autoConnectEnabledServers()` 호출 추가
- `enabled: true`인 서버들이 앱 시작 시 자동으로 연결됨

#### UX 개선: 연결 테스트 버튼 제거
- `MCPNotionSettings.tsx`, `MCPFilesystemSettings.tsx`에서 연결 테스트 버튼 제거
- 저장 버튼 클릭 시 자동으로 연결 시도
- 연결 실패 시 에러 메시지 표시

#### UX 개선: Google Calendar 토글로 연결 해제
- `MCPBuiltInServers.tsx`에서 토글 off 시 OAuth 연결도 자동 해제
- `MCPGoogleSettings.tsx`에서 별도의 연결 해제 버튼 제거

### 코드 정리

#### 미사용 OAuth 모듈 삭제
- `electron/main/oauth/` 폴더 전체 삭제
  - `OAuthManager.ts` - 미사용
  - `google.ts` - 미사용 (Google Calendar는 MCP 서버 자체 인증 사용)
  - `notion.ts` - 미사용 (Notion은 API 키 방식 사용)
  - `index.ts` - 미사용
- `src/types/mcp.ts`에서 `OAuthTokens`, `OAuthConfig` 타입 제거

#### 미사용 함수 제거
- `electron/main/mcp/builtins/index.ts`에서 제거:
  - `requiresAuth()` 함수
  - `getAuthProvider()` 함수
  - `isServerAvailable()` 함수

#### 미사용 import 정리
- `electron/main/ipc/mcp.ts`에서 제거:
  - `BrowserWindow` import
  - `getBuiltinServerConfig` import
  - `MCPServerSettings` import
  - `OAuthManager` import

#### 미구현 Google Drive 코드 제거
- `MCPBuiltInServers.tsx`에서 `google-drive` 관련 조건 제거
- `BuiltinServerType`에 없는 타입 비교로 인한 타입 에러 해결

### 리팩토링

#### 타입 통합
- `src/types/mcp.ts`를 메인 타입 소스로 지정
- `electron/main/mcp/types.ts`는 re-export만 수행

#### Toggle 컴포넌트 추출
- `src/components/common/Toggle.tsx` 생성
- `MCPServerCard.tsx`, `ToggleSettingItem.tsx`에서 공통 컴포넌트 사용

### 번역 파일 정리
- 미사용 번역 키 제거:
  - `testConnection`, `testing`, `testSuccess`, `testFailed`
- 새 번역 키 추가:
  - `filesystem.saved`, `notion.saved` (저장 및 연결 완료)

---

## 배포 관련 참고사항

### 웹 업데이트로 가능한 변경
- `src/` 폴더의 모든 React 코드
- UI 변경, 설정 화면 개선
- 기존 `mcpAPI` 메서드를 활용한 기능

### 앱 업데이트가 필요한 변경
- `electron/main/` 폴더의 코드
- `electron/preload/` 폴더의 코드
- 새로운 IPC 채널 추가
- MCPManager/MCPClient 로직 변경
