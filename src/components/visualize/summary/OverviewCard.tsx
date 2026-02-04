import { OverviewSection } from "@/types/GraphSummary";

interface OverviewCardProps {
  overview: OverviewSection;
}

export default function OverviewCard({ overview }: OverviewCardProps) {
  return (
    <div className="w-full bg-bg-secondary border border-base-border rounded-lg p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">📊</span>
        <h2 className="text-xl font-bold text-text-primary">그래프 개요</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Total Conversations */}
        <div className="bg-bg-primary border border-base-border rounded-md p-4">
          <p className="text-sm text-text-secondary mb-1">전체 대화</p>
          <p className="text-3xl font-bold text-primary">
            {overview.total_conversations}
          </p>
        </div>

        {/* Time Span */}
        {overview.time_span && overview.time_span !== "N/A" && (
          <div className="bg-bg-primary border border-base-border rounded-md p-4">
            <p className="text-sm text-text-secondary mb-1">기간</p>
            <p className="text-base font-semibold text-text-primary">
              {overview.time_span}
            </p>
          </div>
        )}

        {/* Most Active Period */}
        {overview.most_active_period &&
          overview.most_active_period !== "N/A" && (
            <div className="bg-bg-primary border border-base-border rounded-md p-4">
              <p className="text-sm text-text-secondary mb-1">
                가장 활발한 시간
              </p>
              <p className="text-base font-semibold text-text-primary">
                {overview.most_active_period}
              </p>
            </div>
          )}
      </div>

      {/* Conversation Style */}
      <div className="mb-4">
        <p className="text-sm text-text-secondary mb-2">대화 스타일</p>
        <span className="inline-block px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium">
          {overview.conversation_style}
        </span>
      </div>

      {/* Primary Interests */}
      <div className="mb-6">
        <p className="text-sm text-text-secondary mb-2">주요 관심사</p>
        <div className="flex flex-wrap gap-2">
          {overview.primary_interests.map((interest, idx) => (
            <span
              key={idx}
              className="inline-block px-3 py-1 bg-bg-tertiary border border-base-border rounded-md text-sm text-text-primary"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>

      {/* Summary Text */}
      <div>
        <p className="text-sm text-text-secondary mb-2">요약</p>
        <p className="text-sm text-text-primary leading-relaxed">
          {overview.summary_text}
        </p>
      </div>
    </div>
  );
}
