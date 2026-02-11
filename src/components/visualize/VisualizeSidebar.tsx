import { useState } from "react";
import {
  FiChevronRight,
  FiChevronDown,
  FiCircle,
  FiLayers,
  FiInfo,
  FiActivity,
  FiMessageCircle,
  FiZap,
  FiStar,
} from "react-icons/fi";
import { GraphSnapshotDto } from "node_modules/@taco_tsinghua/graphnode-sdk/dist/types/graph";
import SideExpandPanelIcon from "@/assets/icons/panel.svg";
import { Subcluster } from "@/types/GraphData";
import { DUMMY_GRAPH_SUMMARY } from "@/constants/DUMMY_GRAPH_SUMMARY";

// 패턴 타입 라벨 및 색상
const PATTERN_CONFIG = {
  repetition: {
    label: "반복",
    color: "bg-yellow-500/20 text-yellow-600",
    icon: "🔄",
  },
  progression: {
    label: "진행",
    color: "bg-green-500/20 text-green-600",
    icon: "📈",
  },
  gap: { label: "공백", color: "bg-red-500/20 text-red-600", icon: "⚠️" },
  bridge: { label: "연결", color: "bg-blue-500/20 text-blue-600", icon: "🔗" },
};

// 추천 타입 라벨 및 색상
const RECOMMENDATION_CONFIG = {
  consolidate: {
    label: "통합",
    color: "bg-purple-500/20 text-purple-600",
    icon: "📦",
  },
  explore: { label: "탐색", color: "bg-blue-500/20 text-blue-600", icon: "🔍" },
  review: {
    label: "검토",
    color: "bg-yellow-500/20 text-yellow-600",
    icon: "📝",
  },
  connect: {
    label: "연결",
    color: "bg-green-500/20 text-green-600",
    icon: "🔗",
  },
};

// 우선순위 색상
const PRIORITY_CONFIG = {
  high: "text-red-500",
  medium: "text-yellow-500",
  low: "text-green-500",
};

interface VisualizeSidebarProps {
  graphData: GraphSnapshotDto;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  onNodeFocus?: (nodeId: number) => void;
  focusedNodeId?: number | null;
  subclusters: Subcluster[];
  expandedSubclusters: Set<string>;
  onToggleSubcluster: (subclusterId: string) => void;
}

interface SubclusterGroup {
  subcluster: Subcluster;
  nodes: Array<{
    id: number;
    origId: string;
    numMessages: number;
  }>;
}

interface ClusterGroup {
  clusterName: string;
  clusterId: string;
  subclusters: SubclusterGroup[];
  standaloneNodes: Array<{
    id: number;
    origId: string;
    numMessages: number;
  }>;
  totalNodeCount: number;
}

export default function VisualizeSidebar({
  graphData,
  isExpanded,
  setIsExpanded,
  onNodeFocus,
  focusedNodeId,
  subclusters,
  expandedSubclusters,
  onToggleSubcluster,
}: VisualizeSidebarProps) {
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    new Set(),
  );
  const [expandedSidebarSubclusters, setExpandedSidebarSubclusters] = useState<
    Set<string>
  >(new Set());
  const [isOverviewTextExpanded, setIsOverviewTextExpanded] = useState(false);
  const [isOverviewSectionExpanded, setIsOverviewSectionExpanded] =
    useState(true);
  const [isGraphStructureExpanded, setIsGraphStructureExpanded] =
    useState(false);
  const [isPatternsExpanded, setIsPatternsExpanded] = useState(false);
  const [isRecommendationsExpanded, setIsRecommendationsExpanded] =
    useState(false);

  // 노드가 어떤 subcluster에 속하는지 맵핑
  const nodeToSubclusterMap = new Map<number, Subcluster>();
  subclusters.forEach((sc) => {
    sc.node_ids.forEach((nodeId) => {
      nodeToSubclusterMap.set(nodeId, sc);
    });
  });

  // 클러스터별로 노드 그룹화 (subcluster 계층 포함)
  const clusterGroups: ClusterGroup[] = [];
  const clusterMap = new Map<string, ClusterGroup>();

  graphData.nodes.forEach((node) => {
    const clusterId = node.clusterId;
    const clusterName = node.clusterName;

    if (!clusterMap.has(clusterId)) {
      const group: ClusterGroup = {
        clusterName,
        clusterId,
        subclusters: [],
        standaloneNodes: [],
        totalNodeCount: 0,
      };
      clusterMap.set(clusterId, group);
      clusterGroups.push(group);
    }

    const cluster = clusterMap.get(clusterId)!;
    cluster.totalNodeCount++;

    const subcluster = nodeToSubclusterMap.get(node.id);
    if (subcluster) {
      // subcluster에 속하는 노드
      let scGroup = cluster.subclusters.find(
        (sg) => sg.subcluster.id === subcluster.id,
      );
      if (!scGroup) {
        scGroup = { subcluster, nodes: [] };
        cluster.subclusters.push(scGroup);
      }
      scGroup.nodes.push({
        id: node.id,
        origId: node.origId,
        numMessages: node.numMessages,
      });
    } else {
      // 독립 노드
      cluster.standaloneNodes.push({
        id: node.id,
        origId: node.origId,
        numMessages: node.numMessages,
      });
    }
  });

  // 클러스터 이름순 정렬
  clusterGroups.sort((a, b) => a.clusterName.localeCompare(b.clusterName));

  const toggleCluster = (clusterId: string) => {
    setExpandedClusters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(clusterId)) {
        newSet.delete(clusterId);
      } else {
        newSet.add(clusterId);
      }
      return newSet;
    });
  };

  const toggleSidebarSubcluster = (subclusterId: string) => {
    setExpandedSidebarSubclusters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subclusterId)) {
        newSet.delete(subclusterId);
      } else {
        newSet.add(subclusterId);
      }
      return newSet;
    });
  };

  return (
    <div className="relative flex">
      {/* 사이드바 메인 영역 */}
      <div
        className={`bg-sidebar-expanded-background duration-300 transition-all ${
          isExpanded ? "w-[259px]" : "w-0"
        } flex flex-col h-full border-r border-base-border overflow-hidden`}
      >
        {/* 토글 버튼 (펼쳐진 상태에서만) */}
        <div className="flex px-3 py-4">
          <img
            onClick={() => setIsExpanded(false)}
            src={SideExpandPanelIcon}
            alt="side expand panel"
            className="w-4 h-4 ml-auto cursor-pointer hover:opacity-70 transition-opacity"
          />
        </div>

        {isExpanded && (
          <div className="flex-1 overflow-y-auto scroll-hidden flex flex-col px-3 pb-20">
            {/* Overview 섹션 */}
            <div className="mb-2">
              <div
                className="flex items-center gap-2 px-[6px] py-1.5 text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
                onClick={() =>
                  setIsOverviewSectionExpanded(!isOverviewSectionExpanded)
                }
              >
                {isOverviewSectionExpanded ? (
                  <FiChevronDown size={14} />
                ) : (
                  <FiChevronRight size={14} />
                )}
                <FiInfo size={14} />
                <span className="text-[13px] font-normal font-noto-sans-kr">
                  개요
                </span>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isOverviewSectionExpanded
                    ? "max-h-[1000px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-[6px] space-y-2 pt-1">
                  {/* 요약 텍스트 - 3줄로 제한하고 인라인 더보기 */}
                  <p className="text-[11px] text-text-tertiary leading-relaxed">
                    {isOverviewTextExpanded ? (
                      <>
                        {DUMMY_GRAPH_SUMMARY.overview.summary_text}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOverviewTextExpanded(false);
                          }}
                          className="text-[11px] text-text-tertiary hover:text-text-secondary transition-colors ml-0.5 underline"
                        >
                          접기
                        </span>
                      </>
                    ) : (
                      <>
                        {DUMMY_GRAPH_SUMMARY.overview.summary_text.slice(
                          0,
                          100,
                        )}
                        ...
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOverviewTextExpanded(true);
                          }}
                          className="text-[11px] text-text-tertiary hover:text-text-secondary transition-colors ml-0.5 underline"
                        >
                          더보기
                        </span>
                      </>
                    )}
                  </p>

                  {/* 주요 통계 */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="flex items-center gap-1.5 p-1.5 bg-bg-tertiary/50 rounded-lg">
                      <FiMessageCircle size={12} className="text-primary" />
                      <div>
                        <p className="text-[10px] text-text-tertiary">
                          대화 수
                        </p>
                        <p className="text-[12px] font-medium text-text-primary">
                          {DUMMY_GRAPH_SUMMARY.overview.total_conversations}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 bg-bg-tertiary/50 rounded-lg">
                      <FiActivity size={12} className="text-node-focus" />
                      <div>
                        <p className="text-[10px] text-text-tertiary">스타일</p>
                        <p className="text-[12px] font-medium text-text-primary">
                          {DUMMY_GRAPH_SUMMARY.overview.conversation_style}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 주요 관심사 - 전체 표시 */}
                  <div className="mb-1">
                    <p className="text-[10px] text-text-tertiary mb-1">
                      주요 관심사
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {DUMMY_GRAPH_SUMMARY.overview.primary_interests.map(
                        (interest, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full"
                          >
                            {interest}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-base-border mb-2" />

            {/* 그래프 구조 섹션 */}
            <div className="mb-2">
              <div
                className="flex items-center gap-2 px-[6px] py-1.5 text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
                onClick={() =>
                  setIsGraphStructureExpanded(!isGraphStructureExpanded)
                }
              >
                {isGraphStructureExpanded ? (
                  <FiChevronDown size={14} />
                ) : (
                  <FiChevronRight size={14} />
                )}
                <FiLayers size={14} />
                <span className="text-[13px] font-normal font-noto-sans-kr">
                  그래프 구조
                </span>
                <span className="text-[10px] text-text-tertiary ml-auto">
                  {clusterGroups.length}개 클러스터
                </span>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isGraphStructureExpanded
                    ? "max-h-[2000px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                {/* 트리 목록 */}
                <div className="pt-1 flex flex-col gap-[6px]">
                  {clusterGroups.map((cluster) => {
                    const isClusterExpanded = expandedClusters.has(
                      cluster.clusterId,
                    );

                    return (
                      <div key={cluster.clusterId}>
                        {/* 클러스터 헤더 */}
                        <div
                          className="text-[14px] font-normal flex items-center font-noto-sans-kr py-[5.5px] h-[32px] px-[6px] rounded-[6px] transition-colors duration-300 cursor-pointer hover:bg-sidebar-button-hover text-text-secondary hover:text-chatbox-active group"
                          onClick={() => toggleCluster(cluster.clusterId)}
                        >
                          {isClusterExpanded ? (
                            <FiChevronDown
                              size={14}
                              className="mr-2 flex-shrink-0"
                            />
                          ) : (
                            <FiChevronRight
                              size={14}
                              className="mr-2 flex-shrink-0"
                            />
                          )}
                          <div
                            className="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0"
                            style={{ backgroundColor: "var(--color-primary)" }}
                          />
                          <span className="truncate flex-1">
                            {cluster.clusterName}
                          </span>
                          <span className="text-xs text-text-tertiary ml-2">
                            {cluster.totalNodeCount}
                          </span>
                        </div>

                        {/* 클러스터 내용 - 애니메이션 */}
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isClusterExpanded
                              ? "max-h-[2000px] opacity-100"
                              : "max-h-0 opacity-0"
                          }`}
                        >
                          <div className="ml-4 mt-1 flex flex-col gap-[2px]">
                            {/* 중분류(Subcluster) 목록 */}
                            {cluster.subclusters.map((scGroup) => {
                              const isSidebarExpanded =
                                expandedSidebarSubclusters.has(
                                  scGroup.subcluster.id,
                                );
                              const isGraphExpanded = expandedSubclusters.has(
                                scGroup.subcluster.id,
                              );

                              return (
                                <div key={scGroup.subcluster.id}>
                                  {/* 중분류 헤더 */}
                                  <div
                                    className={`text-[13px] font-normal flex items-center font-noto-sans-kr py-[5px] h-[30px] px-[6px] rounded-[6px] transition-colors duration-300 cursor-pointer group ${
                                      isGraphExpanded
                                        ? "bg-node-focus/20 text-node-focus"
                                        : "hover:bg-sidebar-button-hover text-text-secondary hover:text-chatbox-active"
                                    }`}
                                    onClick={() => {
                                      // 사이드바와 그래프 모두 토글
                                      toggleSidebarSubcluster(
                                        scGroup.subcluster.id,
                                      );
                                      onToggleSubcluster(scGroup.subcluster.id);
                                    }}
                                  >
                                    {isSidebarExpanded ? (
                                      <FiChevronDown
                                        size={12}
                                        className="mr-2 flex-shrink-0"
                                      />
                                    ) : (
                                      <FiChevronRight
                                        size={12}
                                        className="mr-2 flex-shrink-0"
                                      />
                                    )}
                                    <div
                                      className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                                      style={{
                                        backgroundColor:
                                          "var(--color-node-focus)",
                                      }}
                                    />
                                    <span className="truncate flex-1 text-[12px]">
                                      {scGroup.subcluster.top_keywords[0] ||
                                        `중분류 ${scGroup.subcluster.id.slice(-4)}`}
                                    </span>
                                    <span className="text-[11px] text-text-tertiary ml-1">
                                      {scGroup.nodes.length}
                                    </span>
                                  </div>

                                  {/* 중분류 내 노드 목록 */}
                                  <div
                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                      isSidebarExpanded
                                        ? "max-h-[1000px] opacity-100"
                                        : "max-h-0 opacity-0"
                                    }`}
                                  >
                                    <div className="ml-4 mt-1 flex flex-col gap-[1px]">
                                      {scGroup.nodes.map((node) => {
                                        const isFocused =
                                          focusedNodeId === node.id;
                                        return (
                                          <div
                                            key={node.id}
                                            className={`text-[12px] font-normal flex items-center font-noto-sans-kr py-[4px] h-[28px] px-[6px] rounded-[6px] transition-colors duration-300 cursor-pointer group ${
                                              isFocused
                                                ? "bg-sidebar-button-hover text-chatbox-active"
                                                : "hover:bg-sidebar-button-hover text-text-tertiary hover:text-chatbox-active"
                                            }`}
                                            onClick={() =>
                                              onNodeFocus?.(node.id)
                                            }
                                          >
                                            <FiCircle
                                              size={6}
                                              className={`mr-2 flex-shrink-0 transition-colors duration-300 ${
                                                isFocused
                                                  ? "fill-primary text-primary"
                                                  : ""
                                              }`}
                                            />
                                            <span className="truncate flex-1">
                                              {node.origId.length > 10
                                                ? `${node.origId.slice(0, 10)}...`
                                                : node.origId}
                                            </span>
                                            <span className="text-[10px] text-text-tertiary ml-2">
                                              {node.numMessages}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {/* 독립 노드 (subcluster에 속하지 않는 노드) */}
                            {cluster.standaloneNodes.map((node) => {
                              const isFocused = focusedNodeId === node.id;
                              return (
                                <div
                                  key={node.id}
                                  className={`text-[13px] font-normal flex items-center font-noto-sans-kr py-[5px] h-[30px] px-[6px] rounded-[6px] transition-colors duration-300 cursor-pointer group ${
                                    isFocused
                                      ? "bg-sidebar-button-hover text-chatbox-active"
                                      : "hover:bg-sidebar-button-hover text-text-secondary hover:text-chatbox-active"
                                  }`}
                                  onClick={() => onNodeFocus?.(node.id)}
                                >
                                  <FiCircle
                                    size={7}
                                    className={`mr-2 flex-shrink-0 transition-colors duration-300 ${
                                      isFocused
                                        ? "fill-primary text-primary"
                                        : ""
                                    }`}
                                  />
                                  <span className="truncate flex-1">
                                    {node.origId.length > 12
                                      ? `${node.origId.slice(0, 12)}...`
                                      : node.origId}
                                  </span>
                                  <span className="text-xs text-text-tertiary ml-2">
                                    {node.numMessages}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-base-border mb-2" />

            {/* 패턴 섹션 */}
            <div className="mb-2">
              <div
                className="flex items-center gap-2 px-[6px] py-1.5 text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
                onClick={() => setIsPatternsExpanded(!isPatternsExpanded)}
              >
                {isPatternsExpanded ? (
                  <FiChevronDown size={14} />
                ) : (
                  <FiChevronRight size={14} />
                )}
                <FiZap size={14} />
                <span className="text-[13px] font-normal font-noto-sans-kr">
                  발견된 패턴
                </span>
                <span className="text-[10px] text-text-tertiary ml-auto">
                  {DUMMY_GRAPH_SUMMARY.patterns.length}
                </span>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isPatternsExpanded
                    ? "max-h-[1000px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-[6px] space-y-1.5 pt-1">
                  {DUMMY_GRAPH_SUMMARY.patterns.map((pattern, idx) => {
                    const config = PATTERN_CONFIG[pattern.pattern_type];
                    return (
                      <div
                        key={idx}
                        className="p-2 bg-bg-tertiary/30 rounded-lg"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${config.color}`}
                          >
                            {config.icon} {config.label}
                          </span>
                          <span
                            className={`text-[10px] ${
                              pattern.significance === "high"
                                ? "text-red-500"
                                : pattern.significance === "medium"
                                  ? "text-yellow-500"
                                  : "text-green-500"
                            }`}
                          >
                            {pattern.significance === "high"
                              ? "높음"
                              : pattern.significance === "medium"
                                ? "중간"
                                : "낮음"}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-tertiary leading-relaxed">
                          {pattern.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-base-border mb-2" />

            {/* 추천 섹션 */}
            <div className="mb-2">
              <div
                className="flex items-center gap-2 px-[6px] py-1.5 text-text-secondary cursor-pointer hover:text-text-primary transition-colors"
                onClick={() =>
                  setIsRecommendationsExpanded(!isRecommendationsExpanded)
                }
              >
                {isRecommendationsExpanded ? (
                  <FiChevronDown size={14} />
                ) : (
                  <FiChevronRight size={14} />
                )}
                <FiStar size={14} />
                <span className="text-[13px] font-normal font-noto-sans-kr">
                  추천 사항
                </span>
                <span className="text-[10px] text-text-tertiary ml-auto">
                  {DUMMY_GRAPH_SUMMARY.recommendations.length}
                </span>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isRecommendationsExpanded
                    ? "max-h-[1000px] opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="px-[6px] space-y-1.5 pt-1">
                  {DUMMY_GRAPH_SUMMARY.recommendations.map((rec, idx) => {
                    const config = RECOMMENDATION_CONFIG[rec.type];
                    return (
                      <div
                        key={idx}
                        className="p-2 bg-bg-tertiary/30 rounded-lg"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${config.color}`}
                          >
                            {config.icon} {config.label}
                          </span>
                          <span
                            className={`text-[10px] ${PRIORITY_CONFIG[rec.priority]}`}
                          >
                            {rec.priority === "high"
                              ? "높음"
                              : rec.priority === "medium"
                                ? "중간"
                                : "낮음"}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-text-primary mb-0.5">
                          {rec.title}
                        </p>
                        <p className="text-[10px] text-text-tertiary leading-relaxed">
                          {rec.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 접힌 상태에서 열기 버튼 */}
      {!isExpanded && (
        <div
          className="absolute left-0 top-4 w-8 h-8 flex items-center justify-center bg-sidebar-expanded-background border border-base-border rounded-r-md cursor-pointer hover:bg-sidebar-button-hover transition-colors z-10"
          onClick={() => setIsExpanded(true)}
        >
          <FiChevronRight size={16} className="text-text-secondary" />
        </div>
      )}
    </div>
  );
}
