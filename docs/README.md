# Documentation Guide

이 문서는 GraphNode Front 프로젝트의 문서화 우선순위와 문서 위치를 정의합니다.

## 우선 문서화 대상

1. 실행/개발 환경: 신규 개발자가 로컬 실행까지 도달하는 데 필요한 정보
2. 아키텍처: Electron Main/Preload/Renderer 경계와 핵심 모듈 책임
3. 데이터 흐름: IndexedDB + Outbox + 서버 동기화 흐름
4. IPC/보안: preload bridge로 노출된 API 표면과 사용 규칙
5. 배포/릴리스: `electron-builder` 기반 배포 절차와 산출물

## 현재 문서

- `docs/development-guide.md`: 로컬 실행, 빌드, 테스트, 디렉토리별 작업 규칙
- `docs/architecture.md`: 앱 구조, 라우팅, 상태관리, 보안 경계
- `docs/data-sync-ipc.md`: DB 스키마, Outbox coalescing, sync worker, IPC 브리지
- `docs/feature-map.md`: 주요 라우트, 부팅 순서, 핵심 모듈 책임 빠른 참조
- `docs/MCP_ARCHITECTURE.md`: MCP 서버 구조, IPC 채널, 호출 흐름
- `docs/CHANGELOG_DEV.md`: 최근 개발 변경 사항 로그
- `docs/testing-strategy.md`: 테스트 범위, 실행 방법, 우선순위
- `docs/troubleshooting.md`: 자주 발생하는 실행/빌드/연동 이슈 대응

## 추가 권장 문서 (다음 단계)

- `docs/release-playbook.md`: macOS/Windows 패키징 및 검증 체크리스트
