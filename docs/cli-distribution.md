# CLI 배포 가이드

## 목표

`npm link` 없이도 최종 사용자가 `graphnode` CLI를 사용할 수 있게 배포하는 것이 목표입니다.

## 현재 상태

- CLI 패키지 위치:
  - `/Users/johnhan/Development/GraphNode_Front/apps/cli`
- publish용 패키지는 standalone `dist/index.js` 번들을 포함합니다.
- 로컬에서 아래 명령으로 릴리스 전 점검이 가능합니다.

```bash
cd /Users/johnhan/Development/GraphNode_Front
npm run graphnode:release-check
```

- 구조적으로는 publish 준비가 되어 있지만, 실제 npm 배포나 Homebrew 릴리스는 수동 릴리스 단계가 필요합니다.

## 1. npm 패키지 배포

적합한 경우:

- 사용자가 Node 설치에 익숙한 경우
- 데스크탑 앱과 별도로 CLI를 배포하고 싶은 경우

예상 사용자 설치 흐름:

```bash
npm install -g @graphnode/cli
graphnode help
```

릴리스 체크리스트:

1. [`/Users/johnhan/Development/GraphNode_Front/apps/cli/package.json`](/Users/johnhan/Development/GraphNode_Front/apps/cli/package.json)의 패키지명 확인
2. 버전 올리기
3. `npm run graphnode:release-check` 실행
4. packed tarball 로컬 테스트
5. npm publish
6. `npm install -g @graphnode/cli` smoke test

참고:

- 현재 CLI는 번들 후 pack/publish되므로 워크스페이스 전용 `file:` 의존성에 직접 기대지 않습니다.
- 최종 사용자는 Node 22+와 `npm install -g @graphnode/cli` 정도만 필요합니다.
- 패키지명이 바뀌어도 실제 명령어 이름은 `graphnode`로 유지할 수 있습니다.

## 2. Homebrew 배포

적합한 경우:

- 주요 사용자가 macOS 터미널 사용자일 때
- 설치 경험을 더 자연스럽게 만들고 싶을 때

예상 사용자 설치 흐름:

```bash
brew install graphnode
graphnode help
```

릴리스 체크리스트:

1. CLI tarball을 GitHub release 등에 업로드
2. SHA256 계산
3. Homebrew formula 템플릿 업데이트
4. tap 저장소에 formula 반영
5. `brew install` 테스트

템플릿:

- `/Users/johnhan/Development/GraphNode_Front/packaging/homebrew/graphnode.rb.example`

## 3. 데스크탑 앱 번들 포함 CLI

적합한 경우:

- 데스크탑 앱 설치만으로 CLI도 함께 제공하고 싶을 때
- GraphNode를 단일 설치 경험으로 제공하고 싶을 때

현재 구현 상태:

- `npm run dist`, `npm run dist:mac:arm`, `npm run dist:mac:intel`, `npm run dist:windows` 실행 시 CLI 번들을 먼저 생성합니다.
- electron-builder는 아래 파일을 앱 리소스에 함께 포함합니다.
  - `cli/dist/index.js`
  - `cli/README.md`
  - `cli/install-graphnode-cli.sh`

추가 보조 파일:

- `/Users/johnhan/Development/GraphNode_Front/packaging/cli/install-graphnode-cli.sh.example`

주의사항:

- macOS와 Windows는 PATH 처리 방식이 다릅니다.
- PATH 수정은 명시적이고 되돌릴 수 있어야 합니다.
- 사용자 경험은 가장 좋지만 패키징 복잡도도 가장 높습니다.

## 권장 순서

1. npm 패키지 배포
2. 필요하면 Homebrew 추가
3. 마지막으로 앱 번들 포함 CLI를 강화

이유:

- 가장 빠르게 실사용 가능한 설치 경로를 만들 수 있음
- 데스크탑 앱 릴리스와 독립적으로 버전 관리 가능
- 설치 프로그램 수준의 리스크가 가장 적음

## 앱 번들과 npm publish의 관계

Electron 설치 프로그램이 CLI를 포함하고 `graphnode`를 PATH에 노출한다면, 데스크탑 사용자에게는 `npm install -g`가 꼭 필요하지 않습니다.

다만 npm publish는 여전히 유용합니다.

- 앱 없이 CLI만 쓰고 싶은 사용자
- CI, 서버, 원격 머신
- 데스크탑 앱과 별개로 CLI만 업데이트하고 싶은 경우

즉 정리하면:

- 앱 번들 포함 CLI는 데스크탑 사용자용 설치 경로를 대체할 수 있음
- 하지만 CLI 단독 배포 채널까지 완전히 대체하는 것은 아님
