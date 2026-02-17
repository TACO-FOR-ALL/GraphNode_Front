import { useState, useCallback, useMemo, useEffect } from "react";
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
  Subcluster,
} from "@/types/GraphData";
import { GraphSummaryPanel } from "./summary";
import { useThemeStore } from "@/store/useThemeStore";

export default function VisualizeToggle({
  nodeData,
  statisticData,
  avatarUrl,
}: {
  nodeData: GraphSnapshotDto;
  statisticData: GraphStatsDto;
  avatarUrl: string | null;
}) {
  const [mode, setMode] = useState<"2d" | "3d">("2d");
  const [showSummary, setShowSummary] = useState(false);
  const [toggleTopClutserPanel, setToggleTopClutserPanel] = useState(false);
  const [clusters, setClusters] = useState<ClusterCircle[]>([]);
  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [edges, setEdges] = useState<PositionedEdge[]>([]);
  const [zoomToClusterId, setZoomToClusterId] = useState<string | null>(null);
  const { theme } = useThemeStore();
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">(
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme,
  );

  useEffect(() => {
    if (theme !== "system") {
      setResolvedTheme(theme);
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setResolvedTheme(media.matches ? "dark" : "light");
    update();

    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, [theme]);

  const snapshotSubclusters = (nodeData as { subclusters?: Subcluster[] })
    .subclusters;
  const statsSubclusters = (
    nodeData.stats?.metadata as { subclusters?: Subcluster[] } | undefined
  )?.subclusters;
  const fallbackStatsSubclusters = (
    statisticData.metadata as { subclusters?: Subcluster[] } | undefined
  )?.subclusters;
  const rawSubclusters =
    snapshotSubclusters ?? statsSubclusters ?? fallbackStatsSubclusters;

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

  const handleClusterZoom = useCallback((clusterId: string) => {
    setZoomToClusterId(clusterId);
    window.setTimeout(() => setZoomToClusterId(null), 900);
  }, []);

  const clusterSummaries = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; size: number }>();

    nodeData.clusters.forEach((cluster) => {
      if (!cluster?.id) return;
      byId.set(cluster.id, {
        id: cluster.id,
        name: cluster.name,
        size: cluster.size ?? 0,
      });
    });

    nodeData.nodes.forEach((node) => {
      const id = (node.clusterId ?? "default") as string;
      const existing = byId.get(id);
      const name = existing?.name ?? node.clusterName ?? id;
      const size = (existing?.size ?? 0) + 1;
      byId.set(id, { id, name, size });
    });

    return Array.from(byId.values());
  }, [nodeData]);

  const clusterPalette = [
    "#4aa8c0",
    "#e74c3c",
    "#2ecc71",
    "#f39c12",
    "#9b59b6",
  ];
  const clusterIdColorMap: Record<string, string> = {
    cluster_1: "#4aa8c0",
    cluster_2: "#e74c3c",
    cluster_3: "#2ecc71",
    cluster_4: "#f39c12",
    cluster_5: "#9b59b6",
  };

  const hashString = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  };

  const buildSeededPoints = (seed: number, count: number) => {
    let state = seed >>> 0;
    const rand = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i += 1) {
      const angle = rand() * Math.PI * 2;
      const radius = Math.sqrt(rand()) * 12;
      pts.push({
        x: 25 + Math.cos(angle) * radius,
        y: 25 + Math.sin(angle) * radius,
      });
    }
    return pts;
  };

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

      {/* 2D/3D 모드 클러스터 토글 패널 */}
      {!showSummary && (
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
              {mode === "2d" &&
                clusters.map((cluster) => {
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
                      onClick={() => handleClusterZoom(cluster.clusterId)}
                      style={{
                        width: "60px",
                      }}
                      title={cluster.clusterName ?? cluster.clusterId}
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
                        {cluster.clusterName ?? cluster.clusterId}
                      </span>
                    </div>
                  );
                })}

              {mode === "3d" &&
                clusterSummaries.map((cluster, idx) => {
                  const color =
                    clusterIdColorMap[cluster.id] ??
                    clusterPalette[idx % clusterPalette.length];
                  const seed = hashString(cluster.id);
                  const gradientId = `grad-${seed}-${idx}`;
                  const dotCount = Math.min(
                    10,
                    Math.max(4, Math.round(Math.sqrt(cluster.size || 1)) + 3),
                  );
                  const points = buildSeededPoints(seed, dotCount);

                  return (
                    <div
                      key={cluster.id}
                      className="flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                      onClick={() => handleClusterZoom(cluster.id)}
                      style={{
                        width: "60px",
                      }}
                    >
                      <svg width="50" height="50" viewBox="0 0 50 50">
                        <defs>
                          <radialGradient
                            id={gradientId}
                            cx="50%"
                            cy="45%"
                            r="60%"
                          >
                            <stop
                              offset="0%"
                              stopColor={color}
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="100%"
                              stopColor={color}
                              stopOpacity={0.1}
                            />
                          </radialGradient>
                        </defs>
                        <circle
                          cx="25"
                          cy="25"
                          r="18"
                          fill={`url(#${gradientId})`}
                          stroke={color}
                          strokeOpacity={0.7}
                          strokeWidth="1"
                        />
                        {points.map((p, i) => (
                          <circle
                            key={`${cluster.id}-dot-${i}`}
                            cx={p.x}
                            cy={p.y}
                            r="1.6"
                            fill={color}
                            fillOpacity={0.7}
                          />
                        ))}
                        <path
                          d="M12 30 C16 38, 34 38, 38 30"
                          stroke={color}
                          strokeOpacity={0.4}
                          strokeWidth="1"
                          fill="none"
                        />
                      </svg>
                      <span className="text-[10px] text-text-secondary mt-1 truncate max-w-[50px] text-center">
                        {cluster.name}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      )}

      {/* 2D/3D/Summary 모드 토글 패널 */}
      <div className="absolute z-20 top-6 right-6 flex flex-col gap-2">
        <div className="flex gap-1 w-[255px] h-[32px] p-[2px] relative bg-bg-tertiary rounded-md">
          <div
            onClick={() => {
              setMode("2d");
              setShowSummary(false);
            }}
            className={`flex-1 flex items-center justify-center text-sm font-medium cursor-pointer relative z-10 transition-colors duration-200 ${
              mode === "2d" && !showSummary
                ? "text-primary"
                : "text-text-secondary"
            }`}
          >
            2D
          </div>
          <div
            onClick={() => {
              setMode("3d");
              setShowSummary(false);
            }}
            className={`flex-1 flex items-center justify-center text-sm font-medium cursor-pointer relative z-10 transition-colors duration-200  ${
              mode === "3d" && !showSummary
                ? "text-primary"
                : "text-text-secondary"
            }`}
          >
            3D
          </div>
          <div
            onClick={() => setShowSummary(true)}
            className={`flex-1 flex items-center justify-center text-sm font-medium cursor-pointer relative z-10 transition-colors duration-200  ${
              showSummary ? "text-primary" : "text-text-secondary"
            }`}
          >
            Summary
          </div>
          <div
            className={`absolute top-[2px] h-[28px] bg-white border-base-border border-solid border-[1px] rounded-md w-[81px] transition-all duration-300 ease-in-out ${
              mode === "3d" && !showSummary
                ? "left-[87px]"
                : showSummary
                  ? "left-[172px]"
                  : "left-[2px]"
            }`}
          ></div>
        </div>
      </div>

      {/* 그래프 렌더링 */}
      {mode === "2d" ? (
        <Graph2D
          rawNodes={nodeData.nodes}
          rawEdges={nodeData.edges}
          rawSubclusters={rawSubclusters}
          width={window.innerWidth}
          height={window.innerHeight}
          avatarUrl={avatarUrl}
          onClustersReady={handleClustersReady}
          zoomToClusterId={zoomToClusterId}
        />
      ) : (
        <Graph3D
          data={nodeData}
          zoomToClusterId={zoomToClusterId}
          theme={resolvedTheme}
          onClusterClick={(clusterId) => {
            setZoomToClusterId(clusterId);
            setTimeout(() => setZoomToClusterId(null), 900);
          }}
        />
      )}

      {/* Summary Overlay */}
      {showSummary && (
        <GraphSummaryPanel
          onClose={() => setShowSummary(false)}
          onClusterClick={(clusterId) => {
            setZoomToClusterId(clusterId);
            setMode("2d");
            setShowSummary(false);
            // Reset zoom after animation completes
            setTimeout(() => setZoomToClusterId(null), 900);
          }}
        />
      )}
    </div>
  );
}
