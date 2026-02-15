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

## 추가 권장 문서 (다음 단계)

- `docs/troubleshooting.md`: 자주 발생하는 실행/빌드/키체인 이슈 대응
- `docs/release-playbook.md`: macOS/Windows 패키징 및 검증 체크리스트
- `docs/testing-strategy.md`: 단위 테스트 범위와 우선 테스트 대상
