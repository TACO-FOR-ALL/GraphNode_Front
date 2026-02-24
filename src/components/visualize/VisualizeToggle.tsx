import { useState, useCallback, useRef, useEffect } from "react";
import Graph3D from "./Graph3D";
import Graph2D from "./Graph2D";
import ChevronsDown from "@/assets/icons/ChevronsDown.svg";
import ChevronsUp from "@/assets/icons/ChevronsUp.svg";
import {
  ClusterCircle,
  PositionedEdge,
  GraphSubcluster,
  GraphSnapshot,
} from "@/types/GraphData";

// Graph2D에서 전달되는 DisplayNode 타입 (로컬)
type DisplayNode = {
  id: string | number;
  x: number;
  y: number;
  clusterName?: string;
};

export default function VisualizeToggle({
  graphData,
  avatarUrl,
  subclusters,
}: {
  graphData: GraphSnapshot;
  avatarUrl: string | null;
  subclusters: GraphSubcluster[];
}) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [toggleTopClutserPanel, setToggleTopClutserPanel] = useState(false);
  const [clusters, setClusters] = useState<ClusterCircle[]>([]);
  const [nodes, setNodes] = useState<DisplayNode[]>([]);
  const [edges, setEdges] = useState<PositionedEdge[]>([]);
  const [zoomToClusterId, setZoomToClusterId] = useState<string | null>(null);

  // 컨테이너 크기 측정
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    // 초기 크기 설정
    updateDimensions();

    // ResizeObserver로 크기 변경 감지
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  const handleClustersReady = useCallback(
    (
      newClusters: ClusterCircle[],
      newNodes: DisplayNode[],
      newEdges: PositionedEdge[],
    ) => {
      setClusters(newClusters);
      setNodes(newNodes);
      setEdges(newEdges);
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      {/* 2D 모드 클러스터 토글 패널 */}
      {mode === "2d" && (
        <>
          <div
            className="absolute z-20 top-3 left-1/2 -translate-x-1/2 cursor-pointer"
            onClick={() => setToggleTopClutserPanel(!toggleTopClutserPanel)}
          >
            {toggleTopClutserPanel ? (
              <img src={ChevronsUp} alt="ChevronsUp" />
            ) : (
              <img src={ChevronsDown} alt="ChevronsDown" />
            )}
          </div>
          <div
            className={`absolute z-20 top-[46px] left-1/2 -translate-x-1/2 w-[751px] h-[77px] rounded-[20px] bg-[#BADAFF]/10 backdrop-blur-md shadow-[0_2px_20px_#BADAFF] transition-all duration-300 ease-out ${
              toggleTopClutserPanel
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
          >
            <div className="w-full h-full flex items-center justify-between px-14 overflow-x-auto">
              {clusters.map((cluster) => {
                // 클러스터 내부 노드들 가져오기
                const clusterNodes = nodes.filter(
                  (n) => n.clusterName === cluster.clusterId,
                );

                // 클러스터 내부 엣지들 가져오기 (intra-cluster만)
                const clusterEdges = edges.filter(
                  (e) =>
                    e.isIntraCluster &&
                    clusterNodes.some((n) => n.id === e.source) &&
                    clusterNodes.some((n) => n.id === e.target),
                );

                // 노드 ID로 매핑 생성 (엣지 렌더링용)
                const nodeMap = new Map(clusterNodes.map((n) => [n.id, n]));

                // viewBox 계산 (클러스터 원을 포함하도록)
                const padding = cluster.radius * 0.2;
                const minX =
                  Math.min(
                    ...clusterNodes.map((n) => n.x),
                    cluster.centerX - cluster.radius,
                  ) - padding;
                const minY =
                  Math.min(
                    ...clusterNodes.map((n) => n.y),
                    cluster.centerY - cluster.radius,
                  ) - padding;
                const maxX =
                  Math.max(
                    ...clusterNodes.map((n) => n.x),
                    cluster.centerX + cluster.radius,
                  ) + padding;
                const maxY =
                  Math.max(
                    ...clusterNodes.map((n) => n.y),
                    cluster.centerY + cluster.radius,
                  ) + padding;
                const viewBoxWidth = maxX - minX;
                const viewBoxHeight = maxY - minY;

                return (
                  <div
                    key={cluster.clusterId}
                    className="flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                    onClick={() => {
                      setZoomToClusterId(cluster.clusterId);
                      // 줌인 후 리셋 (애니메이션 시간보다 길게)
                      setTimeout(() => setZoomToClusterId(null), 900);
                    }}
                    style={{
                      width: "50px",
                      height: "50px",
                    }}
                  >
                    <svg
                      width="50"
                      height="50"
                      viewBox={`${minX} ${minY} ${viewBoxWidth} ${viewBoxHeight}`}
                      style={{ overflow: "visible" }}
                    >
                      {/* 클러스터 원 */}
                      <circle
                        cx={cluster.centerX}
                        cy={cluster.centerY}
                        r={cluster.radius}
                        fill="var(--color-cluster-default)"
                        stroke="var(--color-edge-default)"
                        strokeWidth={1}
                      />
                      {/* 클러스터 내부 엣지들 */}
                      {clusterEdges.map((edge, idx) => {
                        const sourceNode = nodeMap.get(edge.source);
                        const targetNode = nodeMap.get(edge.target);
                        if (!sourceNode || !targetNode) return null;
                        return (
                          <line
                            key={`edge-${edge.source}-${edge.target}-${idx}`}
                            x1={sourceNode.x}
                            y1={sourceNode.y}
                            x2={targetNode.x}
                            y2={targetNode.y}
                            stroke="var(--color-edge-default)"
                            strokeWidth={0.5}
                            strokeOpacity={0.6}
                          />
                        );
                      })}
                      {/* 클러스터 내부 노드들 (실제 위치 사용) */}
                      {clusterNodes.map((node) => (
                        <circle
                          key={node.id}
                          cx={node.x}
                          cy={node.y}
                          r={2}
                          fill="var(--color-node-default)"
                        />
                      ))}
                    </svg>
                    <span className="text-[10px] text-text-secondary mt-1 truncate max-w-[50px] text-center">
                      {cluster.clusterName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 2D/3D 모드 토글 패널 */}
      <div className="absolute z-20 top-6 right-6 flex flex-col gap-2">
        <div className="flex gap-1 w-[170px] h-[32px] p-[2px] relative bg-bg-tertiary rounded-md">
          <div
            onClick={() => setMode("2d")}
            className={`flex-1 flex items-center justify-center text-sm font-medium cursor-pointer relative z-10 transition-colors duration-200 ${
              mode === "2d" ? "text-primary" : "text-text-secondary"
            }`}
          >
            2D
          </div>
          <div
            onClick={() => setMode("3d")}
            className={`flex-1 flex items-center justify-center text-sm font-medium cursor-pointer relative z-10 transition-colors duration-200  ${
              mode === "3d" ? "text-primary" : "text-text-secondary"
            }`}
          >
            3D
          </div>
          <div
            className={`absolute top-[2px] h-[28px] bg-bg-primary border-base-border border-solid border-[1px] rounded-md w-[81px] transition-all duration-300 ease-in-out ${
              mode === "3d" ? "left-[87px]" : "left-[2px]"
            }`}
          ></div>
        </div>
      </div>

      {/* 그래프 렌더링 */}
      {dimensions.width > 0 &&
        dimensions.height > 0 &&
        (mode === "2d" ? (
          <Graph2D
            rawNodes={graphData.nodes}
            rawEdges={graphData.edges}
            rawSubclusters={subclusters}
            width={dimensions.width}
            height={dimensions.height}
            avatarUrl={avatarUrl}
            onClustersReady={handleClustersReady}
            zoomToClusterId={zoomToClusterId}
          />
        ) : (
          <Graph3D data={graphData} avatarUrl={avatarUrl} />
        ))}
    </div>
  );
}
