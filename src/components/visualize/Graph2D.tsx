import threadRepo from "@/managers/threadRepo";
import * as d3Force from "d3-force";
import {
  GraphEdgeDto,
  GraphNodeDto,
} from "node_modules/@taco_tsinghua/graphnode-sdk/dist/types/graph";
import React, { useEffect, useRef, useState } from "react";
import NodeChatPreview from "./NodeChatPreview";

type SimNode = d3Force.SimulationNodeDatum &
  GraphNodeDto & {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    edgeCount: number;
  };

type PositionedNode = GraphNodeDto & {
  x: number;
  y: number;
  edgeCount: number;
};

type PositionedEdge = GraphEdgeDto & {
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
  nodes: GraphNodeDto[],
  edges: GraphEdgeDto[]
): {
  edges: PositionedEdge[];
  nodeMap: Map<number, GraphNodeDto>;
  edgeCounts: Map<number, number>;
} {
  const nodeMap = new Map<number, GraphNodeDto>();
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
    const isIntra = s && t && s.clusterName === t.clusterName;
    return { ...e, isIntraCluster: !!isIntra };
  });

  return { edges: positionedEdges, nodeMap, edgeCounts };
}

function layoutWithBoundedForce(
  nodes: GraphNodeDto[],
  edges: GraphEdgeDto[],
  width: number,
  height: number
): {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  circles: ClusterCircle[];
} {
  const { edges: classifiedEdges, edgeCounts } = classifyEdges(nodes, edges);

  // 클러스터별 노드 그룹화
  const clusterGroups = new Map<string, GraphNodeDto[]>();
  nodes.forEach((n) => {
    // cluster_name을 기준으로 그룹화
    const list = clusterGroups.get(n.clusterName) ?? [];
    list.push(n);
    clusterGroups.set(n.clusterName, list);
  });

  const clusterNames = Array.from(clusterGroups.keys());
  const K = clusterNames.length;

  const centerX = width / 2;
  const centerY = height / 2;
  const bigRadius = Math.min(width, height) * 0.4;

  const allSimNodes: SimNode[] = [];
  const circles: ClusterCircle[] = [];

  clusterNames.forEach((clusterName, idx) => {
    const clusterNodes = clusterGroups.get(clusterName)!;

    const theta = (2 * Math.PI * idx) / K;
    const cx = centerX + bigRadius * Math.cos(theta);
    const cy = centerY + bigRadius * Math.sin(theta);

    const n = clusterNodes.length;

    const tempNodeMap = new Map(clusterNodes.map((n) => [n.id, n]));
    const intraClusterEdges = classifiedEdges.filter(
      (e) =>
        e.isIntraCluster &&
        tempNodeMap.has(e.source) &&
        tempNodeMap.has(e.target)
    );
    const edgeCount = intraClusterEdges.length;

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

    const simClusterEdges = intraClusterEdges.map((e) => ({
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

    allSimNodes.push(...simNodes);

    if (clusterNodes.length === 0) return;

    circles.push({
      clusterId: clusterName, // clusterName을 ID로 사용
      clusterName: clusterName,
      centerX: cx,
      centerY: cy,
      radius: clusterRadius,
    });
  });

  const positionedNodes: PositionedNode[] = allSimNodes.map((sn) => ({
    id: sn.id,
    userId: sn.userId,
    timestamp: sn.timestamp,
    origId: sn.origId,
    clusterId: sn.clusterId,
    clusterName: sn.clusterName,
    numMessages: sn.numMessages,
    x: sn.x!,
    y: sn.y!,
    edgeCount: sn.edgeCount,
  }));

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
  rawNodes: GraphNodeDto[];
  rawEdges: GraphEdgeDto[];
  width: number;
  height: number;
  avatarUrl: string | null;
};

export default function Graph2D({
  rawNodes,
  rawEdges,
  width,
  height,
  avatarUrl,
}: GraphProps) {
  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [edges, setEdges] = useState<PositionedEdge[]>([]);
  const [circles, setCircles] = useState<ClusterCircle[]>([]);
  const [maxEdgeCount, setMaxEdgeCount] = useState(0);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoveredThreadTitle, setHoveredThreadTitle] = useState<string | null>(
    null
  );
  const [focusNodeId, setFocusNodeId] = useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);

  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const dragNodeOffset = useRef<{ dx: number; dy: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const [draggingClusterId, setDraggingClusterId] = useState<string | null>(
    null
  );
  const dragClusterOffset = useRef<{ dx: number; dy: number } | null>(null);

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
    return true;
  });

  // hoveredId가 변경될 때 thread title 가져오기
  useEffect(() => {
    if (hoveredId == null) {
      setHoveredThreadTitle(null);
      return;
    }

    const n = nodes.find((node) => node.id === hoveredId);
    if (!n) {
      setHoveredThreadTitle(null);
      return;
    }

    threadRepo
      .getThreadById(n.origId)
      .then((thread) => {
        setHoveredThreadTitle(thread?.title || null);
      })
      .catch(() => {
        setHoveredThreadTitle(null);
      });
  }, [hoveredId, nodes]);

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
    if (draggingClusterId && dragClusterOffset.current) {
      const { worldX, worldY } = screenToWorld(e.clientX, e.clientY);
      const newCenterX = worldX + dragClusterOffset.current.dx;
      const newCenterY = worldY + dragClusterOffset.current.dy;

      const originalCircle = circles.find(
        (c) => c.clusterId === draggingClusterId
      );
      if (!originalCircle) return;

      const dx = newCenterX - originalCircle.centerX;
      const dy = newCenterY - originalCircle.centerY;

      setCircles((prev) =>
        prev.map((c) =>
          c.clusterId === draggingClusterId
            ? { ...c, centerX: newCenterX, centerY: newCenterY }
            : c
        )
      );

      setNodes((prev) =>
        prev.map((n) =>
          n.clusterName === draggingClusterId
            ? { ...n, x: n.x + dx, y: n.y + dy }
            : n
        )
      );

      return;
    }

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

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsPanning(false);
    panStart.current = null;

    // 드래그가 발생했는지 확인 (5px 이상 이동했으면 드래그로 간주)
    const wasDragging =
      dragStartPos.current &&
      (() => {
        const dx = Math.abs(e.clientX - dragStartPos.current!.x);
        const dy = Math.abs(e.clientY - dragStartPos.current!.y);
        return Math.sqrt(dx * dx + dy * dy) > 5;
      })();

    const prevDraggingNodeId = draggingNodeId;
    setDraggingNodeId(null);
    setDraggingClusterId(null);
    dragNodeOffset.current = null;
    dragClusterOffset.current = null;
    dragStartPos.current = null;

    // 드래그가 아니고 노드를 클릭한 경우에만 채팅 미리보기 표시
    if (!wasDragging && prevDraggingNodeId) {
      const node = nodeById(prevDraggingNodeId);
      if (node) {
        setSelectedNodeId(node.origId);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    panStart.current = null;
    setDraggingNodeId(null);
    setDraggingClusterId(null);
    dragNodeOffset.current = null;
    dragClusterOffset.current = null;
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
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDraggingNodeId(nodeId);
  };

  const handleClusterLabelMouseDown = (
    e: React.MouseEvent<SVGTextElement>,
    clusterId: string
  ) => {
    e.stopPropagation();
    const { worldX, worldY } = screenToWorld(e.clientX, e.clientY);
    const circle = circles.find((c) => c.clusterId === clusterId);
    if (!circle) return;

    dragClusterOffset.current = {
      dx: circle.centerX - worldX,
      dy: circle.centerY - worldY,
    };
    setDraggingClusterId(clusterId);
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* 툴팁 */}
      {hoveredId != null &&
        hoveredThreadTitle != null &&
        (() => {
          const n = nodeById(hoveredId);
          if (!n) return null;
          const left = n.x * scale + offset.x;
          const top = n.y * scale + offset.y - 24;

          return (
            <div
              id={n.origId}
              className="absolute -translate-x-1/2 -translate-y-full py-0.5 px-1.5 text-[10px] bg-sidebar-button-hover text-primary rounded pointer-events-none whitespace-nowrap z-10"
              style={{
                left,
                top,
              }}
            >
              {hoveredThreadTitle}
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
                : draggingClusterId
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
                fill="var(--color-cluster-default)"
                stroke="var(--color-edge-default)"
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
              fill="var(--color-text-secondary)"
              style={{
                cursor:
                  draggingClusterId === circle.clusterId ? "grabbing" : "grab",
                pointerEvents: "all",
                userSelect: "none",
              }}
              onMouseDown={(e) =>
                handleClusterLabelMouseDown(e, circle.clusterId)
              }
            >
              {circle.clusterName}
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
                stroke="var(--color-edge-default)"
                strokeWidth={0.5}
                strokeOpacity={0.7}
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
                stroke="var(--color-edge-default)"
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
                stroke="var(--color-primary)"
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
              ? "var(--color-node-focus)"
              : isHovered
                ? "var(--color-node-focus)"
                : "var(--color-node-default)";

            return (
              <circle
                key={n.id}
                cx={n.x}
                cy={n.y}
                r={radius}
                fill={fill}
                className="cursor-pointer shadow-[0_2px_20px_#BADAFF]"
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

      {/* 노드 클릭 시 채팅 미리보기 */}
      {selectedNodeId && (
        <NodeChatPreview
          threadId={selectedNodeId}
          avatarUrl={avatarUrl}
          onClose={() => setSelectedNodeId(null)}
          onExpand={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}
