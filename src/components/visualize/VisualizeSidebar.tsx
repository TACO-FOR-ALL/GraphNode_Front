import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  FiRefreshCw,
} from "react-icons/fi";
import { GraphSubcluster, GraphSnapshot } from "@/types/GraphData";
import ToggleSidebarExpand from "../sidebar/ToggleSidebarExpand";
import { GraphSummary } from "@/types/GraphSummary";
import { api } from "@/apiClient";
import { unwrapResponse } from "@/utils/httpResponse";

// 패턴 타입 스타일
const PATTERN_CONFIG = {
  repetition: { color: "bg-yellow-500/20 text-yellow-600", icon: "🔄" },
  progression: { color: "bg-green-500/20 text-green-600", icon: "📈" },
  gap: { color: "bg-red-500/20 text-red-600", icon: "⚠️" },
  bridge: { color: "bg-blue-500/20 text-blue-600", icon: "🔗" },
};

// 추천 타입 스타일
const RECOMMENDATION_CONFIG = {
  consolidate: { color: "bg-purple-500/20 text-purple-600", icon: "📦" },
  explore: { color: "bg-blue-500/20 text-blue-600", icon: "🔍" },
  review: { color: "bg-yellow-500/20 text-yellow-600", icon: "📝" },
  connect: { color: "bg-green-500/20 text-green-600", icon: "🔗" },
};

// 우선순위 색상
const PRIORITY_CONFIG = {
  high: "text-red-500",
  medium: "text-yellow-500",
  low: "text-green-500",
};

interface VisualizeSidebarProps {
  graphData: GraphSnapshot;
  graphSummary: GraphSummary;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  onNodeFocus?: (nodeId: number) => void;
  focusedNodeId?: number | null;
  subclusters: GraphSubcluster[];
  expandedSubclusters: Set<string>;
  onToggleSubcluster: (subclusterId: string) => void;
}

interface SubclusterGroup {
  subcluster: GraphSubcluster;
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
  graphSummary,
  isExpanded,
  setIsExpanded,
  onNodeFocus,
  focusedNodeId,
  subclusters,
  expandedSubclusters,
  onToggleSubcluster,
}: VisualizeSidebarProps) {
  const { t } = useTranslation();

  // 그래프 업데이트 상태
  const [isUpdating, setIsUpdating] = useState(false);

  // 컴포넌트 마운트 시 그래프 상태 확인
  useEffect(() => {
    const checkGraphStatus = async () => {
      try {
        const { status } = unwrapResponse(await api.graph.getStats());
        setIsUpdating(status === "UPDATING" || status === "CREATING");
      } catch {
        // 에러 시 무시
      }
    };
    checkGraphStatus();
  }, []);

  // 드래그 리사이즈 관련 상태
  const [sidebarWidth, setSidebarWidth] = useState(259);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(259);

  const MIN_WIDTH = 259;
  const MAX_WIDTH = 400;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isExpanded) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartWidth.current = sidebarWidth;
    },
    [isExpanded, sidebarWidth],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current;
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, dragStartWidth.current + delta),
      );
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

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
  const nodeToSubclusterMap = new Map<number, GraphSubcluster>();
  subclusters.forEach((sc) => {
    sc.nodeIds.forEach((nodeId) => {
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

  const onUpdateGraph = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const result = await api.graphAi.addNode();
      console.log(result);
    } catch {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative flex">
      {/* 사이드바 메인 영역 */}
      <div
        className={`bg-sidebar-expanded-background flex flex-col h-full overflow-hidden ${
          isDragging ? "" : "duration-300 transition-all"
        }`}
        style={{ width: isExpanded ? sidebarWidth : 40 }}
      >
        <ToggleSidebarExpand
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
        />
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
                  {t("visualize.overview")}
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
                        {graphSummary.overview.summary_text}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOverviewTextExpanded(false);
                          }}
                          className="text-[11px] text-text-tertiary hover:text-text-secondary transition-colors ml-0.5 underline"
                        >
                          {t("visualize.collapse")}
                        </span>
                      </>
                    ) : (
                      <>
                        {graphSummary.overview.summary_text.slice(0, 100)}
                        ...
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsOverviewTextExpanded(true);
                          }}
                          className="text-[11px] text-text-tertiary hover:text-text-secondary transition-colors ml-0.5 underline"
                        >
                          {t("visualize.expand")}
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
                          {t("visualize.conversations")}
                        </p>
                        <p className="text-[12px] font-medium text-text-primary">
                          {graphSummary.overview.total_conversations}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 p-1.5 bg-bg-tertiary/50 rounded-lg">
                      <FiActivity size={12} className="text-node-focus" />
                      <div>
                        <p className="text-[10px] text-text-tertiary">
                          {t("visualize.style")}
                        </p>
                        <p className="text-[12px] font-medium text-text-primary">
                          {graphSummary.overview.conversation_style}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 주요 관심사 - 전체 표시 */}
                  <div className="mb-1">
                    <p className="text-[10px] text-text-tertiary mb-1">
                      {t("visualize.primaryInterests")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {graphSummary.overview.primary_interests.map(
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
                  {t("visualize.graphStructure")}
                </span>
                <span className="text-[10px] text-text-tertiary ml-auto">
                  {clusterGroups.length} {t("visualize.clusters")}
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
                                      {scGroup.subcluster.topKeywords[0] ||
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
                  {t("visualize.patterns")}
                </span>
                <span className="text-[10px] text-text-tertiary ml-auto">
                  {graphSummary.patterns.length}
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
                  {graphSummary.patterns.map((pattern, idx) => {
                    const config = PATTERN_CONFIG[pattern.pattern_type];
                    return (
                      <div
                        key={idx}
                        className="p-2 bg-bg-tertiary/30 rounded-lg"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded ${config.color}`}
                          >
                            {config.icon}{" "}
                            {t(`visualize.patternType.${pattern.pattern_type}`)}
                          </span>
                          <span
                            className={`text-[11px] ${
                              pattern.significance === "high"
                                ? "text-red-500"
                                : pattern.significance === "medium"
                                  ? "text-yellow-500"
                                  : "text-green-500"
                            }`}
                          >
                            {t(`visualize.priority.${pattern.significance}`)}
                          </span>
                        </div>
                        <p className="text-[12px] text-text-tertiary leading-relaxed">
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
                  {t("visualize.recommendations")}
                </span>
                <span className="text-[10px] text-text-tertiary ml-auto">
                  {graphSummary.recommendations.length}
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
                  {graphSummary.recommendations.map((rec, idx) => {
                    const config = RECOMMENDATION_CONFIG[rec.type];
                    return (
                      <div
                        key={idx}
                        className="p-2 bg-bg-tertiary/30 rounded-lg"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`text-[11px] px-1.5 py-0.5 rounded ${config.color}`}
                          >
                            {config.icon}{" "}
                            {t(`visualize.recommendationType.${rec.type}`)}
                          </span>
                          <span
                            className={`text-[11px] ${PRIORITY_CONFIG[rec.priority]}`}
                          >
                            {t(`visualize.priority.${rec.priority}`)}
                          </span>
                        </div>
                        <p className="text-[12px] font-medium text-text-primary mb-0.5">
                          {rec.title}
                        </p>
                        <p className="text-[12px] text-text-tertiary leading-relaxed">
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

        {/* 그래프 업데이트 버튼 - 하단 고정 */}
        {isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-sidebar-expanded-background border-t border-base-border">
            <button
              onClick={onUpdateGraph}
              disabled={isUpdating}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-[13px] transition-all duration-200 ${
                isUpdating
                  ? "bg-primary/50 text-white cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
              }`}
            >
              <FiRefreshCw
                size={14}
                className={isUpdating ? "animate-spin" : ""}
              />
              {isUpdating
                ? t("visualize.updating")
                : t("visualize.updateGraph")}
            </button>
          </div>
        )}
      </div>

      {/* 리사이즈 핸들 - 열린 상태에서만 표시 */}
      {isExpanded && (
        <div
          className={`absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 transition-colors z-10 ${
            isDragging ? "bg-primary/50" : ""
          }`}
          style={{ left: sidebarWidth - 2 }}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
}
