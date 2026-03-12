# 🧩 GraphNode Front (Electron + React + TypeScript)

> **TACO 4TH ACTIVITY** — Cross-Platform Desktop Application  
> React + Electron + TypeScript + Vite + Zustand 기반 데스크탑 앱

---

## 🚀 개요

**GraphNode Front**는 React와 Electron을 결합해 제작된 데스크탑 앱입니다.  
Vite를 통해 빠른 개발 및 빌드 환경을 제공하며, TypeScript를 기반으로 안정성을 확보했습니다.  
Tailwind CSS로 UI 스타일링을 단순화하고, i18n(국제화)을 통해 **한국어 / 영어 / 중국어**를 지원합니다.  
또한 **Zustand**를 이용하여 전역 상태를 관리합니다.

---

## 📚 문서 인덱스

프로젝트 운영/개발 문서는 `docs` 폴더에서 관리합니다.

- [문서화 가이드](docs/README.md)
- [개발 가이드](docs/development-guide.md)
- [아키텍처](docs/architecture.md)
- [데이터 동기화 & IPC](docs/data-sync-ipc.md)
- [MCP 아키텍처](docs/MCP_ARCHITECTURE.md)
- [테스트 전략](docs/testing-strategy.md)
- [트러블슈팅](docs/troubleshooting.md)

---

## 🧠 기술 스택

| 구분                      | 사용 기술                                 |
| ------------------------- | ----------------------------------------- |
| **Frontend (Renderer)**   | React 18, TypeScript, Vite                |
| **Desktop Runtime**       | Electron 31+                              |
| **DB / Data Persistance** | Indexed DB, Dexie.js                      |
| **State Management**      | Zustand                                   |
| **Styling**               | Tailwind CSS                              |
| **Internationalization**  | i18next, react-i18next                    |
| **Build Tool**            | vite-plugin-electron, TypeScript Compiler |
| **Lint / Format**         | ESLint, Prettier                          |
| **패키지 관리자**         | npm 10+                                   |

---

## ⚙️ 설치 및 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (Infisical 환경 변수 주입 + Vite + Electron)
infisical run -- npm run dev

# 타입체크 + 빌드
npm run build

# 테스트 코드 실행
npm test

# 빌드 결과 프리뷰
npm run preview
```

---

## 🧩 프로젝트 구조

프로젝트 구조를 참고하셔서 각 디렉토리 별로 새로운 파일 생성시에는 파일명 표기법을 준수하여주세요.

```bash
GraphNode_Front/
├── electron/           # https://lasbe.tistory.com/203 (참고)
│   ├── main/           # Electron 메인 프로세스 (창 생성)
│   │   ├── main.ts
│   │   └── ipc/         # ipc 통신 설정 파일 (하위 디렉토리 설명 생략)
│   └── preload/         # Renderer와 IPC 브릿지
│       ├── preload.ts
│       └── preload/     # ipc 브릿지 설정 파일 (하위 디렉토리 설명 생략)
├── src/
│   ├── components/
│   │   ├── ComponentName.tsx      # 재사용 컴포넌트 (PascalCase)
│   │   └── __test__/              # 각 디렉토리마다 존재하는 유닛 테스트 코드 디렉토리
│   ├── constants/
│   │   └── CONSTANTS_NAME.ts      # 상수 관리 (UPPER_SNAKE_CASE)
│   ├── hooks/
│   │   └── useHookName.ts         # 커스텀 훅 관리 (use + camelCase)
│   ├── i18n/
│   │   ├── index.ts               # i18n 초기화
│   │   └── locales/               # 번역 문서 관리
│   │       ├── en.json
│   │       ├── ko.json
│   │       └── zh.json
│   ├── db/
│   │   └── graphnode.db.ts        # Dexie.js DB 스키마 정의
│   ├── managers/
│   │   └── entityRepo.ts          # Repository 패턴 (camelCase)
│   ├── routes/
│   │   └── RouteName.tsx          # 페이지 컴포넌트 (PascalCase)
│   ├── services/
│   │   └── serviceName.ts         # 외부 API 서비스 (camelCase)
│   ├── store/
│   │   └── useStoreName.ts        # Zustand 스토어 (use + camelCase)
│   ├── types/
│   │   └── TypeName.ts            # 타입 정의 (PascalCase)
│   ├── utils/
│   │   └── functionName.ts        # 유틸 함수 (camelCase)
│   ├── apiClient.ts               # 백엔드 SDK 선언
│   ├── App.tsx                    # 루트 컴포넌트
│   ├── index.css                  # 글로벌 스타일
│   └── main.tsx                   # 진입점 (ReactDOM.render)
│
├── index.html
├── package.json
├── package-lock.json
└── .gitignore
```

---

## 🧭 브랜치 전략 (GitLab Flow)

| 브랜치명    | 역할 설명                                                     |
| ----------- | ------------------------------------------------------------- |
| `main`      | 안정화된 **배포용 브랜치**                                    |
| `develop`   | **개발 통합 브랜치**, 모든 기능 브랜치가 병합되는 중심 브랜치 |
| `feature/*` | **기능 단위 개발용 브랜치** (예: `feature/i18n-support`)      |
| `hotfix/*`  | **긴급 수정 브랜치**, main에 직접 병합 가능                   |

---

## 🪵 커밋 규칙 (Conventional Commit)

| 태그       | 설명                         | 예시                                 |
| ---------- | ---------------------------- | ------------------------------------ |
| `feat`     | 새로운 기능 추가             | `feat: 다국어 전환 기능 추가`        |
| `fix`      | 버그 수정                    | `fix: Electron IPC 연결 문제 해결`   |
| `refactor` | 코드 리팩토링                | `refactor: Zustand 스토어 구조 개선` |
| `style`    | 코드 포맷 / 스타일 수정      | `style: Tailwind 색상 및 폰트 정리`  |
| `docs`     | 문서 추가 및 수정            | `docs: README.md 업데이트`           |
| `chore`    | 설정, 의존성, 빌드 관련 수정 | `chore: ESLint 규칙 수정`            |
| `test`     | 테스트 코드 추가 및 수정     | `test: 전역 상태 테스트 추가`        |

> 💡 **커밋 메시지 가이드라인**
>
> - 한글/영문 모두 허용
> - **첫 단어는 소문자**, 콜론(`:`) 뒤에 간결한 설명
> - **GitLab Merge Request** 시 관련 이슈번호를 `#번호`로 명시
>   - 예: `feat: 다국어 기능 추가 (#42)`

---

## 🗃️ DB 관련 규칙

### 기술 스택

- **IndexedDB** + **Dexie.js**를 사용하여 로컬 데이터 영속성 관리
- 저장 위치:
  - Windows: `C:\Users\<User>\AppData\Roaming\<appName>\IndexedDB`
  - macOS: `~/Library/Application Support/<appName>/IndexedDB`

### Repository 패턴

로컬 DB에서 CRUD 작업은 **Repository 패턴**을 사용합니다.

| Repository   | 설명                          | 주요 메서드                                              |
| ------------ | ----------------------------- | -------------------------------------------------------- |
| `threadRepo` | 채팅 스레드 관리              | `create`, `getThreadById`, `addMessageToThreadById`, ... |
| `noteRepo`   | 노트 관리                     | `create`, `getNoteById`, `updateNoteById`, ...           |
| `folderRepo` | 폴더 관리                     | `create`, `getFolderById`, `deleteFolderById`, ...       |
| `outboxRepo` | 오프라인 동기화 (Outbox 패턴) | `enqueueNoteCreate`, `enqueueNoteUpdate`, ...            |

### Repository 작성 규칙

```typescript
// src/managers/entityRepo.ts
export const entityRepo = {
  async create(...): Promise<Entity> { ... },
  async getEntityById(id: string): Promise<Entity | null> { ... },
  async getAllEntities(): Promise<Entity[]> { ... },
  async updateEntityById(id: string, ...): Promise<Entity | null> { ... },
  async deleteEntityById(id: string): Promise<string | null> { ... },
};
```

### 트랜잭션 사용

여러 테이블에 걸친 작업은 **트랜잭션**으로 묶어서 원자성을 보장합니다:

```typescript
await db.transaction("rw", db.notes, db.outbox, async () => {
  await db.notes.put(newNote);
  await outboxRepo.enqueueNoteCreate(newNote.id, payload);
});
```

### Outbox 패턴 (오프라인 동기화)

로컬 변경사항을 서버에 동기화하기 위해 **Outbox 패턴**을 사용합니다:

1. 로컬 DB 변경 시 `outbox` 테이블에 작업(op)을 enqueue
2. 백그라운드 워커가 `pending` 상태의 작업을 서버로 전송
3. 성공 시 작업 삭제, 실패 시 재시도

| Op Type       | 설명           |
| ------------- | -------------- |
| `note.create` | 노트 생성      |
| `note.update` | 노트 수정      |
| `note.move`   | 노트 폴더 이동 |
| `note.delete` | 노트 삭제      |

### 스키마 버전 관리

DB 스키마 변경 시 `graphnode.db.ts`에서 **버전을 증가**시키고 마이그레이션을 정의합니다:

```typescript
this.version(2).stores({
  notes: "id, title, content, createdAt, updatedAt, folderId", // folderId 추가
  folders: "id, name, parentId, createdAt, updatedAt", // 새 테이블
});
```

---

### 부록: 코드 푸시

```bash
git push origin develop   # TACO-FOR-ALL/GraphNode_Front => 개발 및 IPC 업데이트 배포용

git remote add app https://github.com/Yoy0z-maps/graphnode-web.git
git push app develop      # Yoy0z-maps/graphnode-app (vercel) => 웹 서버 URL 배포용
```

--

## Local Setup

1.  **의존성 설치**:
    ```bash
    npm install
    ```
2.  **환경 변수 설정**: 보안과 효율적인 협업을 위해 Infisical을 통해 환경 변수를 관리합니다. 로컬 개발 환경 설정을 위해 아래 단계를 진행해 주세요.

① Infisical CLI 설치 및 로그인
먼저 로컬 환경에 Infisical CLI가 설치되어 있어야 합니다.

```bash
# 설치 (Node.js 환경으로 개발함으로 npm을 권장합니다)
npm install -g @infisical/cli
brew install infisical/get-cli/infisical

# 로그인 (US Cloud 선택) 및 프로젝트 초기화
infisical login
infisical init
```

② 환경 변수 주입 및 실행
로컬에 .env 파일을 직접 만들지 마세요. 실행 시점에 Infisical에서 변수를 실시간으로 주입합니다.

> 루트 디렉토리에 `.infisical.json`파일이 있는지 확인해주세요.

```bash
infisical run -- npm run dev
```

> 기존 `npm run dev`가 아닌 새로운 명령어를 사용합니다

③ 환경 변수 사용 및 팁

- 환경변수 접근은 `.env`를 사용할 때와 동일합니다.

```ts
// example
console.log("TEST:", process.env.TEST_KEY);
```

- `infisical export`명령어를 통해 주입될 환경 변수를 확인할 수 있습니다.
- `--env=value`명령어를 통해 특정 배포 상태의 환경 변수를 지정할 수 있습니다. (dev, staging, prod)

```bash
# example
infisical run --env=prod -- npm start
```
