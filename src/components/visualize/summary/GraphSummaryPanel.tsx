import { useState, useEffect } from "react";
import { DUMMY_GRAPH_SUMMARY } from "@/constants/DUMMY_GRAPH_SUMMARY";
import OverviewCard from "./OverviewCard";
import ClusterCard from "./ClusterCard";
import PatternItem from "./PatternItem";
import ConnectionItem from "./ConnectionItem";
import RecommendationCard from "./RecommendationCard";

// Section Header Component
function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
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
}

export default function GraphSummaryPanel({ onClusterClick }: GraphSummaryPanelProps) {
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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative w-full h-screen bg-bg-primary overflow-hidden">
      {/* Navigation Arrows */}
      <button
        onClick={goToPrevSlide}
        className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-bg-secondary border border-base-border hover:bg-bg-tertiary hover:border-primary/50 transition-all duration-200 flex items-center justify-center group"
        aria-label="Previous slide"
      >
        <svg
          className="w-6 h-6 text-text-secondary group-hover:text-primary transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={goToNextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-bg-secondary border border-base-border hover:bg-bg-tertiary hover:border-primary/50 transition-all duration-200 flex items-center justify-center group"
        aria-label="Next slide"
      >
        <svg
          className="w-6 h-6 text-text-secondary group-hover:text-primary transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
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
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
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
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin">
              {summary.recommendations.map((rec, idx) => (
                <RecommendationCard key={idx} recommendation={rec} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-2">
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
                  : "w-8 bg-bg-tertiary group-hover:bg-text-secondary"
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
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center text-xs text-text-secondary z-20">
        <p>생성: {new Date(summary.generated_at).toLocaleString("ko-KR")} · {summary.detail_level}</p>
      </div>
    </div>
  );
}
