import { Pattern, PatternType, Significance } from "@/types/GraphSummary";

interface PatternItemProps {
  pattern: Pattern;
}

// Helper to get pattern type icon
function getPatternIcon(patternType: PatternType): string {
  switch (patternType) {
    case "repetition":
      return "🔄";
    case "progression":
      return "📈";
    case "gap":
      return "⚠️";
    case "bridge":
      return "🔗";
    default:
      return "🔍";
  }
}

// Helper to get pattern type label
function getPatternLabel(patternType: PatternType): string {
  switch (patternType) {
    case "repetition":
      return "반복 패턴";
    case "progression":
      return "진행 패턴";
    case "gap":
      return "공백 패턴";
    case "bridge":
      return "브릿지 패턴";
    default:
      return "기타 패턴";
  }
}

// Helper to get significance badge styles
function getSignificanceStyles(significance: Significance): string {
  switch (significance) {
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

// Helper to get significance label
function getSignificanceLabel(significance: Significance): string {
  switch (significance) {
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

export default function PatternItem({ pattern }: PatternItemProps) {
  return (
    <div className="bg-bg-secondary border border-base-border rounded-lg p-4 hover:border-primary/30 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{getPatternIcon(pattern.pattern_type)}</span>
          <span className="text-sm font-semibold text-text-primary">
            {getPatternLabel(pattern.pattern_type)}
          </span>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium border rounded-full ${getSignificanceStyles(pattern.significance)}`}
        >
          {getSignificanceLabel(pattern.significance)}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-text-primary leading-relaxed mb-3">
        {pattern.description}
      </p>

      {/* Evidence Count */}
      {pattern.evidence && pattern.evidence.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-text-secondary">
          <span>📌</span>
          <span>{pattern.evidence.length}개의 증거</span>
        </div>
      )}
    </div>
  );
}
