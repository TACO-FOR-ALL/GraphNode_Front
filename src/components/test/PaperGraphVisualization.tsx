import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3Force from "d3-force";

// 타입 정의
interface RawNode {
  name: string;
  type: string;
  source_chunk_id: number;
  description: string;
}

interface RawEdge {
  start: string;
  target: string;
  type: string;
  source_chunk_id: number;
  description: string;
  evidence?: string;
  confidence?: number;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  description: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  hasEdges?: boolean;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  description: string;
  confidence?: number;
}

// 노드 타입별 색상
const NODE_COLORS: Record<string, { fill: string; stroke: string; gradient: string }> = {
  Paper: { fill: "#8B5CF6", stroke: "#6D28D9", gradient: "#A78BFA" },
  Problem: { fill: "#F43F5E", stroke: "#BE123C", gradient: "#FB7185" },
  Method: { fill: "#3B82F6", stroke: "#1D4ED8", gradient: "#60A5FA" },
  Dataset: { fill: "#10B981", stroke: "#047857", gradient: "#34D399" },
  Metric: { fill: "#F59E0B", stroke: "#B45309", gradient: "#FBBF24" },
  Result: { fill: "#06B6D4", stroke: "#0E7490", gradient: "#22D3EE" },
  Baseline: { fill: "#6B7280", stroke: "#374151", gradient: "#9CA3AF" },
  Limitation: { fill: "#F97316", stroke: "#C2410C", gradient: "#FB923C" },
};

// 엣지 타입별 색상
const EDGE_COLORS: Record<string, string> = {
  proposes: "#8B5CF6",
  addresses: "#F43F5E",
  evaluates_on: "#10B981",
  uses: "#3B82F6",
  achieves: "#06B6D4",
  measured_by: "#F59E0B",
  outperforms: "#22C55E",
  suffers_from: "#F97316",
};

// 노드 타입별 약어
const NODE_ABBR: Record<string, string> = {
  Paper: "PA",
  Problem: "PR",
  Method: "ME",
  Dataset: "DA",
  Metric: "MT",
  Result: "RE",
  Baseline: "BA",
  Limitation: "LI",
};

type ViewMode = "network" | "cluster";

interface Props {
  data: { nodes: RawNode[]; edges: RawEdge[] }[];
  width?: number;
  height?: number;
}

const NODE_RADIUS = 18;

export default function PaperGraphVisualization({
  data,
  width = 1200,
  height = 800,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [dimensions, setDimensions] = useState({ width, height });
  const [viewMode, setViewMode] = useState<ViewMode>("network");
  const panStart = useRef<{ x: number; y: number } | null>(null);

  // 컨테이너 크기 감지
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 데이터 병합 및 중복 제거
  const processedData = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const edgeSet = new Set<string>();
    const processedEdges: GraphEdge[] = [];
    const connectedNodes = new Set<string>();

    data.forEach((chunk) => {
      chunk.nodes.forEach((node) => {
        const key = `${node.name}-${node.type}`;
        if (!nodeMap.has(key)) {
          nodeMap.set(key, {
            id: key,
            name: node.name,
            type: node.type,
            description: node.description,
            x: Math.random() * dimensions.width,
            y: Math.random() * dimensions.height,
            hasEdges: false,
          });
        }
      });

      chunk.edges.forEach((edge) => {
        const sourceKey = `${edge.start}-${findNodeType(chunk.nodes, edge.start)}`;
        const targetKey = `${edge.target}-${findNodeType(chunk.nodes, edge.target)}`;
        const edgeKey = `${sourceKey}-${targetKey}-${edge.type}`;

        if (!edgeSet.has(edgeKey) && nodeMap.has(sourceKey) && nodeMap.has(targetKey)) {
          edgeSet.add(edgeKey);
          connectedNodes.add(sourceKey);
          connectedNodes.add(targetKey);
          processedEdges.push({
            source: sourceKey,
            target: targetKey,
            type: edge.type,
            description: edge.description,
            confidence: edge.confidence,
          });
        }
      });
    });

    connectedNodes.forEach((id) => {
      const node = nodeMap.get(id);
      if (node) node.hasEdges = true;
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: processedEdges,
    };
  }, [data, dimensions.width, dimensions.height]);

  function findNodeType(nodes: RawNode[], name: string): string {
    const node = nodes.find((n) => n.name === name);
    return node?.type || "Unknown";
  }

  // 노드 타입별 그룹
  const nodeTypes = useMemo(() => {
    const types = new Set<string>();
    processedData.nodes.forEach((n) => types.add(n.type));
    return Array.from(types);
  }, [processedData.nodes]);

  // 클러스터 위치 계산 (Paper는 중앙에 배치)
  const clusterPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.32;

    // Paper는 중앙에 배치
    positions["Paper"] = { x: centerX, y: centerY };

    // 나머지 타입들은 주변에 원형으로 배치
    const otherTypes = nodeTypes.filter((t) => t !== "Paper");
    otherTypes.forEach((type, idx) => {
      const angle = (idx / otherTypes.length) * 2 * Math.PI - Math.PI / 2;
      positions[type] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    return positions;
  }, [nodeTypes, dimensions.width, dimensions.height]);

  // Force 시뮬레이션 (Network 모드)
  useEffect(() => {
    if (processedData.nodes.length === 0 || viewMode !== "network") return;

    const simNodes = processedData.nodes.map((n) => ({ ...n }));
    const simEdges = processedData.edges.map((e) => ({
      source: simNodes.find((n) => n.id === e.source),
      target: simNodes.find((n) => n.id === e.target),
    })).filter((e) => e.source && e.target);

    const simulation = d3Force
      .forceSimulation(simNodes as any)
      .force("center", d3Force.forceCenter(dimensions.width / 2, dimensions.height / 2).strength(0.05))
      .force("charge", d3Force.forceManyBody().strength((d: any) => {
        return d.hasEdges ? -350 : -150;
      }))
      .force(
        "link",
        d3Force
          .forceLink(simEdges as any)
          .id((d: any) => d.id)
          .distance(180)
          .strength(0.4)
      )
      .force("collision", d3Force.forceCollide(NODE_RADIUS + 40))
      .force("x", d3Force.forceX(dimensions.width / 2).strength(0.02))
      .force("y", d3Force.forceY(dimensions.height / 2).strength(0.02))
      .stop();

    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    setNodes(simNodes);
    setEdges(processedData.edges);
  }, [processedData, dimensions.width, dimensions.height, viewMode]);

  // Force 시뮬레이션 (Cluster 모드)
  useEffect(() => {
    if (processedData.nodes.length === 0 || viewMode !== "cluster") return;

    const simNodes = processedData.nodes.map((n) => ({
      ...n,
      x: clusterPositions[n.type]?.x || dimensions.width / 2,
      y: clusterPositions[n.type]?.y || dimensions.height / 2,
    }));

    const simulation = d3Force
      .forceSimulation(simNodes as any)
      .force("charge", d3Force.forceManyBody().strength(-80))
      .force("collision", d3Force.forceCollide(NODE_RADIUS + 20))
      .force("x", d3Force.forceX((d: any) => clusterPositions[d.type]?.x || dimensions.width / 2).strength(0.5))
      .force("y", d3Force.forceY((d: any) => clusterPositions[d.type]?.y || dimensions.height / 2).strength(0.5))
      .stop();

    for (let i = 0; i < 200; i++) {
      simulation.tick();
    }

    setNodes(simNodes);
    setEdges(processedData.edges);
  }, [processedData, dimensions.width, dimensions.height, viewMode, clusterPositions]);

  // 모드 변경 시 선택 초기화
  useEffect(() => {
    setSelectedNode(null);
    setHoveredNode(null);
    setHoveredEdge(null);
  }, [viewMode]);

  // 마우스 이벤트
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.002;
    const newScale = scale * (1 - e.deltaY * zoomIntensity);
    setScale(Math.min(Math.max(newScale, 0.3), 3));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest(".node-group")) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return;
    setOffset({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    panStart.current = null;
  };

  const nodeById = (id: string) => nodes.find((n) => n.id === id);

  // 노드 타입별 통계
  const nodeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    nodes.forEach((n) => {
      stats[n.type] = (stats[n.type] || 0) + 1;
    });
    return stats;
  }, [nodes]);

  // 엣지 타입별 통계
  const edgeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    edges.forEach((e) => {
      stats[e.type] = (stats[e.type] || 0) + 1;
    });
    return stats;
  }, [edges]);

  // 엣지 경로 계산 (곡선)
  const getEdgePath = (source: GraphNode, target: GraphNode, edgeIndex: number = 0) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { path: `M${source.x},${source.y}`, x1: source.x, y1: source.y, x2: source.x, y2: source.y };

    const nx = dx / len;
    const ny = dy / len;

    const padding = NODE_RADIUS + 2;
    const x1 = source.x + nx * padding;
    const y1 = source.y + ny * padding;
    const x2 = target.x - nx * padding;
    const y2 = target.y - ny * padding;

    // 곡선 제어점 계산 (수직 방향으로 오프셋)
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // 곡률 정도 (거리에 비례하여 조절)
    const curvature = Math.min(len * 0.15, 40);

    // 수직 방향 벡터
    const perpX = -ny * curvature;
    const perpY = nx * curvature;

    // 제어점
    const ctrlX = midX + perpX;
    const ctrlY = midY + perpY;

    return {
      path: `M${x1},${y1} Q${ctrlX},${ctrlY} ${x2},${y2}`,
      x1,
      y1,
      x2,
      y2,
      ctrlX,
      ctrlY,
    };
  };

  // 엣지 가시성 체크 (클러스터 모드용)
  const isEdgeVisible = (edge: GraphEdge) => {
    if (viewMode === "network") return true;

    const sourceNode = nodeById(edge.source);
    const targetNode = nodeById(edge.target);
    if (!sourceNode || !targetNode) return false;

    // 같은 클러스터 내의 엣지는 항상 표시
    if (sourceNode.type === targetNode.type) return true;

    // 중심 노드(Paper)와 연결된 엣지는 항상 표시
    if (sourceNode.type === "Paper" || targetNode.type === "Paper") return true;

    // 선택된 노드와 연결된 엣지만 표시
    if (selectedNode) {
      return edge.source === selectedNode.id || edge.target === selectedNode.id;
    }

    return false;
  };

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* 헤더 */}
      <div className="p-4 border-b border-text-tertiary/20 bg-bg-secondary/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary mb-1">
              Paper Analysis: Multitask Transformer for Cross-Corpus SER
            </h1>
            <p className="text-sm text-text-secondary">
              IEEE Trans. Affective Computing, 2025 • Knowledge Graph Visualization
            </p>
          </div>
          {/* 뷰 모드 토글 */}
          <div className="flex items-center gap-1 p-1 bg-bg-tertiary rounded-xl">
            <button
              onClick={() => setViewMode("network")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                viewMode === "network"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
              }`}
            >
              Network
            </button>
            <button
              onClick={() => setViewMode("cluster")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                viewMode === "cluster"
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
              }`}
            >
              Cluster
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 - 범례 */}
        <div className="w-64 p-4 border-r border-text-tertiary/20 overflow-y-auto bg-bg-secondary/30">
          {/* 노드 타입 범례 */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider">
              Node Types
            </h3>
            <div className="space-y-1.5">
              {Object.entries(NODE_COLORS).map(([type, colors]) => (
                <div
                  key={type}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-tertiary/50 transition-colors cursor-default"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${colors.gradient} 0%, ${colors.fill} 100%)`,
                      boxShadow: `0 2px 4px ${colors.fill}40`,
                    }}
                  >
                    {NODE_ABBR[type]}
                  </div>
                  <span className="text-xs text-text-secondary flex-1">{type}</span>
                  <span className="text-[10px] text-text-placeholder bg-bg-tertiary px-1.5 py-0.5 rounded-full">
                    {nodeStats[type] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 엣지 타입 범례 */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider">
              Edge Types
            </h3>
            <div className="space-y-1.5">
              {Object.entries(EDGE_COLORS).map(([type, color]) => (
                <div
                  key={type}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-tertiary/50 transition-colors cursor-default"
                >
                  <svg width="20" height="12" className="flex-shrink-0">
                    <defs>
                      <marker
                        id={`legend-arrow-${type}`}
                        markerWidth="6"
                        markerHeight="6"
                        refX="5"
                        refY="3"
                        orient="auto"
                      >
                        <path d="M0,0 L6,3 L0,6 Z" fill={color} />
                      </marker>
                    </defs>
                    <line
                      x1="0"
                      y1="6"
                      x2="14"
                      y2="6"
                      stroke={color}
                      strokeWidth="2"
                      markerEnd={`url(#legend-arrow-${type})`}
                    />
                  </svg>
                  <span className="text-xs text-text-secondary flex-1">{type}</span>
                  <span className="text-[10px] text-text-placeholder bg-bg-tertiary px-1.5 py-0.5 rounded-full">
                    {edgeStats[type] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 통계 */}
          <div className="p-3 bg-bg-tertiary/50 rounded-xl">
            <h3 className="text-xs font-semibold text-text-primary mb-2 uppercase tracking-wider">
              Statistics
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-bg-primary rounded-lg">
                <p className="text-lg font-bold text-primary">{nodes.length}</p>
                <p className="text-[10px] text-text-secondary">Nodes</p>
              </div>
              <div className="text-center p-2 bg-bg-primary rounded-lg">
                <p className="text-lg font-bold text-primary">{edges.length}</p>
                <p className="text-[10px] text-text-secondary">Edges</p>
              </div>
            </div>
          </div>

          {/* 도움말 */}
          <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-[10px] text-text-secondary leading-relaxed">
              <strong className="text-text-primary">Tip:</strong>{" "}
              {viewMode === "network"
                ? "Scroll to zoom, drag to pan. Click nodes for details."
                : "Click a node to see cross-cluster connections."}
            </p>
          </div>
        </div>

        {/* 그래프 영역 */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-bg-primary">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ cursor: isPanning ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* 그라디언트 정의 */}
            <defs>
              {Object.entries(NODE_COLORS).map(([type, colors]) => (
                <linearGradient
                  key={`gradient-${type}`}
                  id={`node-gradient-${type}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={colors.gradient} />
                  <stop offset="100%" stopColor={colors.fill} />
                </linearGradient>
              ))}
              <filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
              </filter>
              {Object.entries(EDGE_COLORS).map(([type, color]) => (
                <marker
                  key={`arrow-${type}`}
                  id={`arrow-${type}`}
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill={color} />
                </marker>
              ))}
              <marker
                id="arrow-default"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="#9CA3AF" />
              </marker>
            </defs>

            <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
              {/* 클러스터 배경 (Cluster 모드) */}
              {viewMode === "cluster" &&
                nodeTypes.map((type) => {
                  const pos = clusterPositions[type];
                  const colors = NODE_COLORS[type];
                  if (!pos || !colors) return null;

                  return (
                    <g key={`cluster-bg-${type}`}>
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={80}
                        fill={colors.fill}
                        opacity={0.08}
                      />
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={80}
                        fill="none"
                        stroke={colors.fill}
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        opacity={0.3}
                      />
                      <text
                        x={pos.x}
                        y={pos.y - 90}
                        textAnchor="middle"
                        fill={colors.fill}
                        fontSize="11"
                        fontWeight="600"
                        opacity={0.8}
                      >
                        {type}
                      </text>
                    </g>
                  );
                })}

              {/* 엣지 */}
              {edges.map((edge, idx) => {
                const source = nodeById(edge.source);
                const target = nodeById(edge.target);
                if (!source || !target) return null;
                if (!isEdgeVisible(edge)) return null;

                const isHovered = hoveredEdge === edge;
                const isConnectedToSelected =
                  selectedNode &&
                  (edge.source === selectedNode.id || edge.target === selectedNode.id);
                const color = EDGE_COLORS[edge.type] || "#9CA3AF";
                const pathData = getEdgePath(source, target, idx);

                // 클러스터 모드에서 다른 클러스터 간 엣지는 다르게 표시
                const isCrossCluster = viewMode === "cluster" && source.type !== target.type;

                return (
                  <g key={`edge-${idx}`}>
                    {/* 투명한 히트 영역 */}
                    <path
                      d={pathData.path}
                      stroke="transparent"
                      strokeWidth={12}
                      fill="none"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredEdge(edge)}
                      onMouseLeave={() => setHoveredEdge(null)}
                    />
                    {/* 실제 엣지 */}
                    <path
                      d={pathData.path}
                      stroke={color}
                      strokeWidth={isHovered || isConnectedToSelected ? 2 : 1}
                      strokeOpacity={isCrossCluster ? 0.8 : (isHovered || isConnectedToSelected ? 0.9 : 0.4)}
                      strokeDasharray={isCrossCluster ? "6 3" : "none"}
                      fill="none"
                      markerEnd={`url(#arrow-${edge.type})`}
                      style={{ transition: "stroke-width 0.2s, stroke-opacity 0.2s" }}
                    />
                  </g>
                );
              })}

              {/* 노드 */}
              {nodes.map((node) => {
                const colors = NODE_COLORS[node.type] || { fill: "#9CA3AF", stroke: "#6B7280", gradient: "#9CA3AF" };
                const isHovered = hoveredNode?.id === node.id;
                const isSelected = selectedNode?.id === node.id;
                const isActive = isHovered || isSelected;

                return (
                  <g
                    key={node.id}
                    className="node-group"
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNode(selectedNode?.id === node.id ? null : node);
                    }}
                  >
                    {isActive && (
                      <circle
                        r={NODE_RADIUS + 4}
                        fill="none"
                        stroke={isSelected ? "white" : colors.stroke}
                        strokeWidth={2}
                        strokeDasharray={isSelected ? "4 2" : "none"}
                        opacity={0.6}
                      />
                    )}
                    <circle
                      r={NODE_RADIUS}
                      fill={`url(#node-gradient-${node.type})`}
                      filter="url(#node-shadow)"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="9"
                      fontWeight="bold"
                      fill="white"
                      style={{ pointerEvents: "none" }}
                    >
                      {NODE_ABBR[node.type] || "??"}
                    </text>
                    <g style={{ opacity: isActive ? 1 : 0.7 }}>
                      <rect
                        x={-getTextWidth(truncateText(node.name, 25)) / 2 - 6}
                        y={NODE_RADIUS + 6}
                        width={getTextWidth(truncateText(node.name, 25)) + 12}
                        height={18}
                        rx={9}
                        fill="var(--color-bg-primary)"
                        stroke="var(--color-text-tertiary)"
                        strokeWidth={0.5}
                        opacity={0.95}
                      />
                      <text
                        y={NODE_RADIUS + 18}
                        textAnchor="middle"
                        fill="var(--color-text-primary)"
                        fontSize="10"
                        fontWeight="500"
                        style={{ pointerEvents: "none" }}
                      >
                        {truncateText(node.name, 25)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* 줌 컨트롤 */}
          <div className="absolute bottom-4 right-4 flex gap-1 bg-bg-secondary/90 backdrop-blur rounded-xl p-1 shadow-lg border border-text-tertiary/10">
            <button
              onClick={() => setScale((s) => Math.min(s * 1.2, 3))}
              className="w-8 h-8 hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-text-primary transition-colors text-lg"
            >
              +
            </button>
            <button
              onClick={() => setScale((s) => Math.max(s / 1.2, 0.3))}
              className="w-8 h-8 hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-text-primary transition-colors text-lg"
            >
              −
            </button>
            <div className="w-px bg-text-tertiary/20 my-1" />
            <button
              onClick={() => {
                setScale(1);
                setOffset({ x: 0, y: 0 });
              }}
              className="px-3 h-8 hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-xs text-text-secondary transition-colors"
            >
              Reset
            </button>
          </div>

          {/* 줌 레벨 표시 */}
          <div className="absolute bottom-4 left-4 px-2 py-1 bg-bg-secondary/80 backdrop-blur rounded-lg text-[10px] text-text-secondary">
            {Math.round(scale * 100)}%
          </div>
        </div>

        {/* 상세 정보 패널 */}
        <div className="w-80 border-l border-text-tertiary/20 overflow-y-auto bg-bg-secondary/30">
          {selectedNode ? (
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${NODE_COLORS[selectedNode.type]?.gradient || "#9CA3AF"} 0%, ${NODE_COLORS[selectedNode.type]?.fill || "#9CA3AF"} 100%)`,
                  }}
                >
                  {NODE_ABBR[selectedNode.type] || "??"}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[10px] font-medium px-2 py-0.5 bg-bg-tertiary rounded-full text-text-secondary mb-1">
                    {selectedNode.type}
                  </span>
                  <h3 className="text-sm font-semibold text-text-primary leading-tight">
                    {selectedNode.name}
                  </h3>
                </div>
              </div>

              <div className="mb-4 p-3 bg-bg-tertiary/50 rounded-xl">
                <p className="text-xs text-text-secondary leading-relaxed">
                  {selectedNode.description}
                </p>
              </div>

              <h4 className="text-xs font-semibold text-text-primary mb-2 uppercase tracking-wider">
                Connections ({edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length})
              </h4>
              <div className="space-y-2">
                {edges
                  .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                  .map((edge, idx) => {
                    const isSource = edge.source === selectedNode.id;
                    const otherNodeId = isSource ? edge.target : edge.source;
                    const otherNode = nodeById(otherNodeId);
                    const color = EDGE_COLORS[edge.type] || "#9CA3AF";

                    return (
                      <div
                        key={idx}
                        className="p-2.5 bg-bg-tertiary/50 hover:bg-bg-tertiary rounded-xl text-xs cursor-pointer transition-colors"
                        onClick={() => otherNode && setSelectedNode(otherNode)}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
                            style={{ backgroundColor: color }}
                          >
                            {edge.type}
                          </span>
                          <span className="text-text-placeholder text-[10px]">
                            {isSource ? "→" : "←"}
                          </span>
                          {edge.confidence && (
                            <span className="text-[10px] text-text-placeholder ml-auto">
                              {Math.round(edge.confidence * 100)}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-bold text-white flex-shrink-0"
                            style={{
                              backgroundColor: NODE_COLORS[otherNode?.type || ""]?.fill || "#9CA3AF",
                            }}
                          >
                            {NODE_ABBR[otherNode?.type || ""] || "??"}
                          </div>
                          <p className="text-text-primary truncate">
                            {truncateText(otherNode?.name || otherNodeId, 35)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : hoveredEdge ? (
            <div className="p-4">
              <div
                className="inline-block px-2.5 py-1 rounded-lg text-white text-xs font-medium mb-3"
                style={{ backgroundColor: EDGE_COLORS[hoveredEdge.type] || "#9CA3AF" }}
              >
                {hoveredEdge.type}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">
                {hoveredEdge.description}
              </p>
              {hoveredEdge.confidence && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${hoveredEdge.confidence * 100}%`,
                        backgroundColor: EDGE_COLORS[hoveredEdge.type] || "#9CA3AF",
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-placeholder">
                    {Math.round(hoveredEdge.confidence * 100)}%
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-bg-tertiary/50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-text-placeholder" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-text-primary mb-1">
                Select a Node
              </p>
              <p className="text-xs text-text-secondary">
                {viewMode === "network"
                  ? "Click on any node to explore its details and connections"
                  : "Click a node to reveal cross-cluster edges"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getTextWidth(text: string): number {
  return text.length * 5.5;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
