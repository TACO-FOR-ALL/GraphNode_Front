import * as d3Force from "d3-force";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Node = {
  id: number;
  orig_id: string;
  cluster_id: string;
  cluster_name: string;
  num_messages: number;
  subcluster_id: string | null;
};

type Edge = {
  source: number;
  target: number;
};

type Subcluster = {
  id: string;
  cluster_id: string;
  node_ids: number[];
  representative_node_id: number;
  size: number;
  density: number;
  avg_similarity?: number;
  internal_edges?: number;
  cohesion_score?: number;
  top_keywords: string[];
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

type DisplayNode = {
  id: string | number;
  isGroupNode?: boolean;
  subcluster_id?: string | null;
  x: number;
  y: number;
  size?: number;
  color?: string;
  label?: string;
  edgeCount?: number;
  cluster_name?: string;
  orig_node?: PositionedNode;
};

type DisplayEdge = {
  source: string | number;
  target: string | number;
  isIntraCluster: boolean;
  id?: string;
};

function classifyEdges(
  nodes: Node[],
  edges: Edge[],
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
    const isIntra = s && t && s.cluster_name === t.cluster_name;
    return { ...e, isIntraCluster: !!isIntra };
  });

  return { edges: positionedEdges, nodeMap, edgeCounts };
}

// 클러스터별로 서브클러스터 그룹화
function groupSubclustersByCluster(
  subclusters: Subcluster[],
): Map<string, Subcluster[]> {
  const subclustersByCluster = new Map<string, Subcluster[]>();
  subclusters.forEach((sc) => {
    const list = subclustersByCluster.get(sc.cluster_id) ?? [];
    list.push(sc);
    subclustersByCluster.set(sc.cluster_id, list);
  });
  return subclustersByCluster;
}

// 노드 -> 서브클러스터 매핑 생성
function createNodeToSubclusterMap(
  subclusters: Subcluster[],
): Map<number, string> {
  const nodeToSubcluster = new Map<number, string>();
  subclusters.forEach((sc) => {
    sc.node_ids.forEach((nodeId) => {
      nodeToSubcluster.set(nodeId, sc.id);
    });
  });
  return nodeToSubcluster;
}

function getVisibleGraph(
  allNodes: PositionedNode[],
  allEdges: Edge[],
  subclusters: Subcluster[],
  collapsedSet: Set<string>,
): { visibleNodes: DisplayNode[]; visibleEdges: DisplayEdge[] } {
  const nodeToSubcluster = createNodeToSubclusterMap(subclusters);
  const scMap = new Map(subclusters.map((sc) => [sc.id, sc]));

  const nodeMap = new Map<number, DisplayNode>();
  const visibleNodes: DisplayNode[] = [];

  // 그룹 노드 생성 (접힌 서브클러스터)
  collapsedSet.forEach((scId) => {
    const sc = scMap.get(scId);
    if (!sc) return;

    let sumX = 0;
    let sumY = 0;
    let count = 0;
    let clusterName: string | undefined;

    const memberNodeIds = new Set(sc.node_ids);
    allNodes.forEach((n) => {
      if (!memberNodeIds.has(n.id)) return;
      sumX += n.x;
      sumY += n.y;
      count += 1;
      if (!clusterName) clusterName = n.cluster_name;
    });

    const groupNodeId = `__group_${scId}`;
    const groupNode: DisplayNode = {
      id: groupNodeId,
      isGroupNode: true,
      subcluster_id: scId,
      label: sc.top_keywords?.[0] || `Group ${scId}`,
      x: count > 0 ? sumX / count : 0,
      y: count > 0 ? sumY / count : 0,
      size: sc.size,
      color: "#722ed1",
      edgeCount: 0,
      cluster_name: clusterName,
    };

    visibleNodes.push(groupNode);
    sc.node_ids.forEach((nodeId) => {
      nodeMap.set(nodeId, groupNode);
    });
  });

  // 일반 노드 처리
  allNodes.forEach((node) => {
    const scId = node.subcluster_id ?? nodeToSubcluster.get(node.id);
    if (scId && collapsedSet.has(scId)) return;

    const displayNode: DisplayNode = {
      id: node.id,
      isGroupNode: false,
      subcluster_id: scId ?? null,
      label: node.orig_id,
      x: node.x,
      y: node.y,
      edgeCount: node.edgeCount,
      cluster_name: node.cluster_name,
      orig_node: node,
    };

    visibleNodes.push(displayNode);
    nodeMap.set(node.id, displayNode);
  });

  const visibleEdges: DisplayEdge[] = [];
  const edgeKeys = new Set<string>();
  const edgeCounts = new Map<string | number, number>();

  allEdges.forEach((e) => {
    const sNode = nodeMap.get(e.source);
    const tNode = nodeMap.get(e.target);
    if (!sNode || !tNode) return;
    if (sNode.id === tNode.id) return;

    const key = [String(sNode.id), String(tNode.id)].sort().join("-");
    if (edgeKeys.has(key)) return;

    edgeKeys.add(key);
    visibleEdges.push({
      source: sNode.id,
      target: tNode.id,
      isIntraCluster: !!(
        sNode.cluster_name &&
        tNode.cluster_name &&
        sNode.cluster_name === tNode.cluster_name
      ),
      id: key,
    });

    edgeCounts.set(sNode.id, (edgeCounts.get(sNode.id) ?? 0) + 1);
    edgeCounts.set(tNode.id, (edgeCounts.get(tNode.id) ?? 0) + 1);
  });

  const nodesWithEdgeCounts = visibleNodes.map((n) => ({
    ...n,
    edgeCount: edgeCounts.get(n.id) ?? n.edgeCount ?? 0,
  }));

  return { visibleNodes: nodesWithEdgeCounts, visibleEdges };
}

function layoutWithBoundedForce(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number,
): {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  circles: ClusterCircle[];
} {
  const { edges: classifiedEdges, edgeCounts } = classifyEdges(nodes, edges);

  // 클러스터별 노드 그룹화
  const clusterGroups = new Map<string, Node[]>();
  nodes.forEach((n) => {
    // cluster_name을 기준으로 그룹화
    const list = clusterGroups.get(n.cluster_name) ?? [];
    list.push(n);
    clusterGroups.set(n.cluster_name, list);
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
        tempNodeMap.has(e.target),
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
          .strength(0.5),
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
    orig_id: sn.orig_id,
    cluster_id: sn.cluster_id,
    cluster_name: sn.cluster_name,
    num_messages: sn.num_messages,
    subcluster_id: sn.subcluster_id,
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
  rawNodes: Node[];
  rawEdges: Edge[];
  rawSubclusters?: Subcluster[];
  width: number;
  height: number;
};

const EMPTY_SUBCLUSTERS: Subcluster[] = [];

export default function ClusterGraph({
  rawNodes,
  rawEdges,
  rawSubclusters,
  width,
  height,
}: GraphProps) {
  const subclustersInput = rawSubclusters ?? EMPTY_SUBCLUSTERS;
  const [positionedNodes, setPositionedNodes] = useState<PositionedNode[]>([]);
  const [displayNodes, setDisplayNodes] = useState<DisplayNode[]>([]);
  const [displayEdges, setDisplayEdges] = useState<DisplayEdge[]>([]);
  const [circles, setCircles] = useState<ClusterCircle[]>([]);
  const [maxEdgeCount, setMaxEdgeCount] = useState(0);

  // 서브클러스터 관련 상태
  const [subclusters, setSubclusters] = useState<Subcluster[]>([]);
  const [collapsedSubclusters, setCollapsedSubclusters] = useState<Set<string>>(
    () => new Set(subclustersInput.map((sc) => sc.id)),
  );

  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<number | null>(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);

  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const dragNodeOffset = useRef<{ dx: number; dy: number } | null>(null);
  const [draggingClusterId, setDraggingClusterId] = useState<string | null>(
    null,
  );
  const dragClusterOffset = useRef<{ dx: number; dy: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const displayNodeMap = useMemo(
    () => new Map(displayNodes.map((n) => [n.id, n])),
    [displayNodes],
  );

  const focusActive = focusNodeId !== null && displayNodeMap.has(focusNodeId);

  // 엣지 분류
  const normalIntraEdges = displayEdges.filter((e) => {
    if (!e.isIntraCluster) return false;
    if (!focusActive) return true;
    return e.source !== focusNodeId && e.target !== focusNodeId;
  });

  const focusedIntraEdges = displayEdges.filter((e) => {
    if (!focusActive) return false;
    if (!e.isIntraCluster) return false;
    return e.source === focusNodeId || e.target === focusNodeId;
  });

  const focusedInterEdges = displayEdges.filter((e) => {
    if (!focusActive) return false;
    if (e.isIntraCluster) return false;
    return e.source === focusNodeId || e.target === focusNodeId;
  });

  const normalInterEdges = displayEdges.filter((e) => {
    if (e.isIntraCluster) return false;
    return true;
  });

  useEffect(() => {
    if (rawNodes.length === 0) return;

    const { nodes, circles } = layoutWithBoundedForce(
      rawNodes,
      rawEdges,
      width,
      height,
    );
    setPositionedNodes(nodes);
    setCircles(circles);
  }, [rawNodes, rawEdges, width, height]);

  // 서브클러스터 초기화 (초기에는 모두 접힌 상태)
  useEffect(() => {
    setSubclusters(subclustersInput);
    setCollapsedSubclusters(new Set(subclustersInput.map((sc) => sc.id)));
  }, [subclustersInput]);

  useEffect(() => {
    if (positionedNodes.length === 0) return;
    const { visibleNodes, visibleEdges } = getVisibleGraph(
      positionedNodes,
      rawEdges,
      subclusters,
      collapsedSubclusters,
    );
    setDisplayNodes(visibleNodes);
    setDisplayEdges(visibleEdges);

    const max = Math.max(...visibleNodes.map((n) => n.edgeCount ?? 0), 1);
    setMaxEdgeCount(max);
  }, [positionedNodes, rawEdges, subclusters, collapsedSubclusters]);

  const positionedNodeById = (id: number) =>
    positionedNodes.find((n) => n.id === id);

  const displayNodeById = (id: string | number) =>
    displayNodes.find((n) => n.id === id);

  const nodeToSubclusterMap = useMemo(
    () => createNodeToSubclusterMap(subclusters),
    [subclusters],
  );

  const subclusterMap = useMemo(
    () => new Map(subclusters.map((sc) => [sc.id, sc])),
    [subclusters],
  );

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
        (c) => c.clusterId === draggingClusterId,
      );
      if (!originalCircle) return;

      const dx = newCenterX - originalCircle.centerX;
      const dy = newCenterY - originalCircle.centerY;

      setCircles((prev) =>
        prev.map((c) =>
          c.clusterId === draggingClusterId
            ? { ...c, centerX: newCenterX, centerY: newCenterY }
            : c,
        ),
      );

      setPositionedNodes((prev) =>
        prev.map((n) =>
          n.cluster_name === draggingClusterId
            ? { ...n, x: n.x + dx, y: n.y + dy }
            : n,
        ),
      );

      return;
    }

    if (draggingNodeId !== null && dragNodeOffset.current) {
      const { worldX, worldY } = screenToWorld(e.clientX, e.clientY);

      const newX = worldX + dragNodeOffset.current.dx;
      const newY = worldY + dragNodeOffset.current.dy;

      setPositionedNodes((prev) =>
        prev.map((n) =>
          n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n,
        ),
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
    setDraggingClusterId(null);
    dragNodeOffset.current = null;
    dragClusterOffset.current = null;
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
    e: React.MouseEvent<SVGElement>,
    node: DisplayNode,
  ) => {
    e.stopPropagation();
    if (node.isGroupNode || typeof node.id !== "number") return;
    const { worldX, worldY } = screenToWorld(e.clientX, e.clientY);
    const positionedNode = positionedNodeById(node.id);
    if (!positionedNode) return;

    dragNodeOffset.current = {
      dx: positionedNode.x - worldX,
      dy: positionedNode.y - worldY,
    };
    setDraggingNodeId(node.id);
  };

  const handleClusterLabelMouseDown = (
    e: React.MouseEvent<SVGTextElement>,
    clusterId: string,
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

  // 서브클러스터 클릭 핸들러 - 접기/펴기 토글
  const handleSubclusterClick = (subclusterId: string) => {
    setCollapsedSubclusters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subclusterId)) {
        newSet.delete(subclusterId); // 펴기
      } else {
        newSet.add(subclusterId); // 접기
      }
      return newSet;
    });
  };

  // 노드 클릭 핸들러 - 서브클러스터에 속한 경우 서브클러스터 접기
  const handleNodeClick = (e: React.MouseEvent, node: DisplayNode) => {
    e.stopPropagation();

    if (node.isGroupNode) {
      if (node.subcluster_id) {
        handleSubclusterClick(node.subcluster_id);
      }
      return;
    }

    if (typeof node.id === "number") {
      const numericId = node.id;
      setFocusNodeId((prev) => (prev === numericId ? null : numericId));
    }

    if (e.altKey) {
      const subclusterId =
        node.subcluster_id ?? nodeToSubclusterMap.get(node.id as number);
      if (subclusterId) {
        setCollapsedSubclusters((prev) => {
          const next = new Set(prev);
          next.add(subclusterId);
          return next;
        });
      }
    }
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* 노드/그룹 툴팁 */}
      {hoveredId != null &&
        (() => {
          const n = displayNodeById(hoveredId);
          if (!n) return null;
          const left = n.x * scale + offset.x;
          const top = n.y * scale + offset.y - 24;
          const sc =
            n.isGroupNode && n.subcluster_id
              ? subclusterMap.get(n.subcluster_id)
              : null;

          return (
            <div
              style={{
                position: "absolute",
                left,
                top,
                transform: "translate(-50%, -100%)",
                padding: "4px 8px",
                fontSize: 11,
                background: "rgba(0,0,0,0.8)",
                color: "white",
                borderRadius: 4,
                pointerEvents: "none",
                whiteSpace: "nowrap",
                zIndex: 10,
              }}
            >
              <div style={{ fontWeight: "bold" }}>{n.label ?? n.id}</div>
              {sc && (
                <div style={{ fontSize: 9, opacity: 0.8 }}>
                  Size: {sc.size} | Density: {sc.density.toFixed(2)}
                </div>
              )}
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
              fill="#888"
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
            const s = displayNodeMap.get(e.source);
            const t = displayNodeMap.get(e.target);
            if (!s || !t) return null;
            return (
              <line
                key={e.id ?? `inter-normal-${idx}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="#e0e0e0"
                strokeWidth={0.5}
                strokeOpacity={0.7}
              />
            );
          })}

          {/* Intra-cluster 엣지 (일반) */}
          {normalIntraEdges.map((e, idx) => {
            const s = displayNodeMap.get(e.source);
            const t = displayNodeMap.get(e.target);
            if (!s || !t) return null;
            return (
              <line
                key={e.id ?? `intra-normal-${idx}`}
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
            const s = displayNodeMap.get(e.source);
            const t = displayNodeMap.get(e.target);
            if (!s || !t) return null;
            return (
              <line
                key={e.id ?? `focus-${idx}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="#ff4d4f"
                strokeWidth={1.5}
              />
            );
          })}

          {/* 노드 (그룹/일반 통합) */}
          {displayNodes.map((n) => {
            const isHovered = hoveredId === n.id;
            const isFocused =
              !n.isGroupNode &&
              typeof n.id === "number" &&
              focusNodeId === n.id;

            if (n.isGroupNode) {
              const baseRadius = 12;
              const radius = Math.max(baseRadius, Math.sqrt(n.size ?? 0) * 2);
              const displayRadius = isHovered ? radius + 2 : radius;
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  style={{ cursor: "pointer" }}
                  onMouseDown={(e) => handleNodeMouseDown(e, n)}
                  onMouseEnter={() => setHoveredId(n.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => handleNodeClick(e, n)}
                >
                  <circle
                    r={displayRadius}
                    fill={n.color ?? "#722ed1"}
                    fillOpacity={0.8}
                    stroke="#4a2a7a"
                    strokeWidth={2}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                    fontWeight="bold"
                    fill="white"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {n.size}
                  </text>
                </g>
              );
            }

            const baseRadius = getNodeRadius(n.edgeCount ?? 0, maxEdgeCount);
            const radius = isHovered ? baseRadius + 2 : baseRadius;
            const hasSubcluster = !!n.subcluster_id;
            const fill = isFocused
              ? "#ff4d4f"
              : isHovered
                ? "#EF7233"
                : hasSubcluster
                  ? "#a9a9a9"
                  : "#767676";

            return (
              <circle
                key={n.id}
                cx={n.x}
                cy={n.y}
                r={radius}
                fill={fill}
                style={{ cursor: "pointer" }}
                onMouseDown={(e) => handleNodeMouseDown(e, n)}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => handleNodeClick(e, n)}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
