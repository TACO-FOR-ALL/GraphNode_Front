**Overview**
이 폴더는 그래프 요약(Summary) 팝업 UI를 구성하는 컴포넌트들로 이루어져 있습니다.
요약 패널은 그래프 위에 오버레이로 떠서 배경 그래프가 보이도록 설계되어 있습니다.

**구성 파일**
- `GraphSummaryPanel.tsx`: 요약 슬라이드 전체 컨테이너. 오버레이, 네비게이션, 스크롤 페이드 처리 담당
- `OverviewCard.tsx`: 전체 개요 카드
- `ClusterCard.tsx`: 클러스터 요약 카드(가로 스크롤 리스트)
- `PatternItem.tsx`: 패턴 리스트 아이템(세로 스크롤)
- `ConnectionItem.tsx`: 연결 리스트 아이템(세로 스크롤)
- `RecommendationCard.tsx`: 추천 액션 카드(세로 스크롤, 2열 그리드)
- `index.ts`: summary 컴포넌트 export 모음

**GraphSummaryPanel 핵심 동작**
- **슬라이드 구조**: `SLIDES` 배열 기준으로 5개 섹션(개요/클러스터/패턴/연결/추천)을 좌우 슬라이드 방식으로 표시
- **네비게이션**: 좌/우 화살표, 하단 인디케이터 클릭으로 이동 가능
- **키보드**: 좌/우 방향키로 이동, `ESC`로 닫기
- **오버레이**: 배경 그래프가 보이도록 투명도 낮은 dim + 약한 blur 적용
- **컨테이너 크기**: `max-w` / `max-h`로 팝업 크기 조절 (현재 1300x900)
- **스크롤 페이드**: 스크롤 내용이 잘릴 때만 해당 방향에 얇은 페이드 마스크를 적용
  - `useScrollFade` 훅이 스크롤 시작/끝 여부를 계산
  - `buildFadeStyle`이 axis(x/y) 기반 마스크 스타일을 생성

**인터랙션**
- `onClose`: 닫기 버튼/ESC/배경 클릭으로 호출되는 콜백
- `onClusterClick`: 클러스터 카드 클릭 시 상위에서 줌 처리 등을 연결할 수 있음

**레이아웃 구조 요약**
- `Backdrop Overlay` → dim/blur 적용
- `Summary Panel` → 중앙 정렬 컨테이너
- `Slides Container` → 좌우 슬라이드 영역
- 각 슬라이드 내부에서 가로/세로 스크롤 영역이 존재

**커스터마이즈 포인트**
- 팝업 크기 조절: `GraphSummaryPanel.tsx`의 컨테이너 `max-w-[1300px] max-h-[900px]`
- dim/blur 강도: Backdrop의 `bg-black/10`, `backdrop-blur-[1px]` 값을 수정
- 페이드 두께: `FADE_SIZE`(현재 12) 값을 변경
- 페이드 민감도: `useScrollFade` 내부의 임계값(현재 `> 1`, `< max - 1`)

**데이터 소스**
- 현재는 `@/constants/DUMMY_GRAPH_SUMMARY`의 더미 데이터를 사용
- 실제 데이터 연결 시 동일한 구조로 교체 필요

**유의 사항**
- 페이드는 마스크 기반이므로 브라우저별 렌더링 차이가 있을 수 있음
- Summary 패널은 오버레이로 떠 있으므로 부모 레이아웃 z-index 충돌에 유의
