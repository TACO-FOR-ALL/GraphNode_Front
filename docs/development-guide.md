# Development Guide

## 기술 스택 요약

- Renderer: React 19 + TypeScript + Vite + React Router
- Desktop: Electron (`vite-plugin-electron/simple`)
- State: Zustand, React Query
- Local DB: Dexie (IndexedDB)
- Test: Jest (`ts-jest`, `jsdom`)

## 요구 사항

- Node.js 20+
- npm 10+
- Infisical CLI (`@infisical/cli`)
- macOS/Windows/Linux (Electron 실행 가능 환경)

## 로컬 실행

```bash
npm install
infisical run -- npm run dev
```

- `infisical run -- npm run dev`는 Infisical에서 환경 변수를 주입한 뒤 Vite + Electron(main/preload 빌드)을 함께 실행합니다.
- 개발 URL은 `http://localhost:5173` 입니다.

## 빌드/테스트

```bash
npm run build       # renderer 빌드
npm test            # jest 실행
npm run dist        # electron-builder 패키징
```

배포 스크립트:

- `npm run dist:mac:arm`
- `npm run dist:mac:intel`
- `npm run dist:mac:all`
- `npm run dist:windows`

## 주요 폴더 역할

- `src/routes`: 화면 단위 엔트리 컴포넌트
- `src/components`: 재사용 UI
- `src/store`: Zustand 전역 상태
- `src/managers`: 로컬 저장소/동기화/클라이언트 로직
- `src/db`: Dexie 스키마
- `electron/main`: BrowserWindow, IPC handler, 앱 설정
- `electron/preload`: renderer에 노출되는 bridge

## 개발 시 주의할 점

- OpenAI 요청은 renderer에서 직접 호출하지 않고 `openaiIPC`를 통해 main process에서 수행합니다.
- 민감 정보(API 키, 사용자 정보)는 `keytar`에 저장됩니다.
- 노트/스레드 변경은 가능하면 repository(`noteRepo`, `threadRepo`)를 통해 처리해 Outbox 동기화 일관성을 유지하세요.
