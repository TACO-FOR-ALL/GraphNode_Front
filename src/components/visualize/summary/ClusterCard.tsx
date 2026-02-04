import { ClusterAnalysis } from "@/types/GraphSummary";

interface ClusterCardProps {
  cluster: ClusterAnalysis;
  onClick?: () => void;
}

// Helper component for progress bars
function ProgressBar({ value, label }: { value: number; label: string }) {
  const percentage = Math.round(value * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs font-medium text-text-primary">
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-bg-tertiary rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Helper to get recency badge styles
function getRecencyStyles(recency: string) {
  switch (recency) {
    case "active":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "dormant":
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    case "new":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
}

// Helper to get recency label
function getRecencyLabel(recency: string) {
  switch (recency) {
    case "active":
      return "활성";
    case "dormant":
      return "휴면";
    case "new":
      return "신규";
    default:
      return "알 수 없음";
  }
}

export default function ClusterCard({ cluster, onClick }: ClusterCardProps) {
  return (
    <div
      className="flex-shrink-0 w-80 bg-bg-secondary border border-base-border rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-200"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-text-primary mb-1">{cluster.name}</h3>
          <p className="text-sm text-text-secondary">{cluster.size}개 대화</p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium border rounded-full ${getRecencyStyles(cluster.recency)}`}
        >
          {getRecencyLabel(cluster.recency)}
        </span>
      </div>

      {/* Progress Bars */}
      <div className="space-y-3 mb-4">
        <ProgressBar value={cluster.density} label="밀도 (Density)" />
        <ProgressBar value={cluster.centrality} label="중심성 (Centrality)" />
      </div>

      {/* Top Keywords */}
      <div className="mb-4">
        <p className="text-xs text-text-secondary mb-2">주요 키워드</p>
        <div className="flex flex-wrap gap-1">
          {cluster.top_keywords.slice(0, 5).map((keyword, idx) => (
            <span
              key={idx}
              className="inline-block px-2 py-0.5 bg-bg-tertiary border border-base-border rounded text-xs text-text-primary"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>

      {/* Insight Text */}
      <div>
        <p className="text-xs text-text-secondary mb-1">인사이트</p>
        <p className="text-xs text-text-primary leading-relaxed line-clamp-3">
          {cluster.insight_text}
        </p>
      </div>
    </div>
  );
}
