import { ClusterConnection } from "@/types/GraphSummary";

interface ConnectionItemProps {
  connection: ClusterConnection;
}

export default function ConnectionItem({ connection }: ConnectionItemProps) {
  const percentage = Math.round(connection.connection_strength * 100);

  return (
    <div className="bg-bg-secondary border border-base-border rounded-lg p-4 hover:border-primary/30 transition-colors duration-200">
      {/* Cluster Connection Header */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-sm font-semibold text-text-primary truncate max-w-[40%]">
          {connection.source_cluster}
        </span>
        <span className="text-lg">↔</span>
        <span className="text-sm font-semibold text-text-primary truncate max-w-[40%]">
          {connection.target_cluster}
        </span>
      </div>

      {/* Connection Strength Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-secondary">연결 강도</span>
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

      {/* Bridge Keywords */}
      {connection.bridge_keywords && connection.bridge_keywords.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-text-secondary mb-2">브릿지 키워드</p>
          <div className="flex flex-wrap gap-1">
            {connection.bridge_keywords.map((keyword, idx) => (
              <span
                key={idx}
                className="inline-block px-2 py-0.5 bg-bg-tertiary border border-base-border rounded text-xs text-text-primary"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {connection.description && (
        <p className="text-xs text-text-primary leading-relaxed">
          {connection.description}
        </p>
      )}
    </div>
  );
}
