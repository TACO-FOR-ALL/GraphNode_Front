import { useState, useEffect, useRef, useCallback } from "react";
import { DUMMY_GRAPH_SUMMARY } from "@/constants/DUMMY_GRAPH_SUMMARY";
import OverviewCard from "./OverviewCard";
import ClusterCard from "./ClusterCard";
import PatternItem from "./PatternItem";
import ConnectionItem from "./ConnectionItem";
import RecommendationCard from "./RecommendationCard";

// Section Header Component
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

export default function GraphSummaryPanel({
  onClusterClick,
  onClose,
}: GraphSummaryPanelProps) {
  const summary = DUMMY_GRAPH_SUMMARY;
  const [currentSlide, setCurrentSlide] = useState(0);

  // Define slides
  const slides = [
    { id: "overview", name: "개요" },
    { id: "clusters", name: "클러스터" },
    { id: "patterns", name: "패턴" },
    { id: "connections", name: "연결" },
    { id: "recommendations", name: "추천" },
  ];

  const totalSlides = slides.length;

  const fadeSize = 12;

  const edgeFadeX = (fadeStart: boolean, fadeEnd: boolean) => ({
    WebkitMaskImage: `linear-gradient(to right, ${
      fadeStart ? "transparent" : "black"
    } 0px, black ${fadeSize}px, black calc(100% - ${fadeSize}px), ${
      fadeEnd ? "transparent" : "black"
    } 100%)`,
    maskImage: `linear-gradient(to right, ${
      fadeStart ? "transparent" : "black"
    } 0px, black ${fadeSize}px, black calc(100% - ${fadeSize}px), ${
      fadeEnd ? "transparent" : "black"
    } 100%)`,
  });

  const edgeFadeY = (fadeStart: boolean, fadeEnd: boolean) => ({
    WebkitMaskImage: `linear-gradient(to bottom, ${
      fadeStart ? "transparent" : "black"
    } 0px, black ${fadeSize}px, black calc(100% - ${fadeSize}px), ${
      fadeEnd ? "transparent" : "black"
    } 100%)`,
    maskImage: `linear-gradient(to bottom, ${
      fadeStart ? "transparent" : "black"
    } 0px, black ${fadeSize}px, black calc(100% - ${fadeSize}px), ${
      fadeEnd ? "transparent" : "black"
    } 100%)`,
  });

  const useScrollFade = (axis: "x" | "y") => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [fade, setFade] = useState({ start: false, end: false });

    const update = useCallback(() => {
      const el = ref.current;
      if (!el) return;
      if (axis === "x") {
        const max = el.scrollWidth - el.clientWidth;
        setFade({
          start: el.scrollLeft > 1,
          end: el.scrollLeft < max - 1,
        });
      } else {
        const max = el.scrollHeight - el.clientHeight;
        setFade({
          start: el.scrollTop > 1,
          end: el.scrollTop < max - 1,
        });
      }
    }, [axis]);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      update();
      const onScroll = () => update();
      el.addEventListener("scroll", onScroll, { passive: true });
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

  const clustersFade = useScrollFade("x");
  const patternsFade = useScrollFade("y");
  const connectionsFade = useScrollFade("y");
  const recommendationsFade = useScrollFade("y");

  // Navigation functions
  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Keyboard navigation
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
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Summary Panel */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto p-4 sm:p-6 md:p-8 lg:p-12">
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

            {/* Slides Container */}
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
                <div
                  ref={clustersFade.ref}
                  className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
                  style={edgeFadeX(clustersFade.fade.start, clustersFade.fade.end)}
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
                <div
                  ref={patternsFade.ref}
                  className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin"
                  style={edgeFadeY(patternsFade.fade.start, patternsFade.fade.end)}
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
                <div
                  ref={connectionsFade.ref}
                  className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin"
                  style={edgeFadeY(connectionsFade.fade.start, connectionsFade.fade.end)}
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
                <div
                  ref={recommendationsFade.ref}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin"
                  style={edgeFadeY(recommendationsFade.fade.start, recommendationsFade.fade.end)}
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
              {slides.map((slide, index) => (
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
