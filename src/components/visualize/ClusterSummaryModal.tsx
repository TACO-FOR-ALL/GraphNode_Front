import { FiX, FiActivity, FiHash, FiMessageCircle, FiTrendingUp, FiLink, FiStar } from "react-icons/fi";
import type { ClusterAnalysis, ClusterConnection, Recommendation } from "@/types/GraphSummary";

interface ClusterSummaryModalProps {
  cluster: ClusterAnalysis;
  connections: ClusterConnection[];
  recommendations: Recommendation[];
  onClose: () => void;
}

// 활동 상태 라벨 및 색상
const RECENCY_CONFIG = {
  active: { label: "활발", color: "bg-green-500/20 text-green-600" },
  dormant: { label: "휴면", color: "bg-yellow-500/20 text-yellow-600" },
  new: { label: "새로움", color: "bg-blue-500/20 text-blue-600" },
  unknown: { label: "알 수 없음", color: "bg-gray-500/20 text-gray-600" },
};

// 추천 타입 라벨 및 색상
const RECOMMENDATION_CONFIG = {
  consolidate: { label: "통합", color: "bg-purple-500/20 text-purple-600", icon: "📦" },
  explore: { label: "탐색", color: "bg-blue-500/20 text-blue-600", icon: "🔍" },
  review: { label: "검토", color: "bg-yellow-500/20 text-yellow-600", icon: "📝" },
  connect: { label: "연결", color: "bg-green-500/20 text-green-600", icon: "🔗" },
};

export default function ClusterSummaryModal({
  cluster,
  connections,
  recommendations,
  onClose,
}: ClusterSummaryModalProps) {
  const recencyConfig = RECENCY_CONFIG[cluster.recency];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-bg-primary rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-6 border-b border-base-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${recencyConfig.color}`}>
                  {recencyConfig.label}
                </span>
                <span className="text-xs text-text-tertiary">
                  {cluster.size}개 대화
                </span>
              </div>
              <h2 className="text-xl font-bold text-text-primary">{cluster.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
            >
              <FiX size={20} className="text-text-secondary" />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 인사이트 */}
          <div>
            <p className="text-sm text-text-secondary leading-relaxed">
              {cluster.insight_text}
            </p>
          </div>

          {/* 통계 그리드 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-bg-tertiary/50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <FiActivity size={14} className="text-primary" />
                <span className="text-xs text-text-tertiary">밀도</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">
                {Math.round(cluster.density * 100)}%
              </p>
            </div>
            <div className="p-3 bg-bg-tertiary/50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <FiTrendingUp size={14} className="text-node-focus" />
                <span className="text-xs text-text-tertiary">중심성</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">
                {Math.round(cluster.centrality * 100)}%
              </p>
            </div>
            <div className="p-3 bg-bg-tertiary/50 rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <FiMessageCircle size={14} className="text-green-500" />
                <span className="text-xs text-text-tertiary">대화 수</span>
              </div>
              <p className="text-lg font-semibold text-text-primary">
                {cluster.size}
              </p>
            </div>
          </div>

          {/* 키워드 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FiHash size={14} className="text-text-tertiary" />
              <h3 className="text-sm font-medium text-text-primary">주요 키워드</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {cluster.top_keywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          {/* 주요 테마 */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-3">주요 테마</h3>
            <div className="space-y-2">
              {cluster.key_themes.map((theme, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-bg-tertiary/30 rounded-lg"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-sm text-text-secondary">{theme}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 일반적인 질문 유형 */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-3">일반적인 질문 유형</h3>
            <div className="flex flex-wrap gap-2">
              {cluster.common_question_types.map((type, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 bg-bg-tertiary text-text-secondary rounded-lg"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* 연결된 클러스터 */}
          {connections.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FiLink size={14} className="text-text-tertiary" />
                <h3 className="text-sm font-medium text-text-primary">연결된 클러스터</h3>
              </div>
              <div className="space-y-3">
                {connections.map((conn, idx) => {
                  const otherCluster =
                    conn.source_cluster === cluster.name
                      ? conn.target_cluster
                      : conn.source_cluster;
                  return (
                    <div key={idx} className="p-3 bg-bg-tertiary/30 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-text-primary">
                          {otherCluster}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${conn.connection_strength * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-tertiary">
                            {Math.round(conn.connection_strength * 100)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-text-tertiary mb-2">{conn.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {conn.bridge_keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 bg-node-focus/10 text-node-focus rounded"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 관련 추천 */}
          {recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FiStar size={14} className="text-text-tertiary" />
                <h3 className="text-sm font-medium text-text-primary">관련 추천</h3>
              </div>
              <div className="space-y-2">
                {recommendations.map((rec, idx) => {
                  const config = RECOMMENDATION_CONFIG[rec.type];
                  return (
                    <div key={idx} className="p-3 bg-bg-tertiary/30 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.color}`}>
                          {config.icon} {config.label}
                        </span>
                        <span className="text-sm font-medium text-text-primary">
                          {rec.title}
                        </span>
                      </div>
                      <p className="text-xs text-text-tertiary">{rec.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t border-base-border bg-bg-secondary/30">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
