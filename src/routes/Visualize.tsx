import { useEffect, useState, useCallback } from "react";
import VisualizeToggle from "@/components/visualize/VisualizeToggle";
import VisualizeSidebar from "@/components/visualize/VisualizeSidebar";
import { Me } from "@/types/Me";
import { GraphSnapshot } from "@/types/GraphData";
import { GraphSummary } from "@/types/GraphSummary";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/apiClient";
import { unwrapAndMap } from "@/utils/httpResponse";
import { mapGraphSnapshot, mapGraphSummary } from "@/utils/dtoMappers";
import ErrorScreen from "@/components/visualize/Error";
import EmptyGraph from "@/components/visualize/EmptyGraph";

interface GraphData {
  nodeEdgeData: GraphSnapshot;
  graphSummary: GraphSummary;
}

export default function Visualize() {
  const [me, setMe] = useState<Me | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [focusedNodeId, setFocusedNodeId] = useState<number | null>(null);
  const [expandedSubclusters, setExpandedSubclusters] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    (async () => {
      const meData = await window.keytarAPI.getMe();
      setMe(meData as Me);
    })();
  }, []);

  const {
    data: graphData,
    error,
    isLoading,
  } = useQuery<GraphData>({
    queryKey: ["graphData"],
    queryFn: async (): Promise<GraphData> => {
      const nodeEdgeData = await api.graph.getSnapshot();
      const graphSummary = await api.graphAi.getSummary();

      return {
        nodeEdgeData: unwrapAndMap(nodeEdgeData, mapGraphSnapshot),
        graphSummary: unwrapAndMap(graphSummary, mapGraphSummary),
      };
    },
  });

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

  // 서버에서 가져온 서브클러스터 데이터
  const subclusters = graphData?.nodeEdgeData.subclusters ?? [];

  // 사이드바에서 노드 클릭 시 포커싱만 (줌인 + 시각적 효과)
  const handleNodeFocus = (nodeId: number) => {
    setFocusedNodeId((prev) => (prev === nodeId ? null : nodeId));
  };

  if (error) return <ErrorScreen />;

  if (isLoading || !graphData) return null;

  if (graphData.nodeEdgeData.nodes.length === 0) return <EmptyGraph />;

  return (
    <div className="flex w-full h-full overflow-hidden select-none">
      {/* 그래프 구조 사이드바 */}
      <VisualizeSidebar
        graphData={graphData.nodeEdgeData}
        graphSummary={graphData.graphSummary}
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
          graphData={graphData.nodeEdgeData}
          avatarUrl={me?.profile?.avatarUrl ?? null}
          subclusters={subclusters}
        />
      </div>
    </div>
  );
}
