import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import VisualizeToggle from "@/components/visualize/VisualizeToggle";
import VisualizeSidebar from "@/components/visualize/VisualizeSidebar";
import ClusterSummaryModal from "@/components/visualize/ClusterSummaryModal";
import {
  GraphSnapshotDto,
  GraphStatsDto,
} from "node_modules/@taco_tsinghua/graphnode-sdk/dist/types/graph";
import { Me } from "@/types/Me";
import { DUMMY_GRAPH } from "@/constants/DUMMY_GRAPH";
import { DUMMY_GRAPH_SUMMARY } from "@/constants/DUMMY_GRAPH_SUMMARY";
import { Subcluster } from "@/types/GraphData";
import type { ClusterAnalysis } from "@/types/GraphSummary";

interface GraphData {
  nodeData: GraphSnapshotDto;
  statisticData: GraphStatsDto;
}

export default function Visualize() {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [focusedNodeId, setFocusedNodeId] = useState<number | null>(null);
  const [expandedSubclusters, setExpandedSubclusters] = useState<Set<string>>(
    new Set()
  );
  const [selectedClusterSummary, setSelectedClusterSummary] = useState<ClusterAnalysis | null>(null);

  useEffect(() => {
    (async () => {
      const meData = await window.keytarAPI.getMe();
      setMe(meData as Me);
    })();
  }, []);

  // 중분류(subcluster) 펼치기/접기 토글
  const handleToggleSubcluster = useCallback((subclusterId: string) => {
    setExpandedSubclusters((prev) => {
      const next = new Set(prev);
      if (next.has(subclusterId)) {
        next.delete(subclusterId);
      } else {
        next.add(subclusterId);
      }
      return next;
    });
  }, []);

  // 클러스터 이름 클릭 시 요약 모달 표시
  const handleClusterClick = useCallback((clusterName: string) => {
    const clusterSummary = DUMMY_GRAPH_SUMMARY.clusters.find(
      (c) => c.name === clusterName
    );
    if (clusterSummary) {
      setSelectedClusterSummary(clusterSummary);
    }
  }, []);

  // DUMMY_GRAPH 데이터 사용
  const graphData: GraphData = {
    nodeData: {
      nodes: DUMMY_GRAPH.nodes,
      edges: DUMMY_GRAPH.edges,
      clusters: DUMMY_GRAPH.clusters,
      stats: DUMMY_GRAPH.stats,
    } as GraphSnapshotDto,
    statisticData: DUMMY_GRAPH.stats as GraphStatsDto,
  };

  // 중분류 데이터
  const subclusters: Subcluster[] = DUMMY_GRAPH.subclusters;

  // 사이드바에서 노드 클릭 시 포커싱만 (줌인 + 시각적 효과)
  const handleNodeFocus = (nodeId: number) => {
    setFocusedNodeId((prev) => (prev === nodeId ? null : nodeId));
  };

  // 그래프에서 노드 직접 클릭 시 상세 페이지로 이동
  const handleNodeClick = (nodeId: number) => {
    navigate(`/visualize/${nodeId}`);
  };

  return (
    <div className="flex w-full h-full overflow-hidden select-none">
      {/* 그래프 구조 사이드바 */}
      <VisualizeSidebar
        graphData={graphData.nodeData}
        isExpanded={isSidebarExpanded}
        setIsExpanded={setIsSidebarExpanded}
        onNodeFocus={handleNodeFocus}
        focusedNodeId={focusedNodeId}
        subclusters={subclusters}
        expandedSubclusters={expandedSubclusters}
        onToggleSubcluster={handleToggleSubcluster}
      />

      {/* 메인 시각화 영역 */}
      <div className="flex-1 overflow-hidden">
        <VisualizeToggle
          graphData={graphData}
          avatarUrl={me?.profile?.avatarUrl ?? null}
          onNodeClick={handleNodeClick}
          focusedNodeId={focusedNodeId}
          subclusters={subclusters}
          expandedSubclusters={expandedSubclusters}
          onToggleSubcluster={handleToggleSubcluster}
          onClusterClick={handleClusterClick}
        />
      </div>

      {/* 클러스터 요약 모달 */}
      {selectedClusterSummary && (
        <ClusterSummaryModal
          cluster={selectedClusterSummary}
          connections={DUMMY_GRAPH_SUMMARY.connections.filter(
            (c) =>
              c.source_cluster === selectedClusterSummary.name ||
              c.target_cluster === selectedClusterSummary.name
          )}
          recommendations={DUMMY_GRAPH_SUMMARY.recommendations.filter((r) =>
            r.related_nodes.some((nodeId) =>
              selectedClusterSummary.notable_conversations.includes(nodeId)
            )
          )}
          onClose={() => setSelectedClusterSummary(null)}
        />
      )}
    </div>
  );
}
