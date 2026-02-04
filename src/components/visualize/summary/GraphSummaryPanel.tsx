import { useState, useEffect, useRef, useCallback } from "react";
import { DUMMY_GRAPH_SUMMARY } from "@/constants/DUMMY_GRAPH_SUMMARY";
import OverviewCard from "./OverviewCard";
import ClusterCard from "./ClusterCard";
import PatternItem from "./PatternItem";
import ConnectionItem from "./ConnectionItem";
import RecommendationCard from "./RecommendationCard";

type FadeState = { start: boolean; end: boolean };

// 요약 화면 내 슬라이드 정의 (순서가 곧 네비게이션 순서)
const SLIDES = [
  { id: "overview", name: "개요" },
  { id: "clusters", name: "클러스터" },
  { id: "patterns", name: "패턴" },
  { id: "connections", name: "연결" },
  { id: "recommendations", name: "추천" },
] as const;

// 페이드 마스크의 두께(px). 스크롤 경계가 잘릴 때만 적용됨
const FADE_SIZE = 12;

/** 스크롤 경계가 잘릴 때만 페이드가 보이도록 마스크를 생성 */
const buildFadeStyle = (axis: "x" | "y", fade: FadeState) => {
  const direction = axis === "x" ? "to right" : "to bottom";
  const gradient = `linear-gradient(${direction}, ${
    fade.start ? "transparent" : "black"
  } 0px, black ${FADE_SIZE}px, black calc(100% - ${FADE_SIZE}px), ${
    fade.end ? "transparent" : "black"
  } 100%)`;

  return {
    WebkitMaskImage: gradient,
    maskImage: gradient,
  };
};

/**
 * 스크롤 위치를 관찰해 시작/끝 페이드 여부를 계산
 * - start: 스크롤이 시작 방향(왼쪽/위)에서 이미 이동했는지
 * - end: 스크롤이 끝 방향(오른쪽/아래)에 아직 남았는지
 */
const useScrollFade = (axis: "x" | "y") => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [fade, setFade] = useState<FadeState>({ start: false, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    if (axis === "x") {
      const max = el.scrollWidth - el.clientWidth;
      setFade({
        start: el.scrollLeft > 1,
        end: el.scrollLeft < max - 1,
      });
      return;
    }

    const max = el.scrollHeight - el.clientHeight;
    setFade({
      start: el.scrollTop > 1,
      end: el.scrollTop < max - 1,
    });
  }, [axis]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    update();

    const onScroll = () => update();
    el.addEventListener("scroll", onScroll, { passive: true });

    // 컨텐츠 크기 변경(리사이즈)에도 페이드 상태가 업데이트되도록 옵저버 등록
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(update)
        : null;
    if (ro) ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (ro) ro.disconnect();
    };
  }, [update]);

  return { ref, fade };
};

// 섹션 제목 컴포넌트
function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
        {subtitle && (
          <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

interface GraphSummaryPanelProps {
  onClusterClick?: (clusterId: string) => void;
  onClose?: () => void;
}

/** 그래프 위에 얹히는 요약 팝업(배경 그래프가 보이도록 투명 처리) */
export default function GraphSummaryPanel({
  onClusterClick,
  onClose,
}: GraphSummaryPanelProps) {
  const summary = DUMMY_GRAPH_SUMMARY;
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = SLIDES.length;

  // 각 스크롤 영역별 페이드 상태
  const clustersFade = useScrollFade("x");
  const patternsFade = useScrollFade("y");
  const connectionsFade = useScrollFade("y");
  const recommendationsFade = useScrollFade("y");

  const clustersFadeStyle = buildFadeStyle("x", clustersFade.fade);
  const patternsFadeStyle = buildFadeStyle("y", patternsFade.fade);
  const connectionsFadeStyle = buildFadeStyle("y", connectionsFade.fade);
  const recommendationsFadeStyle = buildFadeStyle(
    "y",
    recommendationsFade.fade
  );

  // 슬라이드 이동
  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // 키보드 네비게이션 (좌/우, ESC 닫기)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevSlide();
      } else if (e.key === "ArrowRight") {
        goToNextSlide();
      } else if (e.key === "Escape" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Backdrop Overlay: 배경 그래프가 보이도록 약한 dim + 최소 blur */}
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Summary Panel: 중앙 정렬 팝업 컨테이너 */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto p-4 sm:p-6 md:p-8 lg:p-12">
          {/* 실제 컨텐츠 영역 (크기 조절은 max-w/max-h) */}
          <div className="relative w-full h-full max-w-[1300px] max-h-[900px] overflow-hidden rounded-2xl backdrop-blur-[1px]">
            {/* Close Button */}
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-bg-secondary/80 backdrop-blur-md border border-base-border hover:bg-bg-tertiary hover:border-red-500/50 transition-all duration-200 flex items-center justify-center group"
                aria-label="Close summary"
              >
                <svg
                  className="w-5 h-5 text-text-secondary group-hover:text-red-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}

            {/* Navigation Arrows */}
            <button
              onClick={goToPrevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-bg-secondary/80 backdrop-blur-md border border-base-border hover:bg-bg-tertiary hover:border-primary/50 transition-all duration-200 flex items-center justify-center group"
              aria-label="Previous slide"
            >
              <svg
                className="w-6 h-6 text-text-secondary group-hover:text-primary transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              onClick={goToNextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-bg-secondary/80 backdrop-blur-md border border-base-border hover:bg-bg-tertiary hover:border-primary/50 transition-all duration-200 flex items-center justify-center group"
              aria-label="Next slide"
            >
              <svg
                className="w-6 h-6 text-text-secondary group-hover:text-primary transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Slides Container: 좌우 슬라이드 전환 영역 */}
            <div
              className="flex h-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {/* Slide 0: Overview */}
              <div className="min-w-full h-full flex items-center justify-center p-8">
                <div className="max-w-4xl w-full">
                  <OverviewCard overview={summary.overview} />
                </div>
              </div>

              {/* Slide 1: Clusters */}
              <div className="min-w-full h-full flex flex-col items-center justify-center p-8">
                <div className="max-w-6xl w-full">
                  <SectionHeader
                    icon="🎯"
                    title="클러스터 분석"
                    subtitle={`${summary.clusters.length}개의 주제 그룹`}
                  />
                  {/* 가로 스크롤: 잘릴 때만 가장자리에 페이드 */}
                  <div
                    ref={clustersFade.ref}
                    className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
                    style={clustersFadeStyle}
                  >
                    {summary.clusters.map((cluster) => (
                      <ClusterCard
                        key={cluster.cluster_id}
                        cluster={cluster}
                        onClick={() => onClusterClick?.(cluster.cluster_id)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Slide 2: Patterns */}
              <div className="min-w-full h-full flex flex-col items-center justify-center p-8">
                <div className="max-w-4xl w-full">
                  <SectionHeader
                    icon="🔍"
                    title="발견된 패턴"
                    subtitle={`${summary.patterns.length}개의 인사이트`}
                  />
                  {/* 세로 스크롤: 잘릴 때만 가장자리에 페이드 */}
                  <div
                    ref={patternsFade.ref}
                    className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin"
                    style={patternsFadeStyle}
                  >
                    {summary.patterns.map((pattern, idx) => (
                      <PatternItem key={idx} pattern={pattern} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Slide 3: Connections */}
              <div className="min-w-full h-full flex flex-col items-center justify-center p-8">
                <div className="max-w-4xl w-full">
                  <SectionHeader
                    icon="🔗"
                    title="클러스터 연결"
                    subtitle={`${summary.connections.length}개의 연결 고리`}
                  />
                  {/* 세로 스크롤: 잘릴 때만 가장자리에 페이드 */}
                  <div
                    ref={connectionsFade.ref}
                    className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin"
                    style={connectionsFadeStyle}
                  >
                    {summary.connections.map((connection, idx) => (
                      <ConnectionItem key={idx} connection={connection} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Slide 4: Recommendations */}
              <div className="min-w-full h-full flex flex-col items-center justify-center p-8">
                <div className="max-w-5xl w-full">
                  <SectionHeader
                    icon="💡"
                    title="추천 액션"
                    subtitle={`${summary.recommendations.length}개의 제안사항`}
                  />
                  {/* 세로 스크롤(2열 그리드): 잘릴 때만 가장자리에 페이드 */}
                  <div
                    ref={recommendationsFade.ref}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin"
                    style={recommendationsFadeStyle}
                  >
                    {summary.recommendations.map((rec, idx) => (
                      <RecommendationCard key={idx} recommendation={rec} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Slide Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(index)}
                  className="group flex flex-col items-center gap-1"
                  aria-label={`Go to ${slide.name}`}
                >
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === currentSlide
                        ? "w-12 bg-primary"
                        : "w-8 bg-bg-tertiary/60 group-hover:bg-text-secondary"
                    }`}
                  />
                  <span
                    className={`text-xs transition-colors duration-200 ${
                      index === currentSlide
                        ? "text-primary font-medium"
                        : "text-text-secondary group-hover:text-text-primary"
                    }`}
                  >
                    {slide.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Footer Info */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center text-xs text-text-secondary z-20 bg-bg-secondary/60 backdrop-blur-sm px-4 py-2 rounded-full border border-base-border">
              <p>
                생성: {new Date(summary.generated_at).toLocaleString("ko-KR")} ·{" "}
                {summary.detail_level}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
