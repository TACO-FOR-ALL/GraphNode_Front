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
- 실시간 기능(알림/SSE, 그래프 생성)은 `VITE_API_BASE` 주입이 필요하므로 개발 실행은 Infisical 명령으로 고정하세요.

## Zustand 사용 원칙

### 1) 기본 원칙: selector 패턴 우선

- 컴포넌트에서 상태값/액션 1~2개를 쓸 때는 selector로 각각 구독합니다.

```ts
const isGenerating = useGraphGenerationStore((s) => s.isGenerating);
const setGenerating = useGraphGenerationStore((s) => s.setGenerating);
```

> 이유: 필요한 slice만 구독해 불필요한 리렌더를 줄일 수 있습니다.

### 2) 여러 값이 필요할 때: 객체 selector + shallow

```ts
import { shallow } from "zustand/shallow";

const { isGenerating, progress, error } = useGraphStore(
  (s) => ({
    isGenerating: s.isGenerating,
    progress: s.progress,
    error: s.error,
  }),
  shallow,
);
```

> 객체 selector는 새 객체를 만들기 때문에 `shallow` 비교를 함께 써서 리렌더를 줄입니다.

### 3) 렌더링과 무관한 단발성 읽기: getState()

```ts
const { isGenerating, setGenerating } = useGraphGenerationStore.getState();
if (!isGenerating) setGenerating(true);
```

> 이벤트 핸들러나 non-React 코드에서 현재값 조회 시 사용합니다.
> `getState()`는 구독이 아니므로 값 변경에 따른 자동 리렌더는 없습니다.

### 4) 전체 구독(useStore())은 제한적으로 사용

```ts
const { isGenerating, setGenerating } = useGraphGenerationStore();
```

> 위 방식은 스토어 전체를 구독하므로, 다른 필드 변경에도 리렌더될 수 있습니다.
> 상태가 아주 작고 변경 빈도가 낮으며 성능 이슈가 없다고 확인된 경우에만 사용하세요.
