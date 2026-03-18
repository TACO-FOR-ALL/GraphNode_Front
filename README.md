# 🧩 GraphNode Front (Electron + React + TypeScript)

> **TACO 4TH ACTIVITY** — Cross-Platform Desktop Application  
> React + Electron + TypeScript + Vite + Zustand 기반 데스크탑 앱

---

## 🚀 개요

**GraphNode Front**는 React와 Electron을 결합해 제작된 데스크탑 앱입니다.  
Vite를 통해 빠른 개발 및 빌드 환경을 제공하며, TypeScript를 기반으로 안정성을 확보했습니다.  
Tailwind CSS로 UI 스타일링을 단순화하고, i18n(국제화)을 통해 **한국어 / 영어 / 중국어**를 지원합니다.  
또한 **Zustand**를 이용하여 전역 상태를 관리합니다.

현재 기준으로 로컬 런타임 저장소는 `SQLite`가 기본 경로이며, 노트/폴더/채팅/아웃박스/휴지통은 Electron main IPC를 통해 SQLite에 저장됩니다. CLI도 같은 SQLite 저장소를 읽고 씁니다.

---

## 📌 현재 상태

- 활성 로컬 DB: SQLite
- 활성 동기화 경로: SQLite outbox + startup pull sync
- CLI: 모노레포 내 `apps/cli` 패키지로 제공
- 레거시 로컬 DB: Dexie + IndexedDB

### 더 이상 기본 기준이 아닌 항목

다음 항목은 더 이상 신규 작업의 기준이 아닙니다.

- Dexie를 기본 로컬 DB로 사용하는 방식
- IndexedDB를 기본 영속 저장소로 사용하는 방식
- `/Users/johnhan/Development/GraphNode_Front/src/db/graphnode.db.ts` 기준의 옛 설명

레거시 코드는 아래 경로에 격리되어 있습니다.

- `/Users/johnhan/Development/GraphNode_Front/src/legacy/indexeddb`

---

## 📚 문서 인덱스

프로젝트 운영/개발 문서는 `docs` 폴더에서 관리합니다.

- [문서화 가이드](docs/README.md)
- [개발 가이드](docs/development-guide.md)
- [아키텍처](docs/architecture.md)
- [데이터 동기화 & IPC](docs/data-sync-ipc.md)
- [SQLite 런타임 상태](docs/sqlite-runtime-status.md)
- [SQLite startup sync 계획](docs/sqlite-startup-sync-plan.md)
- [SQLite/vector migration](docs/sqlite-vector-migration.md)
- [Dexie 제거 계획](docs/legacy-dexie-removal-plan.md)
- [CLI 배포 가이드](docs/cli-distribution.md)
- [MCP 아키텍처](docs/MCP_ARCHITECTURE.md)
- [테스트 전략](docs/testing-strategy.md)
- [트러블슈팅](docs/troubleshooting.md)

---

## 🧠 기술 스택

| 구분                      | 사용 기술                                  |
| ------------------------- | ------------------------------------------ |
| **Frontend (Renderer)**   | React 19, TypeScript, Vite, React Router   |
| **Desktop Runtime**       | Electron                                   |
| **DB / Data Persistence** | SQLite (`node:sqlite`, Electron main 기반) |
| **Legacy DB**             | Dexie.js, IndexedDB                        |
| **State Management**      | Zustand, React Query                       |
| **Styling**               | Tailwind CSS                               |
| **Internationalization**  | i18next, react-i18next                     |
| **Build Tool**            | vite-plugin-electron, TypeScript Compiler  |
| **Lint / Format**         | ESLint, Prettier                           |
| **패키지 관리자**         | npm 10+                                    |

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

CLI 관련 명령:

```bash
npm run graphnode -- help
npm run graphnode:release-check
```

---

## 🧩 프로젝트 구조

프로젝트 구조를 참고하셔서 각 디렉토리 별로 새로운 파일 생성 시에는 파일명 표기법을 준수해 주세요.

```bash
GraphNode_Front/
├── apps/
│   └── cli/                # graphnode CLI 패키지
├── electron/
│   ├── main/               # Electron 메인 프로세스, IPC, SQLite handlers
│   └── preload/            # Renderer와 IPC 브릿지
├── packages/               # Electron App과 CLI가 공통으로 의존하는 코드
│   ├── paths/              # CLI/home-path 관련 공용 유틸
│   └── storage/            # SQLite schema, storage helper, sync meta
├── src/
│   ├── components/
│   │   ├── ComponentName.tsx
│   │   └── __test__/
│   ├── constants/
│   ├── hooks/
│   ├── i18n/
│   ├── legacy/
│   │   └── indexeddb/      # deprecated Dexie 코드
│   ├── managers/           # repo, sync worker
│   │   └── storage/
│   │       ├── contracts/  # storage interface와 입력 타입
│   │       ├── adapters/   # SQLite renderer/node adapter 구현
│   │       ├── selectors/  # 현재 사용할 storage 구현 선택 로직
│   │       └── README.md
│   ├── routes/
│   ├── services/
│   ├── store/
│   ├── types/
│   ├── utils/
│   ├── apiClient.ts
│   ├── App.tsx
│   └── main.tsx
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
| `feature/*` | **기능 단위 개발용 브랜치**                                   |
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

## 🗃️ 로컬 DB 및 동기화 규칙

### 현재 기준

- 기본 로컬 저장소는 **SQLite**입니다.
- 기본 SQLite 경로:
  - `~/.graphnode/graphnode.db`
- Renderer는 `window.graphnodeAPI`를 통해 Electron main IPC를 거쳐 SQLite에 접근합니다.
- 노트/폴더/스레드 변경은 repository 계층을 통해 처리해 SQLite + Outbox 동기화 일관성을 유지합니다.

현재 핵심 repo:

| Repository   | 설명                          |
| ------------ | ----------------------------- |
| `threadRepo` | 채팅 스레드 관리              |
| `noteRepo`   | 노트 관리                     |
| `folderRepo` | 폴더 관리                     |
| `outboxRepo` | 오프라인 동기화용 Outbox 관리 |
| `trashRepo`  | 휴지통 관리                   |

### Outbox 패턴

로컬 변경사항을 서버에 동기화하기 위해 **Outbox 패턴**을 사용합니다.

1. 로컬 저장소 변경
2. SQLite `outbox_ops`에 작업 enqueue
3. 백그라운드 워커가 pending 작업을 서버로 전송
4. 성공 시 작업 삭제, 실패 시 재시도

예시 op type:

- `note.create`
- `note.update`
- `note.move`
- `note.delete`
- `folder.create`
- `folder.update`
- `folder.delete`
- `thread.update`
- `thread.delete`

### Pull / Push sync

- Pull sync:
  - `/Users/johnhan/Development/GraphNode_Front/src/managers/pullWorker.ts`
- Push sync:
  - `/Users/johnhan/Development/GraphNode_Front/src/managers/syncWorker.ts`

즉, 현재 outbox/trash/startup sync는 모두 SQLite 기준입니다.

### 레거시 DB 규칙

기존 **IndexedDB + Dexie.js** 설명은 레거시 참고용입니다.

- 더 이상 active runtime path가 아닙니다.
- 롤백/참고를 위해 다음 경로에만 남아 있습니다.
  - `/Users/johnhan/Development/GraphNode_Front/src/legacy/indexeddb`

---

## 🧭 CLI

CLI 패키지 위치:

- `/Users/johnhan/Development/GraphNode_Front/apps/cli`

예시:

```bash
graphnode help
graphnode sqlite status
graphnode note list
graphnode note add "hello"
```

CLI 저장소 규칙:

- `graphnode note ...`
- `graphnode sqlite ...`

위 명령은 앱과 같은 SQLite DB를 사용합니다.

과거 파일 기반 CLI 실험 데이터는 아래 경로에 남아 있을 수 있습니다.

- `~/.graphnode/cli/notes`

이 경로는 `graphnode file-note ...` 같은 레거시 확인용 명령에서만 의미가 있습니다.

배포 전 점검:

```bash
npm run graphnode:release-check
```

배포 전략은 아래 문서를 참고하세요.

- [CLI 배포 가이드](docs/cli-distribution.md)

---

## 📦 패키징

Electron 릴리스 빌드는 CLI artifact도 함께 앱 리소스에 포함합니다.

```bash
npm run dist
npm run dist:mac:arm
npm run dist:mac:intel
npm run dist:windows
```

앱 설치 후에는 Settings > Data Privacy에서 현재 사용자 기준으로 CLI 설치를 진행할 수 있습니다.

---

## 로컬 환경 설정

1. **의존성 설치**

```bash
npm install
```

2. **환경 변수 설정**

보안과 효율적인 협업을 위해 Infisical을 통해 환경 변수를 관리합니다. 로컬 개발 환경 설정을 위해 아래 단계를 진행해 주세요.

① Infisical CLI 설치 및 로그인

```bash
# 설치 (Node.js 환경으로 개발하므로 npm 권장)
npm install -g @infisical/cli
brew install infisical/get-cli/infisical

# 로그인 (US Cloud 선택) 및 프로젝트 초기화
infisical login
infisical init
```

② 환경 변수 주입 및 실행

로컬에 `.env` 파일을 직접 만들지 말고 실행 시점에 Infisical에서 변수를 주입합니다.

> 루트 디렉토리에 `.infisical.json` 파일이 있는지 확인해 주세요.

```bash
infisical run -- npm run dev
```

> 기존 `npm run dev`가 아닌 위 명령을 사용합니다.

③ 환경 변수 사용 및 팁

```ts
console.log("TEST:", process.env.TEST_KEY);
```

- `infisical export` 명령어로 주입될 환경 변수를 확인할 수 있습니다.
- `--env=value`를 통해 특정 환경의 변수를 지정할 수 있습니다.

```bash
infisical run --env=prod -- npm start
```

---

### 부록: 코드 푸시

```bash
git push origin develop   # TACO-FOR-ALL/GraphNode_Front => 개발 및 IPC 업데이트 배포용

git remote add app https://github.com/Yoy0z-maps/graphnode-app
git push app develop      # Yoy0z-maps/graphnode-app (vercel) => 웹 서버 URL 배포용
```
