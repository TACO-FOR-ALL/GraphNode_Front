# GraphNode CLI

이 패키지는 GraphNode 저장소 안에서 함께 관리되는 터미널용 CLI입니다.

## 빠른 시작

```bash
cd /Users/johnhan/Development/GraphNode_Front
npm run graphnode -- help
npm run graphnode -- doctor
npm run graphnode -- sqlite status
npm run graphnode -- sqlite notes
npm run graphnode -- note add "First note"
npm run graphnode -- note list
npm run graphnode -- note path "first"
npm run graphnode -- note search "first"
npm run graphnode -- note show "first"
npm run graphnode -- note open "first"
npm run graphnode -- note delete "first"
```

## 로컬 개발용 설치

```bash
cd /Users/johnhan/Development/GraphNode_Front
npm link --workspace @graphnode/cli
graphnode help
```

이 방식은 로컬 개발용입니다. 최종 사용자에게 `npm link`를 요구하는 구조는 아닙니다.

## 배포 방식

### 1. npm 패키지

CLI를 독립적인 개발자 도구로 배포할 때 가장 단순한 방식입니다.

예상 설치 흐름:

```bash
npm install -g @graphnode/cli
graphnode help
```

배포 전 점검:

```bash
cd /Users/johnhan/Development/GraphNode_Front
npm run graphnode:release-check
```

현재는 standalone `dist/index.js` 번들을 만든 뒤 패키징하므로, publish된 패키지가 워크스페이스 전용 `file:` 의존성에 직접 묶이지 않습니다.

패키지명 관련 참고:

- 현재 패키지명은 `@graphnode/cli`
- 이 npm scope를 실제로 소유하지 않았다면 publish 전에 변경해야 함
- 실제 명령어 이름은 `bin.graphnode`로 결정되므로 `graphnode` 유지 가능

### 2. Homebrew

macOS 사용자 중심 배포에 적합합니다.

예상 설치 흐름:

```bash
brew install graphnode
graphnode help
```

### 3. 앱 번들 포함 CLI

데스크탑 앱 설치 시 CLI도 함께 제공하고 싶을 때 적합합니다.

이 방식에서는 Electron 설치 프로그램이 `graphnode` 바이너리를 PATH에 노출하거나, 설치 후 전역 사용 가능하도록 보조 설치 단계를 제공합니다.

현재 릴리스 빌드는 CLI 파일을 앱 리소스 안에 함께 포함합니다. 다만 실제 PATH 노출은 플랫폼별 설치 단계가 따로 필요합니다.

자세한 내용은 아래 문서를 참고하세요.

- [`/Users/johnhan/Development/GraphNode_Front/docs/cli-distribution.md`](/Users/johnhan/Development/GraphNode_Front/docs/cli-distribution.md)

## 저장소 모델

기본 CLI 저장소:

- SQLite 노트는 기본적으로 `~/.graphnode/graphnode.db`에 저장됩니다.
- `graphnode note ...`, `graphnode sqlite ...`는 이 SQLite DB를 사용합니다.

필요하면 `GRAPHNODE_HOME`으로 저장소 루트를 덮어쓸 수 있습니다.
