import * as d3Force from "d3-force";
import React, { useEffect, useRef, useState } from "react";

type Node = {
  id: number;
  orig_id: string;
  cluster_id: string;
  cluster_name: string;
  num_messages: number;
};

type Edge = {
  source: number;
  target: number;
};

type SimNode = d3Force.SimulationNodeDatum &
  Node & {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    edgeCount: number;
  };

type PositionedNode = Node & {
  x: number;
  y: number;
  edgeCount: number;
};

type PositionedEdge = Edge & {
  isIntraCluster: boolean;
};

type ClusterCircle = {
  clusterId: string;
  clusterName: string;
  centerX: number;
  centerY: number;
  radius: number;
};

function classifyEdges(
  nodes: Node[],
  edges: Edge[]
): {
  edges: PositionedEdge[];
  nodeMap: Map<number, Node>;
  edgeCounts: Map<number, number>;
} {
  const nodeMap = new Map<number, Node>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // 노드별 엣지 수 계산
  const edgeCounts = new Map<number, number>();
  nodes.forEach((n) => edgeCounts.set(n.id, 0));

  edges.forEach((e) => {
    edgeCounts.set(e.source, (edgeCounts.get(e.source) ?? 0) + 1);
    edgeCounts.set(e.target, (edgeCounts.get(e.target) ?? 0) + 1);
  });

  const positionedEdges = edges.map((e) => {
    const s = nodeMap.get(e.source);
    const t = nodeMap.get(e.target);
    const isIntra = s && t && s.cluster_id === t.cluster_id;
    return { ...e, isIntraCluster: !!isIntra };
  });

  return { edges: positionedEdges, nodeMap, edgeCounts };
}

function layoutWithBoundedForce(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number
): {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  circles: ClusterCircle[];
} {
  const { edges: classifiedEdges, edgeCounts } = classifyEdges(nodes, edges);

  // 클러스터별 노드 그룹화
  const clusterGroups = new Map<string, Node[]>();
  nodes.forEach((n) => {
    const list = clusterGroups.get(n.cluster_id) ?? [];
    list.push(n);
    clusterGroups.set(n.cluster_id, list);
  });

  const clusterIds = Array.from(clusterGroups.keys());
  const K = clusterIds.length;

  const centerX = width / 2;
  const centerY = height / 2;
  const bigRadius = Math.min(width, height) * 0.35;

  const positionedNodes: PositionedNode[] = [];
  const circles: ClusterCircle[] = [];

  clusterIds.forEach((clusterId, idx) => {
    const clusterNodes = clusterGroups.get(clusterId)!;

    const theta = (2 * Math.PI * idx) / K;
    const cx = centerX + bigRadius * Math.cos(theta);
    const cy = centerY + bigRadius * Math.sin(theta);

    const n = clusterNodes.length;

    const tempNodeMap = new Map(clusterNodes.map((n) => [n.id, n]));
    const clusterEdges = classifiedEdges.filter(
      (e) =>
        e.isIntraCluster &&
        tempNodeMap.has(e.source) &&
        tempNodeMap.has(e.target)
    );
    const edgeCount = clusterEdges.length;

    const baseRadius = 15; // 기본 최소 반경
    const nodeScaleFactor = 8; // 노드 수에 따른 크기 증가율
    const edgeScaleFactor = 4; // 엣지 수에 따른 크기 증가율
    const clusterRadius =
      baseRadius +
      nodeScaleFactor * Math.sqrt(n) +
      edgeScaleFactor * Math.sqrt(edgeCount);

    // 이제 clusterRadius를 사용하여 simNodes를 생성합니다.
    const simNodes: SimNode[] = clusterNodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / n;
      const r = clusterRadius * 0.3;
      const jitter = 5;
      return {
        ...node,
        x: cx + r * Math.cos(angle) + (Math.random() - 0.5) * jitter,
        y: cy + r * Math.sin(angle) + (Math.random() - 0.5) * jitter,
        edgeCount: edgeCounts.get(node.id) ?? 0,
      };
    });

    const nodeMap = new Map(simNodes.map((n) => [n.id, n]));

    const simClusterEdges = clusterEdges.map((e) => ({
      source: nodeMap.get(e.source)!,
      target: nodeMap.get(e.target)!,
    }));

    const density = edgeCount / Math.max(n, 1);

    const chargeStrength = -20 - Math.sqrt(n) * 3 - density * 2;
    const collideRadius = 12 + Math.min(10, density * 1.5);
    const radialRadius = clusterRadius * 0.3;
    const boundaryRadius = clusterRadius * 0.9;

    const simulation = d3Force
      .forceSimulation<SimNode>(simNodes)
      .force("center", d3Force.forceCenter(cx, cy))
      .force("radial", d3Force.forceRadial(0, cx, cy).strength(0.06))
      .force("charge", d3Force.forceManyBody().strength(chargeStrength))
      .force(
        "link",
        d3Force
          .forceLink<SimNode, any>(simClusterEdges)
          .id((d: any) => d.id)
          .distance(20 + Math.min(15, density * 1.2))
          .strength(0.5)
      )
      .force("collision", d3Force.forceCollide(collideRadius).iterations(3))
      .stop();

    for (let i = 0; i < 150; i++) {
      simulation.tick();

      simNodes.forEach((node) => {
        const dx = node.x! - cx;
        const dy = node.y! - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > boundaryRadius) {
          const k = boundaryRadius / dist;
          node.x = cx + dx * k;
          node.y = cy + dy * k;
        }
      });
    }

    simNodes.forEach((sn) => {
      positionedNodes.push({
        id: sn.id,
        orig_id: sn.orig_id,
        cluster_id: sn.cluster_id,
        cluster_name: sn.cluster_name,
        num_messages: sn.num_messages,
        x: sn.x!,
        y: sn.y!,
        edgeCount: sn.edgeCount,
      });
    });

    if (clusterNodes.length === 0) return;

    circles.push({
      clusterId,
      clusterName: clusterNodes[0].cluster_name,
      centerX: cx,
      centerY: cy,
      radius: clusterRadius,
    });
  });

  // 클러스터별 원형 아웃라인 계산
  return {
    nodes: positionedNodes,
    edges: classifiedEdges,
    circles,
  };
}

// 노드 크기 계산 (엣지 수 기반)
const BASE_NODE_RADIUS = 3;
const MAX_NODE_RADIUS = 5;

function getNodeRadius(edgeCount: number, maxEdgeCount: number): number {
  if (maxEdgeCount === 0) return BASE_NODE_RADIUS;
  const scale = edgeCount / maxEdgeCount;
  return (
    BASE_NODE_RADIUS + (MAX_NODE_RADIUS - BASE_NODE_RADIUS) * Math.sqrt(scale)
  );
}

type GraphProps = {
  rawNodes: Node[];
  rawEdges: Edge[];
  width: number;
  height: number;
};

export default function ClusterGraph({
  rawNodes,
  rawEdges,
  width,
  height,
}: GraphProps) {
  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [edges, setEdges] = useState<PositionedEdge[]>([]);
  const [circles, setCircles] = useState<ClusterCircle[]>([]);
  const [maxEdgeCount, setMaxEdgeCount] = useState(0);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<number | null>(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);

  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const dragNodeOffset = useRef<{ dx: number; dy: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // 엣지 분류
  const normalIntraEdges = edges.filter((e) => {
    if (!e.isIntraCluster) return false;
    if (!focusNodeId) return true;
    return e.source !== focusNodeId && e.target !== focusNodeId;
  });

  const focusedIntraEdges = edges.filter((e) => {
    if (!focusNodeId) return false;
    if (!e.isIntraCluster) return false;
    return e.source === focusNodeId || e.target === focusNodeId;
  });

  const focusedInterEdges = edges.filter((e) => {
    if (!focusNodeId) return false;
    if (e.isIntraCluster) return false;
    return e.source === focusNodeId || e.target === focusNodeId;
  });

  const normalInterEdges = edges.filter((e) => {
    if (e.isIntraCluster) return false;
    if (focusNodeId === null) return true;
    return e.source !== focusNodeId && e.target !== focusNodeId;
  });

  useEffect(() => {
    if (rawNodes.length === 0) return;

    const { nodes, edges, circles } = layoutWithBoundedForce(
      rawNodes,
      rawEdges,
      width,
      height
    );
    setNodes(nodes);
    setEdges(edges);
    setCircles(circles);

    const max = Math.max(...nodes.map((n) => n.edgeCount), 1);
    setMaxEdgeCount(max);
  }, [rawNodes, rawEdges, width, height]);

  const nodeById = (id: number) => nodes.find((n) => n.id === id);

  const screenToWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const worldX = (mouseX - offset.x) / scale;
    const worldY = (mouseY - offset.y) / scale;
    return { worldX, worldY };
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const zoomIntensity = 0.003;
    const { clientX, clientY, deltaY } = e;

    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const worldX = (mouseX - offset.x) / scale;
    const worldY = (mouseY - offset.y) / scale;

    const newScale = scale * (1 - deltaY * zoomIntensity);
    const clampedScale = Math.min(Math.max(newScale, 0.1), 5);

    const newOffsetX = mouseX - worldX * clampedScale;
    const newOffsetY = mouseY - worldY * clampedScale;

    setScale(clampedScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingNodeId !== null) return;
    setIsPanning(true);
    panStart.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingNodeId !== null && dragNodeOffset.current) {
      const { worldX, worldY } = screenToWorld(e.clientX, e.clientY);

      const newX = worldX + dragNodeOffset.current.dx;
      const newY = worldY + dragNodeOffset.current.dy;

      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n
        )
      );
      return;
    }

    if (!isPanning || !panStart.current) return;
    setOffset({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    panStart.current = null;
    setDraggingNodeId(null);
    dragNodeOffset.current = null;
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    panStart.current = null;
    setDraggingNodeId(null);
    dragNodeOffset.current = null;
  };

  const handleNodeMouseDown = (
    e: React.MouseEvent<SVGCircleElement>,
    nodeId: number
  ) => {
    e.stopPropagation();
    const { worldX, worldY } = screenToWorld(e.clientX, e.clientY);
    const node = nodeById(nodeId);
    if (!node) return;

    dragNodeOffset.current = {
      dx: node.x - worldX,
      dy: node.y - worldY,
    };
    setDraggingNodeId(nodeId);
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* 툴팁 */}
      {hoveredId != null &&
        (() => {
          const n = nodeById(hoveredId);
          if (!n) return null;
          const left = n.x * scale + offset.x;
          const top = n.y * scale + offset.y - 24;

          return (
            <div
              style={{
                position: "absolute",
                left,
                top,
                transform: "translate(-50%, -100%)",
                padding: "2px 6px",
                fontSize: 10,
                background: "rgba(0,0,0,0.7)",
                color: "white",
                borderRadius: 4,
                pointerEvents: "none",
                whiteSpace: "nowrap",
                zIndex: 10,
              }}
            >
              {n.orig_id}
            </div>
          );
        })()}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{
          border: "1px solid #eee",
          cursor:
            draggingNodeId !== null
              ? "grabbing"
              : isPanning
                ? "grabbing"
                : "grab",
          touchAction: "none",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          {/* 클러스터 원형 아웃라인 */}
          {circles.map((circle) => (
            <g key={`circle-${circle.clusterId}`}>
              <circle
                cx={circle.centerX}
                cy={circle.centerY}
                r={circle.radius}
                fill="#f5f5f5"
                stroke="#e0e0e0"
                strokeWidth={1}
                style={{ pointerEvents: "none" }}
              />
            </g>
          ))}

          {/* 클러스터 라벨 */}
          {circles.map((circle) => (
            <text
              key={`label-${circle.clusterId}`}
              x={circle.centerX}
              y={circle.centerY - circle.radius - 12}
              textAnchor="middle"
              fontSize={16}
              fontWeight={600}
              fill="#ccc"
              style={{ pointerEvents: "none" }}
            >
              {circle.clusterId}
            </text>
          ))}

          {/* Inter-cluster 엣지 (일반) */}
          {normalInterEdges.map((e, idx) => {
            const s = nodeById(e.source);
            const t = nodeById(e.target);
            if (!s || !t) return null;
            return (
              <line
                key={`inter-normal-${idx}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="#f0f0f0" // 아주 연한 색
                strokeWidth={0.5}
              />
            );
          })}

          {/* Intra-cluster 엣지 (일반) */}
          {normalIntraEdges.map((e, idx) => {
            const s = nodeById(e.source);
            const t = nodeById(e.target);
            if (!s || !t) return null;
            return (
              <line
                key={`intra-normal-${idx}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="#c7c7c7"
                strokeWidth={0.5}
              />
            );
          })}

          {/* 포커스된 노드의 엣지 */}
          {[...focusedIntraEdges, ...focusedInterEdges].map((e, idx) => {
            const s = nodeById(e.source);
            const t = nodeById(e.target);
            if (!s || !t) return null;
            return (
              <line
                key={`focus-${idx}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="#ff4d4f"
                strokeWidth={1.5}
              />
            );
          })}

          {/* 노드 */}
          {nodes.map((n) => {
            const isHovered = hoveredId === n.id;
            const isFocused = focusNodeId === n.id;

            const baseRadius = getNodeRadius(n.edgeCount, maxEdgeCount);
            const radius = isHovered ? baseRadius + 2 : baseRadius;

            const fill = isFocused
              ? "#ff4d4f"
              : isHovered
                ? "#EF7233"
                : "#767676";

            return (
              <circle
                key={n.id}
                cx={n.x}
                cy={n.y}
                r={radius}
                fill={fill}
                style={{ cursor: "pointer" }}
                onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setFocusNodeId((prev) => (prev === n.id ? null : n.id));
                }}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
