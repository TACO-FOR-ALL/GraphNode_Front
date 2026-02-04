import { Recommendation, RecommendationType, Priority } from "@/types/GraphSummary";

interface RecommendationCardProps {
  recommendation: Recommendation;
}

// Helper to get recommendation type icon
function getRecommendationIcon(type: RecommendationType): string {
  switch (type) {
    case "consolidate":
      return "📚";
    case "explore":
      return "🔍";
    case "review":
      return "📖";
    case "connect":
      return "🔗";
    default:
      return "💡";
  }
}

// Helper to get recommendation type label
function getRecommendationLabel(type: RecommendationType): string {
  switch (type) {
    case "consolidate":
      return "통합";
    case "explore":
      return "탐색";
    case "review":
      return "복습";
    case "connect":
      return "연결";
    default:
      return "제안";
  }
}

// Helper to get priority badge styles
function getPriorityStyles(priority: Priority): string {
  switch (priority) {
    case "high":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "medium":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "low":
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
}

// Helper to get priority label
function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case "high":
      return "높음";
    case "medium":
      return "중간";
    case "low":
      return "낮음";
    default:
      return "알 수 없음";
  }
}

export default function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const isHighPriority = recommendation.priority === "high";

  return (
    <div
      className={`bg-bg-secondary border rounded-lg p-4 hover:shadow-md transition-all duration-200 ${
        isHighPriority
          ? "border-red-500/40 ring-1 ring-red-500/20"
          : "border-base-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getRecommendationIcon(recommendation.type)}</span>
          <span className="text-xs font-medium text-text-secondary">
            {getRecommendationLabel(recommendation.type)}
          </span>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium border rounded-full ${getPriorityStyles(recommendation.priority)}`}
        >
          {getPriorityLabel(recommendation.priority)}
        </span>
      </div>

      {/* Title */}
      <h4 className="font-bold text-text-primary mb-2 leading-snug">
        {recommendation.title}
      </h4>

      {/* Description */}
      <p className="text-sm text-text-primary leading-relaxed mb-3">
        {recommendation.description}
      </p>

      {/* Related Nodes Count */}
      {recommendation.related_nodes && recommendation.related_nodes.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <span>📌</span>
          <span>{recommendation.related_nodes.length}개 관련 대화</span>
        </div>
      )}
    </div>
  );
}
