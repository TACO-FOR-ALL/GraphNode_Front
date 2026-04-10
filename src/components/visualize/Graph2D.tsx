import threadRepo from "@/managers/threadRepo";
import {
  ClusterCircle,
  PositionedEdge,
  PositionedNode,
  GraphSubcluster,
} from "@/types/GraphData";
import * as d3Force from "d3-force";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import NodeChatPreview from "./NodeChatPreview";
import ZoomControls from "./ZoomControls";

// Graph2D에서 사용하는 노드 타입 (PositionedNode 기반)
type GraphNode = {
  id: number;
  userId: string;
  origId: string;
  clusterId: string;
  clusterName: string;
  timestamp: number | null;
  numMessages: number;
  createdAt?: number;
  updatedAt?: number;
};

// Graph2D에서 사용하는 엣지 타입 (PositionedEdge 기반)
type GraphEdge = {
  userId: string;
  id?: string;
  source: number;
  target: number;
  weight: number;
  type: "hard" | "insight";
  intraCluster: boolean;
  createdAt?: number;
  updatedAt?: number;
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
  nodes: GraphNode[],
  edges: GraphEdge[],
): {
  edges: PositionedEdge[];
  edgeCounts: Map<number, number>;
} {
  const nodeMap = new Map<number, GraphNode>();
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

// 노드 -> 서브클러스터 매핑 생성
function createNodeToSubclusterMap(
  subclusters: GraphSubcluster[],
): Map<number, string> {
  const nodeToSubcluster = new Map<number, string>();
  subclusters.forEach((sc) => {
    sc.nodeIds.forEach((nodeId) => {
      nodeToSubcluster.set(nodeId, sc.id);
    });
  });
  return nodeToSubcluster;
}

function getVisibleGraph(
  allNodes: PositionedNode[],
  allEdges: GraphEdge[],
  subclusters: GraphSubcluster[],
  collapsedSet: Set<string>,
  groupPositions: Map<string, { x: number; y: number }>,
): { visibleNodes: DisplayNode[]; visibleEdges: DisplayEdge[] } {
  const nodeToSubcluster = createNodeToSubclusterMap(subclusters);
  const scMap = new Map(subclusters.map((sc) => [sc.id, sc]));

  const nodeMap = new Map<number, DisplayNode>();
  const visibleNodes: DisplayNode[] = [];

  // 그룹 노드 생성 (접힌 서브클러스터) - groupPositions에서 위치 가져옴
  collapsedSet.forEach((scId) => {
    const sc = scMap.get(scId);
    if (!sc) return;

    // clusterName을 멤버 노드에서 가져옴
    let clusterName: string | undefined;
    allNodes.forEach((n) => {
      if (!clusterName && sc.nodeIds.includes(n.id)) clusterName = n.clusterName;
    });

    // groupPositions에서 force sim으로 계산된 위치 사용 (centroid가 아님)
    const pos = groupPositions.get(scId) ?? { x: 0, y: 0 };

    const groupNodeId = `__group_${scId}`;
    const groupNode: DisplayNode = {
      id: groupNodeId,
      isGroupNode: true,
      subcluster_id: scId,
      label: sc.topKeywords?.[0] || `Group ${scId}`,
      x: pos.x,
      y: pos.y,
      size: sc.size,
      color: "var(--color-node-focus)",
      edgeCount: 0,
      cluster_name: clusterName,
    };

    visibleNodes.push(groupNode);
    sc.nodeIds.forEach((nodeId) => {
      nodeMap.set(nodeId, groupNode);
    });
  });

  // 일반 노드 처리
  allNodes.forEach((node) => {
    const subclusterId =
      (node as GraphNode & { subclusterId?: string | null }).subclusterId ??
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

// 접힌 서브클러스터를 슈퍼 노드로 취급하여 레이아웃 계산
// 초기 렌더링 시 모든 서브클러스터가 접혀있으므로, 각 서브클러스터는 하나의 노드로 취급됨
function layoutWithCollapsedSubclusters(
  nodes: GraphNode[],
  edges: GraphEdge[],
  subclusters: GraphSubcluster[],
  collapsedSet: Set<string>,
  width: number,
  height: number,
): {
  nodes: PositionedNode[];
  groupPositions: Map<string, { x: number; y: number }>;
  edges: PositionedEdge[];
  circles: ClusterCircle[];
} {
  const { edges: classifiedEdges, edgeCounts } = classifyEdges(nodes, edges);

  const nodeToSc = createNodeToSubclusterMap(subclusters);
  const scMap = new Map(subclusters.map((sc) => [sc.id, sc]));

  const clusterGroups = new Map<string, GraphNode[]>();
  nodes.forEach((n) => {
    const list = clusterGroups.get(n.clusterName) ?? [];
    list.push(n);
    clusterGroups.set(n.clusterName, list);
  });

  const clusterNames = Array.from(clusterGroups.keys());
  const K = clusterNames.length;
  const centerX = width / 2;
  const centerY = height / 2;

  // 접힌 서브클러스터 = 1개 노드, 펼쳐진 = 실제 노드 수로 클러스터 크기 계산
  const clusterRadii = new Map<string, number>();
  clusterNames.forEach((clusterName) => {
    const clusterNodes = clusterGroups.get(clusterName)!;
    const scIdsHere = new Set<string>();
    clusterNodes.forEach((n) => {
      const scId = nodeToSc.get(n.id);
      if (scId) scIdsHere.add(scId);
    });

    let effCount = 0;
    scIdsHere.forEach((scId) => {
      effCount += collapsedSet.has(scId) ? 1 : (scMap.get(scId)?.nodeIds.length ?? 0);
    });
    clusterNodes.forEach((n) => {
      if (!nodeToSc.has(n.id)) effCount += 1;
    });

    clusterRadii.set(clusterName, 15 + 12 * Math.sqrt(Math.max(effCount, 1)));
  });

  // 대분류 클러스터 중심 배치
  type ClusterCenter = d3Force.SimulationNodeDatum & {
    id: string;
    x: number;
    y: number;
    radius: number;
  };

  const clusterCenters: ClusterCenter[] = clusterNames.map((name, idx) => {
    const angle = (2 * Math.PI * idx) / K + (Math.random() - 0.5) * 0.5;
    const dist = Math.min(width, height) * 0.2 * (0.5 + Math.random() * 0.5);
    return {
      id: name,
      x: centerX + dist * Math.cos(angle),
      y: centerY + dist * Math.sin(angle),
      radius: clusterRadii.get(name)!,
    };
  });

  const clusterSim = d3Force
    .forceSimulation<ClusterCenter>(clusterCenters)
    .force("center", d3Force.forceCenter(centerX, centerY).strength(0.05))
    .force("charge", d3Force.forceManyBody().strength(-100))
    .force(
      "collision",
      d3Force
        .forceCollide<ClusterCenter>()
        .radius((d) => d.radius + 20)
        .strength(1)
        .iterations(3),
    )
    .stop();

  for (let i = 0; i < 100; i++) {
    clusterSim.tick();
    const padding = 50;
    clusterCenters.forEach((c) => {
      const r = c.radius;
      c.x = Math.max(r + padding, Math.min(width - r - padding, c.x));
      c.y = Math.max(r + padding, Math.min(height - r - padding, c.y));
    });
  }

  const clusterCenterMap = new Map(clusterCenters.map((c) => [c.id, c]));

  const allPositionedNodes: PositionedNode[] = [];
  const groupPositions = new Map<string, { x: number; y: number }>();
  const circles: ClusterCircle[] = [];

  clusterNames.forEach((clusterName) => {
    const clusterNodes = clusterGroups.get(clusterName)!;
    if (clusterNodes.length === 0) return;

    const center = clusterCenterMap.get(clusterName)!;
    const cx = center.x;
    const cy = center.y;
    const clusterRadius = center.radius;
    const boundaryRadius = clusterRadius * 0.88;

    const scIdsHere = new Set<string>();
    clusterNodes.forEach((n) => {
      const scId = nodeToSc.get(n.id);
      if (scId) scIdsHere.add(scId);
    });

    // 접힌 서브클러스터 → 슈퍼 노드, 펼쳐진 서브클러스터 → 개별 노드
    type EffNode = d3Force.SimulationNodeDatum & {
      efId: string;
      isGroup: boolean;
      scId?: string;
      memberCount: number;
      graphNodeIds: number[];
      x: number;
      y: number;
    };

    const effNodes: EffNode[] = [];
    const scArr = Array.from(scIdsHere);

    scArr.forEach((scId, i) => {
      const sc = scMap.get(scId)!;
      const angle = (2 * Math.PI * i) / Math.max(scArr.length, 1);
      const r = boundaryRadius * 0.4;

      if (collapsedSet.has(scId)) {
        // 슈퍼 노드: 서브클러스터 전체를 하나로
        effNodes.push({
          efId: `group_${scId}`,
          isGroup: true,
          scId,
          memberCount: sc.nodeIds.length,
          graphNodeIds: sc.nodeIds,
          x: cx + r * Math.cos(angle) + (Math.random() - 0.5) * 4,
          y: cy + r * Math.sin(angle) + (Math.random() - 0.5) * 4,
        });
      } else {
        // 펼쳐진 경우: 개별 노드들
        sc.nodeIds.forEach((nodeId, j) => {
          const subAngle = (2 * Math.PI * j) / sc.nodeIds.length;
          effNodes.push({
            efId: `node_${nodeId}`,
            isGroup: false,
            memberCount: 1,
            graphNodeIds: [nodeId],
            x: cx + r * Math.cos(angle) + (r * 0.4) * Math.cos(subAngle) + (Math.random() - 0.5) * 3,
            y: cy + r * Math.sin(angle) + (r * 0.4) * Math.sin(subAngle) + (Math.random() - 0.5) * 3,
          });
        });
      }
    });

    // 서브클러스터에 속하지 않는 개별 노드
    clusterNodes.forEach((n, i) => {
      if (!nodeToSc.has(n.id)) {
        const angle = (2 * Math.PI * i) / Math.max(clusterNodes.length, 1);
        effNodes.push({
          efId: `node_${n.id}`,
          isGroup: false,
          memberCount: 1,
          graphNodeIds: [n.id],
          x: cx + boundaryRadius * 0.5 * Math.cos(angle) + (Math.random() - 0.5) * 4,
          y: cy + boundaryRadius * 0.5 * Math.sin(angle) + (Math.random() - 0.5) * 4,
        });
      }
    });

    if (effNodes.length === 0) return;

    // 개별 노드 간 링크 (슈퍼 노드는 링크 없음)
    const nodeIdToEfId = new Map<number, string>();
    effNodes.forEach((en) => {
      if (!en.isGroup) en.graphNodeIds.forEach((nid) => nodeIdToEfId.set(nid, en.efId));
    });
    const efIdToNode = new Map(effNodes.map((en) => [en.efId, en]));
    const simLinks: { source: EffNode; target: EffNode }[] = [];
    const linkSet = new Set<string>();
    classifiedEdges.forEach((e) => {
      if (!e.isIntraCluster) return;
      const sId = nodeIdToEfId.get(e.source);
      const tId = nodeIdToEfId.get(e.target);
      if (!sId || !tId || sId === tId) return;
      const key = [sId, tId].sort().join("|");
      if (linkSet.has(key)) return;
      linkSet.add(key);
      simLinks.push({ source: efIdToNode.get(sId)!, target: efIdToNode.get(tId)! });
    });

    // force simulation: 슈퍼 노드는 멤버 수에 비례한 척력/충돌 반경
    const sim = d3Force
      .forceSimulation<EffNode>(effNodes)
      .force("center", d3Force.forceCenter(cx, cy).strength(0.3))
      .force("radial", d3Force.forceRadial(0, cx, cy).strength(0.05))
      .force(
        "charge",
        d3Force.forceManyBody<EffNode>().strength((d) => -15 - d.memberCount * 8),
      )
      .force(
        "collision",
        d3Force
          .forceCollide<EffNode>((d) => 6 + Math.sqrt(d.memberCount) * 5)
          .iterations(3),
      )
      .force(
        "link",
        d3Force
          .forceLink<EffNode, any>(simLinks)
          .id((d) => d.efId)
          .distance(20)
          .strength(0.3),
      )
      .stop();

    for (let i = 0; i < 150; i++) {
      sim.tick();
      effNodes.forEach((node) => {
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

    // 결과 저장: 슈퍼 노드 위치 → groupPositions, 개별 노드 위치 → allPositionedNodes
    effNodes.forEach((en) => {
      const nx = en.x!;
      const ny = en.y!;

      if (en.isGroup && en.scId) {
        groupPositions.set(en.scId, { x: nx, y: ny });
        // 멤버 노드들은 그룹 중심 근처에 밀집 배치 (펼칠 때 live sim으로 퍼짐)
        const sc = scMap.get(en.scId)!;
        sc.nodeIds.forEach((nodeId, idx) => {
          const graphNode = clusterNodes.find((n) => n.id === nodeId);
          if (!graphNode) return;
          const angle = (2 * Math.PI * idx) / sc.nodeIds.length;
          allPositionedNodes.push({
            id: nodeId,
            userId: graphNode.userId,
            timestamp: graphNode.timestamp,
            origId: graphNode.origId,
            clusterId: graphNode.clusterId,
            clusterName: graphNode.clusterName,
            numMessages: graphNode.numMessages,
            x: nx + 3 * Math.cos(angle),
            y: ny + 3 * Math.sin(angle),
            edgeCount: edgeCounts.get(nodeId) ?? 0,
          });
        });
      } else if (!en.isGroup) {
        const nodeId = en.graphNodeIds[0];
        const graphNode = clusterNodes.find((n) => n.id === nodeId);
        if (!graphNode) return;
        allPositionedNodes.push({
          id: nodeId,
          userId: graphNode.userId,
          timestamp: graphNode.timestamp,
          origId: graphNode.origId,
          clusterId: graphNode.clusterId,
          clusterName: graphNode.clusterName,
          numMessages: graphNode.numMessages,
          x: nx,
          y: ny,
          edgeCount: edgeCounts.get(nodeId) ?? 0,
        });
      }
    });

    circles.push({
      clusterId: clusterName,
      clusterName,
      centerX: cx,
      centerY: cy,
      radius: clusterRadius,
    });
  });

  return {
    nodes: allPositionedNodes,
    groupPositions,
    edges: classifiedEdges,
    circles,
  };
}

// 클러스터 원의 반경에 따라 겹치지 않는 중심 위치를 계산
function runClusterCenterSim(
  circles: ClusterCircle[],
  width: number,
  height: number,
): Map<string, { x: number; y: number }> {
  if (circles.length === 0) return new Map();

  type CC = d3Force.SimulationNodeDatum & {
    id: string;
    x: number;
    y: number;
    radius: number;
  };

  const ccNodes: CC[] = circles.map((c) => ({
    id: c.clusterId,
    x: c.centerX,
    y: c.centerY,
    radius: c.radius,
  }));

  const sim = d3Force
    .forceSimulation<CC>(ccNodes)
    .force("center", d3Force.forceCenter(width / 2, height / 2).strength(0.05))
    .force("charge", d3Force.forceManyBody().strength(-80))
    .force(
      "collision",
      d3Force
        .forceCollide<CC>((d) => d.radius + 30)
        .strength(1)
        .iterations(4),
    )
    .stop();

  for (let i = 0; i < 80; i++) {
    sim.tick();
    const padding = 50;
    ccNodes.forEach((n) => {
      n.x = Math.max(n.radius + padding, Math.min(width - n.radius - padding, n.x!));
      n.y = Math.max(n.radius + padding, Math.min(height - n.radius - padding, n.y!));
    });
  }

  return new Map(ccNodes.map((n) => [n.id, { x: n.x!, y: n.y! }]));
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
  rawNodes: GraphNode[];
  rawEdges: GraphEdge[];
  rawSubclusters?: GraphSubcluster[];
  width: number;
  height: number;
  avatarUrl: string | null;
  onClustersReady?: (
    clusters: ClusterCircle[],
    nodes: DisplayNode[],
    edges: PositionedEdge[],
  ) => void;
  zoomToClusterId?: string | null;
};

const EMPTY_SUBCLUSTERS: GraphSubcluster[] = [];

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
  // force sim으로 계산된 그룹 노드 위치 (접힌 서브클러스터용)
  const [groupNodePositions, setGroupNodePositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());
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
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

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

  // 클러스터 간격 재조정 애니메이션
  const [clusterOffsets, setClusterOffsets] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());
  const shouldRepositionClustersRef = useRef(false);
  const clusterRepositionRafRef = useRef<number | null>(null);

  // 서브클러스터 펼치기 애니메이션 관련
  const [expandingSubcluster, setExpandingSubcluster] = useState<string | null>(
    null,
  );
  const [animatedPositions, setAnimatedPositions] = useState<
    Map<number, { x: number; y: number }>
  >(new Map());
  // 클러스터 재배치 시 그룹 노드(슈퍼노드)의 애니메이션 위치
  const [animatedGroupPositions, setAnimatedGroupPositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());
  const simulationRef = useRef<d3Force.Simulation<any, any> | null>(null);
  // 펼치기 시작 시 그룹 노드의 중심 위치를 저장
  const expandingGroupCenterRef = useRef<{ x: number; y: number } | null>(null);

  const positionedNodeMap = useMemo(
    () => new Map(positionedNodes.map((n) => [n.id, n])),
    [positionedNodes],
  );
  const nodeClusterNameById = useMemo(
    () => new Map(positionedNodes.map((n) => [n.id, n.clusterName])),
    [positionedNodes],
  );

  const isSubclusterInFocus = useCallback(
    (sc: GraphSubcluster) =>
      !!focusedClusterId &&
      (sc.clusterId === focusedClusterId ||
        sc.nodeIds.some(
          (nodeId: number) =>
            nodeClusterNameById.get(nodeId) === focusedClusterId,
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
    // 포커스 뷰에서는 중분류 그룹 노드를 제외하고 개별 노드만 표시
    return displayNodes.filter(
      (n) => n.cluster_name === focusedClusterId && !n.isGroupNode,
    );
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

  // 포커스 뷰에서는 중분류 색상 구분 없이 일반 노드로 표시
  const subclusterColorMap = useMemo(() => new Map<string, string>(), []);

  // 클러스터 간격 재조정 오프셋이 적용된 원 (렌더링용)
  const displayCircles = useMemo(() => {
    if (clusterOffsets.size === 0) return circles;
    return circles.map((c) => {
      const off = clusterOffsets.get(c.clusterName);
      if (!off) return c;
      return { ...c, centerX: c.centerX + off.x, centerY: c.centerY + off.y };
    });
  }, [circles, clusterOffsets]);

  const renderedDisplayNodes = useMemo(() => {
    // 클러스터 전체 재배치 애니메이션 중: 개별 노드 + 그룹 노드 모두 업데이트
    if (expandingSubcluster && (animatedPositions.size > 0 || animatedGroupPositions.size > 0)) {
      return focusedDisplayNodes.map((n) => {
        if (typeof n.id === "number" && animatedPositions.has(n.id)) {
          const pos = animatedPositions.get(n.id)!;
          return { ...n, x: pos.x, y: pos.y };
        }
        if (n.isGroupNode && n.subcluster_id && animatedGroupPositions.has(n.subcluster_id)) {
          const pos = animatedGroupPositions.get(n.subcluster_id)!;
          return { ...n, x: pos.x, y: pos.y };
        }
        return n;
      });
    }

    // 클러스터 간격 재조정 애니메이션 중: 클러스터 오프셋 적용
    const applyClusterOffset = (n: DisplayNode) => {
      if (clusterOffsets.size === 0) return n;
      const off = clusterOffsets.get(n.cluster_name ?? "");
      if (!off) return n;
      return { ...n, x: n.x + off.x, y: n.y + off.y };
    };

    if (!focusExplode && !focusLayoutMap) {
      return clusterOffsets.size > 0
        ? focusedDisplayNodes.map(applyClusterOffset)
        : focusedDisplayNodes;
    }
    return focusedDisplayNodes.map((n) => {
      const base = focusLayoutMap?.get(n.id as number) ?? { x: n.x, y: n.y };
      const pos = focusExplode ? applyExplode(base.x, base.y) : base;
      return applyClusterOffset({ ...n, x: pos.x, y: pos.y });
    });
  }, [
    applyExplode,
    focusExplode,
    focusLayoutMap,
    focusedDisplayNodes,
    expandingSubcluster,
    animatedPositions,
    animatedGroupPositions,
    clusterOffsets,
  ]);

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

    // 초기에는 모든 서브클러스터가 접힌 상태로 레이아웃 계산
    const initialCollapsed = new Set(subclustersInput.map((sc) => sc.id));
    const {
      nodes,
      groupPositions,
      edges: newEdges,
      circles,
    } = layoutWithCollapsedSubclusters(
      rawNodes,
      rawEdges,
      subclustersInput,
      initialCollapsed,
      width,
      height,
    );
    setPositionedNodes(nodes);
    setGroupNodePositions(groupPositions);
    setCircles(circles);

    const max = Math.max(...nodes.map((n) => n.edgeCount), 1);
    setMaxEdgeCount(max);

    if (onClustersReadyRef.current) {
      onClustersReadyRef.current(circles, nodes, newEdges);
    }
  }, [rawNodes, rawEdges, width, height, subclustersInput]);

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
      groupNodePositions,
    );
    setDisplayNodes(visibleNodes);
    setDisplayEdges(visibleEdges);

    const max = Math.max(...visibleNodes.map((n) => n.edgeCount ?? 0), 1);
    setMaxEdgeCount(max);
  }, [positionedNodes, rawEdges, subclusters, collapsedSubclusters, groupNodePositions]);

  const nodeToSubclusterMap = useMemo(
    () => createNodeToSubclusterMap(subclusters),
    [subclusters],
  );

  const subclusterMap = useMemo(
    () => new Map(subclusters.map((sc) => [sc.id, sc])),
    [subclusters],
  );

  // expand/collapse 후 대분류 클러스터 원의 크기를 실제 visible 노드 위치 기반으로 동적 재계산
  useEffect(() => {
    if (positionedNodes.length === 0) return;
    // 애니메이션 중에는 재계산하지 않음 (sim 완료 후 한 번에 처리)
    if (expandingSubcluster) return;

    setCircles((prev) =>
      prev.map((circle) => {
        const points: { x: number; y: number }[] = [];

        // 이 클러스터에 속한 펼쳐진 개별 노드들
        positionedNodes.forEach((n) => {
          if (n.clusterName !== circle.clusterName) return;
          const scId = nodeToSubclusterMap.get(n.id);
          if (scId && collapsedSubclusters.has(scId)) return; // 접힌 노드는 그룹 노드로 표현
          points.push({ x: n.x, y: n.y });
        });

        // 이 클러스터에 속한 접힌 서브클러스터의 그룹 노드 위치
        subclusters.forEach((sc) => {
          if (!collapsedSubclusters.has(sc.id)) return;
          const firstNode = positionedNodes.find((n) => sc.nodeIds.includes(n.id));
          if (!firstNode || firstNode.clusterName !== circle.clusterName) return;
          const gp = groupNodePositions.get(sc.id);
          if (gp) points.push(gp);
        });

        if (points.length === 0) return circle;

        // 실제 점들의 centroid와 bounding radius 계산
        const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
        const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
        const maxDist = Math.max(
          ...points.map((p) => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2)),
          20,
        );

        return {
          ...circle,
          centerX: cx,
          centerY: cy,
          radius: maxDist + 30,
        };
      }),
    );
  }, [positionedNodes, collapsedSubclusters, subclusters, groupNodePositions, nodeToSubclusterMap, expandingSubcluster]);

  // expand 완료 후 대분류 클러스터 간격을 동적으로 재조정 (스무스 애니메이션)
  useEffect(() => {
    if (!shouldRepositionClustersRef.current) return;
    if (circles.length === 0 || positionedNodes.length === 0) return;
    shouldRepositionClustersRef.current = false;

    // 현재 원 반경 기반으로 새 클러스터 중심 위치 계산
    const newCenters = runClusterCenterSim(circles, width, height);

    // 클러스터별 이동 델타
    const deltas = new Map<string, { dx: number; dy: number }>();
    circles.forEach((c) => {
      const newPos = newCenters.get(c.clusterId);
      if (!newPos) return;
      const dx = newPos.x - c.centerX;
      const dy = newPos.y - c.centerY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        deltas.set(c.clusterName, { dx, dy });
      }
    });

    if (deltas.size === 0) return;

    // 이전 RAF 취소
    if (clusterRepositionRafRef.current) {
      cancelAnimationFrame(clusterRepositionRafRef.current);
    }

    const duration = 700;
    const startTime = performance.now();

    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeInOutCubic(progress);

      // 클러스터별 현재 오프셋 업데이트
      const offsets = new Map<string, { x: number; y: number }>();
      deltas.forEach((delta, clusterName) => {
        offsets.set(clusterName, { x: delta.dx * eased, y: delta.dy * eased });
      });
      setClusterOffsets(new Map(offsets));

      if (progress < 1) {
        clusterRepositionRafRef.current = requestAnimationFrame(animate);
      } else {
        // 최종 위치를 positionedNodes와 circles에 영구 반영
        setPositionedNodes((prev) =>
          prev.map((n) => {
            const offset = deltas.get(n.clusterName);
            if (!offset) return n;
            return { ...n, x: n.x + offset.dx, y: n.y + offset.dy };
          }),
        );
        setCircles((prev) =>
          prev.map((c) => {
            const offset = deltas.get(c.clusterName);
            if (!offset) return c;
            return {
              ...c,
              centerX: c.centerX + offset.dx,
              centerY: c.centerY + offset.dy,
            };
          }),
        );
        setGroupNodePositions((prev) => {
          const next = new Map(prev);
          subclusters.forEach((sc) => {
            const firstNode = positionedNodes.find((n) => sc.nodeIds.includes(n.id));
            if (!firstNode) return;
            const offset = deltas.get(firstNode.clusterName);
            if (!offset) return;
            const cur = next.get(sc.id);
            if (cur) next.set(sc.id, { x: cur.x + offset.dx, y: cur.y + offset.dy });
          });
          return next;
        });
        setClusterOffsets(new Map());
        clusterRepositionRafRef.current = null;
      }
    };

    clusterRepositionRafRef.current = requestAnimationFrame(animate);

    return () => {
      if (clusterRepositionRafRef.current) {
        cancelAnimationFrame(clusterRepositionRafRef.current);
      }
    };
  }, [circles, positionedNodes, width, height, subclusters]);

  const animateZoomOut = useCallback(() => {
    if (isAnimatingRef.current || !svgRef.current) return;

    isAnimatingRef.current = true;

    const startScale = scaleRef.current;
    const startOffsetX = offsetRef.current.x;
    const startOffsetY = offsetRef.current.y;

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
      const newOffsetX =
        startOffsetX + (targetOffsetX - startOffsetX) * easeOut;
      const newOffsetY =
        startOffsetY + (targetOffsetY - startOffsetY) * easeOut;

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isAnimatingRef.current = false;
      }
    };

    requestAnimationFrame(animate);
  }, []);

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

      const startScale = scaleRef.current;
      const startOffsetX = offsetRef.current.x;
      const startOffsetY = offsetRef.current.y;

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
    [circles, focusedClusterId],
  );

  const [nodeTitleMap, setNodeTitleMap] = useState<Map<number, string>>(
    () => new Map(),
  );

  useEffect(() => {
    if (!focusedClusterId) return;
    setCollapsedSubclusters((prev) => {
      if (!collapsedSnapshotRef.current) {
        collapsedSnapshotRef.current = new Set(prev);
      }
      const next = new Set(prev);
      subclusters.forEach((sc) => {
        if (isSubclusterInFocus(sc)) {
          next.delete(sc.id);
        }
      });
      return next;
    });
  }, [focusedClusterId, subclusters, isSubclusterInFocus]);

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
    // 클러스터 줌인
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
  const handleSubclusterClick = useCallback(
    (subclusterId: string) => {
      const isCurrentlyCollapsed = collapsedSubclusters.has(subclusterId);

      if (isCurrentlyCollapsed) {
        // 펼치기: groupNodePositions에서 force sim 위치를 ref에 저장 후 live sim 시작
        const sc = subclusters.find((s) => s.id === subclusterId);
        if (!sc) return;

        const groupPos = groupNodePositions.get(subclusterId) ?? { x: width / 2, y: height / 2 };
        expandingGroupCenterRef.current = groupPos;

        // collapsedSubclusters 해제 → getVisibleGraph가 개별 노드를 표시
        // 위치는 live sim의 첫 tick에서 animatedPositions/animatedGroupPositions로 덮어씀
        setExpandingSubcluster(subclusterId);
        setCollapsedSubclusters((prev) => {
          const newSet = new Set(prev);
          newSet.delete(subclusterId);
          return newSet;
        });
      } else {
        // 접기: 현재 멤버 노드 위치의 centroid를 새 그룹 위치로 저장
        const sc = subclusters.find((s) => s.id === subclusterId);
        if (sc) {
          const memberNodes = sc.nodeIds
            .map((id) => positionedNodes.find((n) => n.id === id))
            .filter(Boolean) as PositionedNode[];
          if (memberNodes.length > 0) {
            const avgX = memberNodes.reduce((s, n) => s + n.x, 0) / memberNodes.length;
            const avgY = memberNodes.reduce((s, n) => s + n.y, 0) / memberNodes.length;
            setGroupNodePositions((prev) => {
              const next = new Map(prev);
              next.set(subclusterId, { x: avgX, y: avgY });
              return next;
            });
          }
        }

        if (simulationRef.current) {
          simulationRef.current.stop();
          simulationRef.current = null;
        }
        setExpandingSubcluster(null);
        setAnimatedPositions(new Map());
        setAnimatedGroupPositions(new Map());
        setCollapsedSubclusters((prev) => {
          const newSet = new Set(prev);
          newSet.add(subclusterId);
          return newSet;
        });
      }
    },
    [collapsedSubclusters, subclusters, groupNodePositions, positionedNodes, width, height],
  );

  // 서브클러스터 펼치기: 해당 대분류 클러스터 전체 노드 재배치 live sim
  useEffect(() => {
    if (!expandingSubcluster) {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      return;
    }

    if (simulationRef.current) return;

    const expandingSc = subclusters.find((s) => s.id === expandingSubcluster);
    if (!expandingSc) return;

    const groupCenter = expandingGroupCenterRef.current;
    if (!groupCenter) return;

    // 어느 대분류 클러스터인지 확인
    const firstMemberNode = positionedNodes.find((n) => expandingSc.nodeIds.includes(n.id));
    const clusterName = firstMemberNode?.clusterName;
    if (!clusterName) return;

    const clusterCircle = circles.find((c) => c.clusterId === clusterName);
    const cx = clusterCircle?.centerX ?? groupCenter.x;
    const cy = clusterCircle?.centerY ?? groupCenter.y;

    // 이 클러스터에 속한 모든 노드
    const clusterNodes = positionedNodes.filter((n) => n.clusterName === clusterName);

    // 이 클러스터에 있는 서브클러스터 목록
    const scIdsInCluster = new Set<string>();
    clusterNodes.forEach((n) => {
      const scId = nodeToSubclusterMap.get(n.id);
      if (scId) scIdsInCluster.add(scId);
    });

    type EffNode = d3Force.SimulationNodeDatum & {
      efId: string;
      isGroup: boolean;
      scId?: string;
      nodeId?: number;
      memberCount: number;
      x: number;
      y: number;
    };

    const effNodes: EffNode[] = [];

    scIdsInCluster.forEach((scId) => {
      const sc = subclusterMap.get(scId);
      if (!sc) return;

      if (collapsedSubclusters.has(scId)) {
        // 여전히 접힌 상태: 슈퍼 노드 (현재 그룹 위치에서 시작)
        const gp = groupNodePositions.get(scId) ?? { x: cx, y: cy };
        effNodes.push({
          efId: `group_${scId}`,
          isGroup: true,
          scId,
          memberCount: sc.nodeIds.length,
          x: gp.x,
          y: gp.y,
        });
      } else if (scId === expandingSubcluster) {
        // 새로 펼쳐지는 노드들: 그룹 중심에서 시작
        sc.nodeIds.forEach((nodeId, i) => {
          const angle = (2 * Math.PI * i) / sc.nodeIds.length;
          effNodes.push({
            efId: `node_${nodeId}`,
            isGroup: false,
            nodeId,
            memberCount: 1,
            x: groupCenter.x + 3 * Math.cos(angle) + (Math.random() - 0.5),
            y: groupCenter.y + 3 * Math.sin(angle) + (Math.random() - 0.5),
          });
        });
      } else {
        // 이미 펼쳐진 노드들: 현재 위치에서 시작
        sc.nodeIds.forEach((nodeId) => {
          const pn = positionedNodes.find((n) => n.id === nodeId);
          effNodes.push({
            efId: `node_${nodeId}`,
            isGroup: false,
            nodeId,
            memberCount: 1,
            x: pn?.x ?? cx,
            y: pn?.y ?? cy,
          });
        });
      }
    });

    // 서브클러스터에 속하지 않는 개별 노드
    clusterNodes.forEach((n) => {
      if (!nodeToSubclusterMap.has(n.id)) {
        effNodes.push({
          efId: `node_${n.id}`,
          isGroup: false,
          nodeId: n.id,
          memberCount: 1,
          x: n.x,
          y: n.y,
        });
      }
    });

    if (effNodes.length === 0) return;

    // effective 노드 수 기반으로 경계 반경 계산
    const boundaryRadius = 15 + 14 * Math.sqrt(effNodes.length);

    // 개별 노드 간 링크 구성
    const nodeIdToEfId = new Map<number, string>();
    effNodes.forEach((en) => {
      if (!en.isGroup && en.nodeId !== undefined) nodeIdToEfId.set(en.nodeId, en.efId);
    });
    const efIdToNode = new Map(effNodes.map((en) => [en.efId, en]));
    const simLinks: { source: EffNode; target: EffNode }[] = [];
    const linkSet = new Set<string>();
    rawEdges.forEach((e) => {
      const sId = nodeIdToEfId.get(e.source);
      const tId = nodeIdToEfId.get(e.target);
      if (!sId || !tId || sId === tId) return;
      const key = [sId, tId].sort().join("|");
      if (linkSet.has(key)) return;
      linkSet.add(key);
      const sNode = efIdToNode.get(sId);
      const tNode = efIdToNode.get(tId);
      if (sNode && tNode) simLinks.push({ source: sNode, target: tNode });
    });

    const simulation = d3Force
      .forceSimulation<EffNode>(effNodes)
      .force("center", d3Force.forceCenter(cx, cy).strength(0.5))
      .force("radial", d3Force.forceRadial(0, cx, cy).strength(0.08))
      .force(
        "charge",
        d3Force.forceManyBody<EffNode>().strength((d) => -15 - d.memberCount * 8),
      )
      .force(
        "collision",
        d3Force
          .forceCollide<EffNode>((d) => 6 + Math.sqrt(d.memberCount) * 5)
          .iterations(3),
      )
      .force(
        "link",
        d3Force
          .forceLink<EffNode, any>(simLinks)
          .id((d) => d.efId)
          .distance(20)
          .strength(0.3),
      )
      .alpha(0.4)          // 초기 힘을 약하게 → 첫 프레임부터 부드럽게 시작
      .alphaDecay(0.008)   // 느리게 수렴 → 애니메이션 지속시간 증가
      .velocityDecay(0.55) // 마찰 증가 → 노드가 천천히 이동
      .on("tick", () => {
        // 경계 내로 클램핑
        effNodes.forEach((n) => {
          const dx = n.x! - cx;
          const dy = n.y! - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > boundaryRadius) {
            const k = boundaryRadius / dist;
            n.x = cx + dx * k;
            n.y = cy + dy * k;
          }
        });

        // 개별 노드 + 슈퍼 노드 위치를 모두 애니메이션에 반영
        const nodePositions = new Map<number, { x: number; y: number }>();
        const groupPosUpdates = new Map<string, { x: number; y: number }>();
        effNodes.forEach((en) => {
          if (!en.isGroup && en.nodeId !== undefined) {
            nodePositions.set(en.nodeId, { x: en.x!, y: en.y! });
          } else if (en.isGroup && en.scId) {
            groupPosUpdates.set(en.scId, { x: en.x!, y: en.y! });
          }
        });
        setAnimatedPositions(new Map(nodePositions));
        setAnimatedGroupPositions(new Map(groupPosUpdates));
      })
      .on("end", () => {
        // 최종 위치를 positionedNodes와 groupNodePositions에 확정
        setPositionedNodes((prev) => {
          const nodeMap = new Map(prev.map((n) => [n.id, n]));
          effNodes.forEach((en) => {
            if (!en.isGroup && en.nodeId !== undefined) {
              const existing = nodeMap.get(en.nodeId);
              if (existing) nodeMap.set(en.nodeId, { ...existing, x: en.x!, y: en.y! });
            }
          });
          return Array.from(nodeMap.values());
        });
        setGroupNodePositions((prev) => {
          const next = new Map(prev);
          effNodes.forEach((en) => {
            if (en.isGroup && en.scId) next.set(en.scId, { x: en.x!, y: en.y! });
          });
          return next;
        });
        shouldRepositionClustersRef.current = true; // 클러스터 간격 재조정 트리거
        setExpandingSubcluster(null);
        setAnimatedPositions(new Map());
        setAnimatedGroupPositions(new Map());
        expandingGroupCenterRef.current = null;
        simulationRef.current = null;
      });

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
      simulationRef.current = null;
    };
  }, [
    expandingSubcluster,
    subclusters,
    positionedNodes,
    rawEdges,
    circles,
    nodeToSubclusterMap,
    subclusterMap,
    collapsedSubclusters,
    groupNodePositions,
  ]);

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

    // 포커스 뷰에서는 중분류 접기 비활성화
    if (e.altKey && !clusterFocusActive) {
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
            displayCircles.map((circle) => (
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
            displayCircles.map((circle) => (
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
              const baseRadius = 10;
              const radius = Math.max(baseRadius, Math.sqrt(n.size ?? 0) * 1.8);
              const displayRadius = isHovered ? radius + 1.5 : radius;
              const groupFill =
                (clusterFocusActive && n.subcluster_id
                  ? subclusterColorMap.get(n.subcluster_id)
                  : undefined) ??
                n.color ??
                "var(--color-node-focus)";
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
                  <circle r={displayRadius} fill={groupFill} />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
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
            // 엣지 수가 많은 노드는 중첩 노드와 같은 색상 사용
            const isHighlyConnected =
              maxEdgeCount > 0 && (n.edgeCount ?? 0) >= maxEdgeCount * 0.5;
            const baseFill =
              subclusterFill ??
              (isHighlyConnected
                ? "var(--color-node-focus)"
                : "var(--color-node-default)");
            const fill =
              isFocused || isHovered ? "var(--color-node-focus)" : baseFill;
            const title =
              clusterFocusActive && typeof n.id === "number"
                ? (nodeTitleMap.get(n.id) ?? n.label ?? String(n.id))
                : null;
            const displayTitle =
              title && title.length > 12 ? title.slice(0, 12) + "…" : title;

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

      {/* 줌 컨트롤 */}
      <ZoomControls
        scale={scale}
        onZoomIn={() => setScale((s) => Math.min(s * 1.2, 5))}
        onZoomOut={() => setScale((s) => Math.max(s / 1.2, 0.1))}
        onReset={() => {
          setScale(1);
          setOffset({ x: 0, y: 0 });
        }}
      />

      {/* 노드 클릭 시 채팅 미리보기 */}
      {selectedNodeId && (
        <NodeChatPreview
          threadId={selectedNodeId}
          onClose={() => setSelectedNodeId(null)}
          onExpand={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}
