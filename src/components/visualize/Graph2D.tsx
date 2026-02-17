import threadRepo from "@/managers/threadRepo";
import {
  ClusterCircle,
  PositionedEdge,
  PositionedNode,
  Subcluster,
} from "@/types/GraphData";
import * as d3Force from "d3-force";
import {
  GraphEdgeDto,
  GraphNodeDto,
} from "node_modules/@taco_tsinghua/graphnode-sdk/dist/types/graph";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import NodeChatPreview from "./NodeChatPreview";

type SimNode = d3Force.SimulationNodeDatum &
  GraphNodeDto & {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    edgeCount: number;
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
  nodes: GraphNodeDto[],
  edges: GraphEdgeDto[],
): {
  edges: PositionedEdge[];
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

  return { edges: positionedEdges, edgeCounts };
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
  allEdges: GraphEdgeDto[],
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
      if (!clusterName) clusterName = n.clusterName;
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
      color: "var(--color-node-default)",
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
    const subclusterId =
      (node as GraphNodeDto & { subclusterId?: string | null }).subclusterId ??
      nodeToSubcluster.get(node.id) ??
      null;
    if (subclusterId && collapsedSet.has(subclusterId)) return;

    const displayNode: DisplayNode = {
      id: node.id,
      isGroupNode: false,
      subcluster_id: subclusterId,
      label: node.origId,
      x: node.x,
      y: node.y,
      edgeCount: node.edgeCount,
      cluster_name: node.clusterName,
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
  nodes: GraphNodeDto[],
  edges: GraphEdgeDto[],
  width: number,
  height: number,
): {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  circles: ClusterCircle[];
} {
  const { edges: classifiedEdges, edgeCounts } = classifyEdges(nodes, edges);

  // 클러스터별 노드 그룹화
  const clusterGroups = new Map<string, GraphNodeDto[]>();
  nodes.forEach((n) => {
    // clusterName을 기준으로 그룹화
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

    const tempNodeMap = new Map(clusterNodes.map((node) => [node.id, node]));
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

    const nodeMap = new Map(simNodes.map((node) => [node.id, node]));

    const simClusterEdges = intraClusterEdges.map((e) => ({
      source: nodeMap.get(e.source)!,
      target: nodeMap.get(e.target)!,
    }));

    const density = edgeCount / Math.max(n, 1);

    const chargeStrength = -20 - Math.sqrt(n) * 3 - density * 2;
    const collideRadius = 12 + Math.min(10, density * 1.5);
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
const SUBCLUSTER_FOCUS_COLORS = [
  "#4aa8c0",
  "#e74c3c",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#16a085",
  "#e84393",
  "#2d98da",
  "#ff9f43",
];

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
  rawSubclusters?: Subcluster[];
  width: number;
  height: number;
  avatarUrl: string | null;
  onClustersReady?: (
    clusters: ClusterCircle[],
    nodes: PositionedNode[],
    edges: PositionedEdge[],
  ) => void;
  zoomToClusterId?: string | null;
};

const EMPTY_SUBCLUSTERS: Subcluster[] = [];

export default function Graph2D({
  rawNodes,
  rawEdges,
  rawSubclusters,
  width,
  height,
  avatarUrl,
  onClustersReady,
  zoomToClusterId,
}: GraphProps) {
  const subclustersInput = rawSubclusters ?? EMPTY_SUBCLUSTERS;
  const subclusters = subclustersInput;
  const [positionedNodes, setPositionedNodes] = useState<PositionedNode[]>([]);
  const [displayNodes, setDisplayNodes] = useState<DisplayNode[]>([]);
  const [displayEdges, setDisplayEdges] = useState<DisplayEdge[]>([]);
  const [circles, setCircles] = useState<ClusterCircle[]>([]);
  const [maxEdgeCount, setMaxEdgeCount] = useState(0);

  // 서브클러스터 관련 상태
  const [collapsedSubclusters, setCollapsedSubclusters] = useState<Set<string>>(
    () => new Set(subclustersInput.map((sc) => sc.id)),
  );

  const [hoveredId, setHoveredId] = useState<string | number | null>(null);
  const [hoveredThreadTitle, setHoveredThreadTitle] = useState<string | null>(
    null,
  );
  const [focusNodeId, setFocusNodeId] = useState<number | null>(null);
  const [focusedClusterId, setFocusedClusterId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);

  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const dragNodeOffset = useRef<{ dx: number; dy: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const [draggingClusterId, setDraggingClusterId] = useState<string | null>(
    null,
  );
  const dragClusterOffset = useRef<{ dx: number; dy: number } | null>(null);
  const lastPointerWasDraggingRef = useRef(false);
  const collapsedSnapshotRef = useRef<Set<string> | null>(null);
  const focusFetchIdRef = useRef(0);
  const [focusLayoutMap, setFocusLayoutMap] = useState<Map<
    number,
    { x: number; y: number }
  > | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const isAnimatingRef = useRef(false);

  const positionedNodeMap = useMemo(
    () => new Map(positionedNodes.map((n) => [n.id, n])),
    [positionedNodes],
  );
  const nodeClusterNameById = useMemo(
    () => new Map(positionedNodes.map((n) => [n.id, n.clusterName])),
    [positionedNodes],
  );

  const isSubclusterInFocus = useCallback(
    (sc: Subcluster) =>
      !!focusedClusterId &&
      (sc.cluster_id === focusedClusterId ||
        sc.node_ids.some(
          (nodeId) => nodeClusterNameById.get(nodeId) === focusedClusterId,
        )),
    [focusedClusterId, nodeClusterNameById],
  );

  const clusterFocusActive = focusedClusterId !== null;
  const focusCircle = useMemo(() => {
    if (!clusterFocusActive) return null;
    return circles.find((c) => c.clusterId === focusedClusterId) ?? null;
  }, [clusterFocusActive, circles, focusedClusterId]);

  const focusExplode = useMemo(() => {
    if (!focusCircle) return null;
    const targetRadius = Math.min(width, height) * 0.35;
    const baseRadius = Math.max(focusCircle.radius, 1);
    // Reduced explode factor for more natural organic layout
    const factor = Math.min(1.5, Math.max(1.1, targetRadius / baseRadius));
    return {
      centerX: focusCircle.centerX,
      centerY: focusCircle.centerY,
      factor,
    };
  }, [focusCircle, width, height]);

  const applyExplode = useCallback(
    (x: number, y: number) => {
      if (!focusExplode) return { x, y };
      return {
        x:
          focusExplode.centerX +
          (x - focusExplode.centerX) * focusExplode.factor,
        y:
          focusExplode.centerY +
          (y - focusExplode.centerY) * focusExplode.factor,
      };
    },
    [focusExplode],
  );

  const removeExplode = useCallback(
    (x: number, y: number) => {
      if (!focusExplode) return { x, y };
      return {
        x:
          focusExplode.centerX +
          (x - focusExplode.centerX) / focusExplode.factor,
        y:
          focusExplode.centerY +
          (y - focusExplode.centerY) / focusExplode.factor,
      };
    },
    [focusExplode],
  );

  const focusedDisplayNodes = useMemo(() => {
    if (!clusterFocusActive) return displayNodes;
    return displayNodes.filter((n) => n.cluster_name === focusedClusterId);
  }, [clusterFocusActive, displayNodes, focusedClusterId]);

  const focusedDisplayNodeMap = useMemo(
    () => new Map(focusedDisplayNodes.map((n) => [n.id, n])),
    [focusedDisplayNodes],
  );

  const focusedDisplayEdges = useMemo(() => {
    if (!clusterFocusActive) return displayEdges;
    return displayEdges.filter(
      (e) =>
        focusedDisplayNodeMap.has(e.source) &&
        focusedDisplayNodeMap.has(e.target),
    );
  }, [clusterFocusActive, displayEdges, focusedDisplayNodeMap]);

  const subclusterColorMap = useMemo(() => {
    if (!clusterFocusActive) return new Map<string, string>();
    const candidates = subclusters
      .filter((sc) => isSubclusterInFocus(sc))
      .sort((a, b) => a.id.localeCompare(b.id));
    const map = new Map<string, string>();
    candidates.forEach((sc, idx) => {
      map.set(
        sc.id,
        SUBCLUSTER_FOCUS_COLORS[idx % SUBCLUSTER_FOCUS_COLORS.length],
      );
    });
    return map;
  }, [clusterFocusActive, isSubclusterInFocus, subclusters]);

  const renderedDisplayNodes = useMemo(() => {
    if (!focusExplode && !focusLayoutMap) return focusedDisplayNodes;
    return focusedDisplayNodes.map((n) => {
      const base = focusLayoutMap?.get(n.id as number) ?? { x: n.x, y: n.y };
      const pos = focusExplode ? applyExplode(base.x, base.y) : base;
      return { ...n, x: pos.x, y: pos.y };
    });
  }, [applyExplode, focusExplode, focusLayoutMap, focusedDisplayNodes]);

  const renderedDisplayNodeMap = useMemo(
    () => new Map(renderedDisplayNodes.map((n) => [n.id, n])),
    [renderedDisplayNodes],
  );

  const focusActive =
    focusNodeId !== null && focusedDisplayNodeMap.has(focusNodeId);

  // 엣지 분류
  const normalIntraEdges = focusedDisplayEdges.filter((e) => {
    if (!e.isIntraCluster) return false;
    if (!focusActive) return true;
    return e.source !== focusNodeId && e.target !== focusNodeId;
  });

  const focusedIntraEdges = focusedDisplayEdges.filter((e) => {
    if (!focusActive) return false;
    if (!e.isIntraCluster) return false;
    return e.source === focusNodeId || e.target === focusNodeId;
  });

  const focusedInterEdges = focusedDisplayEdges.filter((e) => {
    if (!focusActive) return false;
    if (e.isIntraCluster) return false;
    return e.source === focusNodeId || e.target === focusNodeId;
  });

  const normalInterEdges = focusedDisplayEdges.filter((e) => !e.isIntraCluster);

  // hoveredId가 변경될 때 thread title 가져오기
  useEffect(() => {
    if (hoveredId == null || typeof hoveredId !== "number") {
      setHoveredThreadTitle(null);
      return;
    }

    const n = positionedNodeMap.get(hoveredId);
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
  }, [hoveredId, positionedNodeMap]);

  const onClustersReadyRef = useRef(onClustersReady);

  // onClustersReady ref를 최신으로 유지
  useEffect(() => {
    onClustersReadyRef.current = onClustersReady;
  }, [onClustersReady]);

  useEffect(() => {
    if (rawNodes.length === 0) return;

    const {
      nodes,
      edges: newEdges,
      circles,
    } = layoutWithBoundedForce(rawNodes, rawEdges, width, height);
    setPositionedNodes(nodes);
    setCircles(circles);

    const max = Math.max(...nodes.map((n) => n.edgeCount), 1);
    setMaxEdgeCount(max);

    // 클러스터 정보와 노드 위치, 엣지를 부모 컴포넌트에 전달 (ref를 통해 호출하여 무한 루프 방지)
    if (onClustersReadyRef.current) {
      onClustersReadyRef.current(circles, nodes, newEdges);
    }
  }, [rawNodes, rawEdges, width, height]);

  // 서브클러스터 초기화 (초기에는 모두 접힌 상태)
  useEffect(() => {
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

  const nodeToSubclusterMap = useMemo(
    () => createNodeToSubclusterMap(subclusters),
    [subclusters],
  );

  const subclusterMap = useMemo(
    () => new Map(subclusters.map((sc) => [sc.id, sc])),
    [subclusters],
  );

  const animateZoomOut = useCallback(() => {
    if (isAnimatingRef.current || !svgRef.current) return;

    isAnimatingRef.current = true;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const startScale = scale;
    const startOffsetX = offset.x;
    const startOffsetY = offset.y;

    // Reset to initial view
    const targetScale = 1;
    const targetOffsetX = 0;
    const targetOffsetY = 0;

    const duration = 600;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const newScale = startScale + (targetScale - startScale) * easeOut;
      const newOffsetX = startOffsetX + (targetOffsetX - startOffsetX) * easeOut;
      const newOffsetY = startOffsetY + (targetOffsetY - startOffsetY) * easeOut;

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
      }
    };

    requestAnimationFrame(animate);
  }, [offset, scale]);

  const animateZoomToCluster = useCallback(
    (clusterId: string, focusAfter: boolean = false) => {
      if (!clusterId || circles.length === 0 || isAnimatingRef.current) return;

      const circle = circles.find((c) => c.clusterId === clusterId);
      if (!circle || !svgRef.current) return;

      if (focusAfter && focusedClusterId === clusterId) return;

      if (focusedClusterId && focusedClusterId !== clusterId) {
        setFocusedClusterId(null);
      }

      isAnimatingRef.current = true;

      const svg = svgRef.current;
      const rect = svg.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Reduced zoom level to show more of the graph
      const targetScale = Math.min(2, Math.max(1.2, 150 / circle.radius));
      const targetOffsetX = centerX - circle.centerX * targetScale;
      const targetOffsetY = centerY - circle.centerY * targetScale;

      const startScale = scale;
      const startOffsetX = offset.x;
      const startOffsetY = offset.y;

      const duration = 900;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Smoother cubic ease-in-out
        const easeInOut =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const newScale = startScale + (targetScale - startScale) * easeInOut;
        const newOffsetX =
          startOffsetX + (targetOffsetX - startOffsetX) * easeInOut;
        const newOffsetY =
          startOffsetY + (targetOffsetY - startOffsetY) * easeInOut;

        setScale(newScale);
        setOffset({ x: newOffsetX, y: newOffsetY });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          isAnimatingRef.current = false;
          if (focusAfter) {
            setFocusedClusterId(clusterId);
          }
        }
      };

      requestAnimationFrame(animate);
    },
    [circles, focusedClusterId, offset, scale],
  );

  const [nodeTitleMap, setNodeTitleMap] = useState<Map<number, string>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!focusedClusterId) return;
    if (!collapsedSnapshotRef.current) {
      collapsedSnapshotRef.current = new Set(collapsedSubclusters);
    }
    setCollapsedSubclusters((prev) => {
      const next = new Set(prev);
      subclusters.forEach((sc) => {
        if (isSubclusterInFocus(sc)) {
          next.delete(sc.id);
        }
      });
      return next;
    });
  }, [
    focusedClusterId,
    subclusters,
    isSubclusterInFocus,
    collapsedSubclusters,
  ]);

  useEffect(() => {
    if (!focusedClusterId) {
      setNodeTitleMap(new Map());
      return;
    }
    const requestId = ++focusFetchIdRef.current;
    const focusNodes = focusedDisplayNodes.filter(
      (n) => !n.isGroupNode && typeof n.id === "number",
    );

    Promise.all(
      focusNodes.map(async (n) => {
        const nodeId = n.id as number;
        const pos = positionedNodeMap.get(nodeId);
        const threadId =
          pos?.origId ?? (typeof n.label === "string" ? n.label : null);
        if (!threadId) return null;
        try {
          const thread = await threadRepo.getThreadById(threadId);
          return { id: nodeId, title: thread?.title || threadId };
        } catch {
          return { id: nodeId, title: threadId };
        }
      }),
    ).then((results) => {
      if (focusFetchIdRef.current !== requestId) return;
      const map = new Map<number, string>();
      results.forEach((res) => {
        if (!res) return;
        map.set(res.id, res.title);
      });
      setNodeTitleMap(map);
    });
  }, [focusedClusterId, focusedDisplayNodes, positionedNodeMap]);

  useEffect(() => {
    if (!focusedClusterId) {
      setFocusLayoutMap(null);
      return;
    }

    const focusNodes = positionedNodes.filter(
      (n) => n.clusterName === focusedClusterId,
    );
    if (focusNodes.length === 0) {
      setFocusLayoutMap(null);
      return;
    }

    const nodeById = new Map<number, PositionedNode>();
    focusNodes.forEach((n) => nodeById.set(n.id, n));
    const focusEdges = rawEdges.filter(
      (e) => nodeById.has(e.source) && nodeById.has(e.target),
    );

    const centerX = focusCircle?.centerX ?? width / 2;
    const centerY = focusCircle?.centerY ?? height / 2;

    // Calculate degree (edge count) for each node
    const degreeMap = new Map<number, number>();
    focusNodes.forEach((n) => degreeMap.set(n.id, 0));
    focusEdges.forEach((e) => {
      degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
      degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
    });
    const maxDegree = Math.max(...Array.from(degreeMap.values()), 1);

    const simNodes = focusNodes.map((n) => ({
      id: n.id,
      x: n.x,
      y: n.y,
      degree: degreeMap.get(n.id) ?? 0,
    }));

    const simLinks = focusEdges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    const baseRadius = Math.min(width, height) * 0.15;

    const simulation = d3Force
      .forceSimulation(simNodes as any)
      .force(
        "link",
        d3Force
          .forceLink(simLinks)
          .id((d: any) => d.id)
          .distance(50)
          .strength(0.1),
      )
      .force("charge", d3Force.forceManyBody().strength(-5))
      .force("collide", d3Force.forceCollide(12).iterations(3))
      .force("center", d3Force.forceCenter(centerX, centerY).strength(2))
      .force(
        "radial",
        d3Force
          .forceRadial(
            (d: any) => {
              // Nodes with fewer connections get pushed further out
              // Highly connected nodes stay near center
              const degreeRatio = (d.degree ?? 0) / maxDegree;
              return baseRadius * (1.1 - degreeRatio);
            },
            centerX,
            centerY,
          )
          .strength(0.01),
      )
      .stop();

    for (let i = 0; i < 200; i += 1) {
      simulation.tick();
    }

    const map = new Map<number, { x: number; y: number }>();
    simNodes.forEach((n) => {
      map.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
    });
    setFocusLayoutMap(map);
  }, [focusedClusterId, positionedNodes, rawEdges, width, height, focusCircle]);

  useEffect(() => {
    if (focusedClusterId) return;
    if (!collapsedSnapshotRef.current) return;
    const snapshot = collapsedSnapshotRef.current;
    collapsedSnapshotRef.current = null;
    setCollapsedSubclusters(new Set(snapshot));
  }, [focusedClusterId]);

  // 클러스터로 줌인 (애니메이션)
  useEffect(() => {
    if (!zoomToClusterId) return;
    animateZoomToCluster(zoomToClusterId, true);
  }, [zoomToClusterId, animateZoomToCluster]);

  useEffect(() => {
    setHoveredId(null);
  }, [focusedClusterId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && focusedClusterId) {
        animateZoomOut();
        setFocusedClusterId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedClusterId, animateZoomOut]);

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
    dragStartPos.current = { x: e.clientX, y: e.clientY };
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
          n.clusterName === draggingClusterId
            ? { ...n, x: n.x + dx, y: n.y + dy }
            : n,
        ),
      );

      return;
    }

    if (draggingNodeId !== null && dragNodeOffset.current) {
      const { worldX, worldY } = screenToWorld(e.clientX, e.clientY);

      const displayX = worldX + dragNodeOffset.current.dx;
      const displayY = worldY + dragNodeOffset.current.dy;
      const basePos = removeExplode(displayX, displayY);

      if (clusterFocusActive) {
        setFocusLayoutMap((prev) => {
          if (!prev) return prev;
          const next = new Map(prev);
          next.set(draggingNodeId, { x: basePos.x, y: basePos.y });
          return next;
        });
      } else {
        setPositionedNodes((prev) =>
          prev.map((n) =>
            n.id === draggingNodeId ? { ...n, x: basePos.x, y: basePos.y } : n,
          ),
        );
      }
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

    lastPointerWasDraggingRef.current = !!wasDragging;
    window.setTimeout(() => {
      lastPointerWasDraggingRef.current = false;
    }, 0);

    const prevDraggingNodeId = draggingNodeId;
    setDraggingNodeId(null);
    setDraggingClusterId(null);
    dragNodeOffset.current = null;
    dragClusterOffset.current = null;
    dragStartPos.current = null;

    // 드래그가 아니고 노드를 클릭한 경우에만 채팅 미리보기 표시
    if (!wasDragging && prevDraggingNodeId) {
      const node = positionedNodeMap.get(prevDraggingNodeId);
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
    dragStartPos.current = null;
    lastPointerWasDraggingRef.current = false;
  };

  const handleNodeMouseDown = (
    e: React.MouseEvent<SVGElement>,
    node: DisplayNode,
  ) => {
    e.stopPropagation();
    if (node.isGroupNode || typeof node.id !== "number") return;
    const { worldX, worldY } = screenToWorld(e.clientX, e.clientY);
    const basePos =
      (clusterFocusActive ? focusLayoutMap?.get(node.id) : null) ??
      positionedNodeMap.get(node.id);
    if (!basePos) return;

    const displayPos = applyExplode(basePos.x, basePos.y);
    dragNodeOffset.current = {
      dx: displayPos.x - worldX,
      dy: displayPos.y - worldY,
    };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    setDraggingNodeId(node.id);
  };

  const handleClusterLabelMouseDown = (
    e: React.MouseEvent<SVGTextElement>,
    clusterId: string,
  ) => {
    e.stopPropagation();
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const { worldX, worldY } = screenToWorld(e.clientX, e.clientY);
    const circle = circles.find((c) => c.clusterId === clusterId);
    if (!circle) return;

    dragClusterOffset.current = {
      dx: circle.centerX - worldX,
      dy: circle.centerY - worldY,
    };
    setDraggingClusterId(clusterId);
  };

  const handleClusterLabelClick = (
    e: React.MouseEvent<SVGTextElement>,
    clusterId: string,
  ) => {
    e.stopPropagation();
    if (lastPointerWasDraggingRef.current) {
      lastPointerWasDraggingRef.current = false;
      return;
    }
    animateZoomToCluster(clusterId, true);
  };

  const handleBackgroundClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!focusedClusterId) return;
    if (lastPointerWasDraggingRef.current) {
      lastPointerWasDraggingRef.current = false;
      return;
    }
    const target = e.target as Element;
    const tag = target.tagName.toLowerCase();
    if (tag === "circle" || tag === "text" || tag === "line") return;
    animateZoomOut();
    setFocusedClusterId(null);
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
      {/* 툴팁 */}
      {hoveredId != null &&
        (() => {
          const n = renderedDisplayNodeMap.get(hoveredId);
          if (!n) return null;
          const left = n.x * scale + offset.x;
          const top = n.y * scale + offset.y - 24;
          const sc =
            n.isGroupNode && n.subcluster_id
              ? subclusterMap.get(n.subcluster_id)
              : null;

          const label = n.isGroupNode
            ? (n.label ?? String(n.id))
            : (hoveredThreadTitle ?? n.label ?? String(n.id));

          return (
            <div
              className="absolute -translate-x-1/2 -translate-y-full py-0.5 px-1.5 text-[10px] bg-sidebar-button-hover text-primary rounded pointer-events-none whitespace-nowrap z-10"
              style={{
                left,
                top,
              }}
            >
              <div className="font-semibold">{label}</div>
              {sc && (
                <div className="text-[9px] opacity-80">
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
        onClick={handleBackgroundClick}
      >
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          {/* 클러스터 원형 아웃라인 */}
          {!clusterFocusActive &&
            circles.map((circle) => (
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
          {!clusterFocusActive &&
            circles.map((circle) => (
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
                    draggingClusterId === circle.clusterId
                      ? "grabbing"
                      : "grab",
                  pointerEvents: "all",
                  userSelect: "none",
                }}
                onMouseDown={(e) =>
                  handleClusterLabelMouseDown(e, circle.clusterId)
                }
                onClick={(e) => handleClusterLabelClick(e, circle.clusterId)}
              >
                {circle.clusterName}
              </text>
            ))}

          {/* Inter-cluster 엣지 (일반) */}
          {normalInterEdges.map((e, idx) => {
            const s = renderedDisplayNodeMap.get(e.source);
            const t = renderedDisplayNodeMap.get(e.target);
            if (!s || !t) return null;
            return (
              <line
                key={e.id ?? `inter-normal-${idx}`}
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
            const s = renderedDisplayNodeMap.get(e.source);
            const t = renderedDisplayNodeMap.get(e.target);
            if (!s || !t) return null;
            return (
              <line
                key={e.id ?? `intra-normal-${idx}`}
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
            const s = renderedDisplayNodeMap.get(e.source);
            const t = renderedDisplayNodeMap.get(e.target);
            if (!s || !t) return null;
            return (
              <line
                key={e.id ?? `focus-${idx}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="var(--color-primary)"
                strokeWidth={1.5}
              />
            );
          })}

          {/* 노드 (그룹/일반 통합) */}
          {renderedDisplayNodes.map((n) => {
            const isHovered = hoveredId === n.id;
            const isFocused =
              !n.isGroupNode &&
              typeof n.id === "number" &&
              focusNodeId === n.id;

            if (n.isGroupNode) {
              const baseRadius = 12;
              const radius = Math.max(baseRadius, Math.sqrt(n.size ?? 0) * 2);
              const displayRadius = isHovered ? radius + 2 : radius;
              const groupFill =
                (clusterFocusActive && n.subcluster_id
                  ? subclusterColorMap.get(n.subcluster_id)
                  : undefined) ??
                n.color ??
                "var(--color-node-default)";
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
                    fill={groupFill}
                    fillOpacity={0.8}
                    stroke="var(--color-node-focus)"
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
            const subclusterFill =
              clusterFocusActive && n.subcluster_id
                ? subclusterColorMap.get(n.subcluster_id)
                : undefined;
            const baseFill = subclusterFill ?? "var(--color-node-default)";
            const fill =
              isFocused || isHovered ? "var(--color-node-focus)" : baseFill;
            const title =
              clusterFocusActive && typeof n.id === "number"
                ? (nodeTitleMap.get(n.id) ?? n.label ?? String(n.id))
                : null;
            const displayTitle =
              title && title.length > 10 ? title.slice(0, 10) : title;

            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                className="cursor-pointer"
                onMouseDown={(e) => handleNodeMouseDown(e, n)}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => handleNodeClick(e, n)}
              >
                <circle
                  r={radius}
                  fill={fill}
                  className="shadow-[0_2px_20px_#BADAFF]"
                />
                {displayTitle && (
                  <text
                    x={0}
                    y={-(radius + 4)}
                    textAnchor="middle"
                    fontSize={6}
                    fontWeight={500}
                    fill="var(--color-text-secondary)"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {displayTitle}
                  </text>
                )}
              </g>
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
