# 문서화 가이드

이 문서는 GraphNode Front 프로젝트에서 어떤 문서를 우선적으로 유지해야 하는지와, 각 문서의 역할을 정리합니다.

## 우선 문서화 대상

1. 실행/개발 환경
2. 아키텍처
3. 데이터 흐름과 동기화
4. IPC와 보안 경계
5. 배포/릴리스 절차

## 현재 문서

- `docs/development-guide.md`: 로컬 실행, 빌드, 테스트, 디렉토리별 작업 규칙
- `docs/architecture.md`: 앱 구조, 라우팅, 상태관리, 보안 경계
- `docs/schema.md`: SQLite 주요 테이블과 관계를 Mermaid ER로 시각화한 문서
- `docs/data-sync-ipc.md`: SQLite 기준 동기화, outbox, IPC 표면
- `docs/embedding-runtime.md`: 로컬 임베딩 큐, 모델 로드, 검색, 개발자 도구 연계
- `docs/feature-map.md`: 주요 화면 진입점과 핵심 모듈 책임 요약
- `docs/microscope-agent-flow.md`: microscope 분석, SSE 알림, agent toolbox 연계 흐름
- `docs/MCP_ARCHITECTURE.md`: MCP 서버 구조, IPC 채널, 호출 흐름
- `docs/CHANGELOG_DEV.md`: 최근 개발 변경 로그
- `docs/testing-strategy.md`: 테스트 범위, 실행 방법, 우선순위
- `docs/troubleshooting.md`: 자주 발생하는 실행/빌드/연동 이슈 대응
- `docs/sqlite-runtime-status.md`: SQLite 전환 상태 요약
- `docs/sqlite-startup-sync-plan.md`: startup sync 기반 SQLite 전환 계획
- `docs/sqlite-vector-migration.md`: SQLite + 벡터 계층의 현재 상태와 남은 확장 방향
- `docs/cli-distribution.md`: CLI 배포 방식과 체크리스트
- `docs/legacy-dexie-removal-plan.md`: Dexie 제거 단계 계획

## 추가 권장 문서

- `docs/release-playbook.md`: macOS/Windows 패키징과 검증 체크리스트
