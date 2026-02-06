import { useState, useCallback } from "react";
import Graph3D from "./Graph3D";
import {
  GraphSnapshotDto,
  GraphStatsDto,
} from "node_modules/@taco_tsinghua/graphnode-sdk/dist/types/graph";
import Graph2D from "./Graph2D";
import ChevronsDown from "@/assets/icons/ChevronsDown.svg";
import ChevronsUp from "@/assets/icons/ChevronsUp.svg";
import {
  ClusterCircle,
  PositionedNode,
  PositionedEdge,
} from "@/types/GraphData";

interface GraphData {
  nodeData: GraphSnapshotDto;
  statisticData: GraphStatsDto;
}

export default function VisualizeToggle({
  graphData,
  avatarUrl,
}: {
  graphData: GraphData;
  avatarUrl: string | null;
}) {
  const statisticData = graphData.statisticData;
  const nodeData = graphData.nodeData;

  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [toggleTopClutserPanel, setToggleTopClutserPanel] = useState(false);
  const [clusters, setClusters] = useState<ClusterCircle[]>([]);
  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [edges, setEdges] = useState<PositionedEdge[]>([]);
  const [zoomToClusterId, setZoomToClusterId] = useState<string | null>(null);

  const handleClustersReady = useCallback(
    (
      newClusters: ClusterCircle[],
      newNodes: PositionedNode[],
      newEdges: PositionedEdge[],
    ) => {
      setClusters(newClusters);
      setNodes(newNodes);
      setEdges(newEdges);
    },
    [],
  );

  return (
    <div style={{ position: "relative" }}>
      {/* 그래프 데이터 정보 */}
      <div className="absolute z-20 bottom-12 left-6 flex flex-col gap-1 text-text-tertiary text-sm">
        <p>Graph Data Info</p>
        <p>Total Nodes: {JSON.stringify(statisticData.nodes)}</p>
        <p>Total Edges: {JSON.stringify(statisticData.edges)}</p>
        <p>Total Clusters: {JSON.stringify(statisticData.clusters)}</p>
        <p>
          Generated At:
          {statisticData.generatedAt
            ? new Date(statisticData.generatedAt).toLocaleString()
            : "N/A"}
        </p>
      </div>

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
            className={`absolute top-[2px] h-[28px] bg-white border-base-border border-solid border-[1px] rounded-md w-[81px] transition-all duration-300 ease-in-out ${
              mode === "3d" ? "left-[87px]" : "left-[2px]"
            }`}
          ></div>
        </div>
      </div>

      {/* 그래프 렌더링 */}
      {mode === "2d" ? (
        <Graph2D
          rawNodes={nodeData.nodes}
          rawEdges={nodeData.edges}
          width={window.innerWidth}
          height={window.innerHeight}
          avatarUrl={avatarUrl}
          onClustersReady={handleClustersReady}
          zoomToClusterId={zoomToClusterId}
        />
      ) : (
        <Graph3D data={nodeData} />
      )}
    </div>
  );
}
