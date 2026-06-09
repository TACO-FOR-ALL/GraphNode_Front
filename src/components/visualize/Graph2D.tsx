import { api } from "@/apiClient";
import {
  ClusterCircle,
  PositionedEdge,
  PositionedNode,
  GraphSnapshot,
  GraphSubcluster,
} from "@/types/GraphData";
import { useQueryClient } from "@tanstack/react-query";
import * as d3Force from "d3-force";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import NodePreview from "./NodePreview";
import NodeEditMenu from "./NodeEditMenu";

type GraphProps = {
  rawNodes: PositionedNode[];
  rawEdges: PositionedEdge[];
  rawSubclusters?: GraphSubcluster[];
  width: number;
  height: number;
  avatarUrl: string | null;
  onClustersReady?: (
    clusters: ClusterCircle[],
    nodes: PositionedNode[],
    edges: PositionedEdge[],
  ) => void;
  zoomToClusterId?: string | null;
  minEdgeWeight?: number;
  onZoomReady?: (fns: { zoomIn: () => void; zoomOut: () => void }) => void;
  onScaleChange?: (scale: number) => void;
  activeNodeId?: number | string | null;
  onActiveNodeChange?: (id: number | string | null) => void;
};

type SimNode = d3Force.SimulationNodeDatum &
  PositionedNode & {
    clusterKey: string;
  };

type SimLink = {
  source: number;
  target: number;
  weight: number;
  isIntraCluster: boolean;
};

type ClusterMeta = {
  key: string;
  centerX: number;
  centerY: number;
  radius: number;
};

type RenderNode = {
  id: number | string;
  x: number;
  y: number;
  clusterName: string;
  edgeCount: number;
  isGroupNode: boolean;
  subclusterId?: string;
  size?: number;
  label?: string;
  origNode?: PositionedNode;
};

type RenderEdge = {
  id: string;
  source: number | string;
  target: number | string;
  isIntraCluster: boolean;
};

type DisplaySimNode = d3Force.SimulationNodeDatum & {
  id: number | string;
  kind: "group" | "node";
  anchored: boolean;
  clusterName: string;
  subclusterId?: string;
  size?: number;
  targetX: number;
  targetY: number;
  x: number;
  y: number;
};

type DragTarget = {
  id: number | string;
  isGroup: boolean;
  subclusterId?: string;
};

type DisplaySimLink = {
  source: number | string | DisplaySimNode;
  target: number | string | DisplaySimNode;
  isIntraCluster: boolean;
};

type PendingMutation = {
  label: string;
  revert: () => void;
  commit: () => Promise<void>;
  timerId: ReturnType<typeof setTimeout>;
};

const BASE_NODE_RADIUS = 5;
const HIGH_EDGE_RATIO = 0.5;
const MIN_HIGHLIGHT_EDGE_COUNT = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getClusterKey(node: PositionedNode): string {
  return node.clusterName || node.clusterId || "default";
}

function createNodeToSubclusterMap(
  subclusters: GraphSubcluster[],
): Map<number, string> {
  const map = new Map<number, string>();
  subclusters.forEach((subcluster) => {
    subcluster.nodeIds.forEach((nodeId) => map.set(nodeId, subcluster.id));
  });
  return map;
}

function buildVisibleSubclusterGraph(
  scopedNodes: PositionedNode[],
  scopedEdges: PositionedEdge[],
  subclusters: GraphSubcluster[],
  collapsedSubclusters: Set<string>,
): { nodes: RenderNode[]; edges: RenderEdge[] } {
  const baseNodeMap = new Map(scopedNodes.map((node) => [node.id, node]));
  const nodeToSubcluster = createNodeToSubclusterMap(subclusters);
  const renderNodes: RenderNode[] = [];
  const renderNodeMap = new Map<number | string, RenderNode>();
  const memberToDisplayId = new Map<number, number | string>();

  subclusters.forEach((subcluster) => {
    if (!collapsedSubclusters.has(subcluster.id)) return;
    const members = subcluster.nodeIds
      .map((id) => baseNodeMap.get(id))
      .filter((node): node is PositionedNode => !!node);
    if (members.length === 0) return;

    const centerX =
      members.reduce((sum, node) => sum + node.x, 0) / members.length;
    const centerY =
      members.reduce((sum, node) => sum + node.y, 0) / members.length;
    const clusterKeyCounts = new Map<string, number>();
    members.forEach((m) => {
      const k = getClusterKey(m);
      clusterKeyCounts.set(k, (clusterKeyCounts.get(k) ?? 0) + 1);
    });
    const clusterName = [...clusterKeyCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0][0];
    const displayId = `__group_${subcluster.id}`;

    const groupNode: RenderNode = {
      id: displayId,
      x: centerX,
      y: centerY,
      clusterName,
      edgeCount: 0,
      isGroupNode: true,
      subclusterId: subcluster.id,
      size: subcluster.size,
      label: subcluster.topKeywords?.[0] || "Group",
    };

    renderNodes.push(groupNode);
    renderNodeMap.set(displayId, groupNode);
    members.forEach((member) => {
      if (!memberToDisplayId.has(member.id)) {
        memberToDisplayId.set(member.id, displayId);
      }
    });
  });

  scopedNodes.forEach((node) => {
    if (renderNodeMap.has(node.id)) return;
    const subclusterId = nodeToSubcluster.get(node.id);
    if (subclusterId && collapsedSubclusters.has(subclusterId)) return;

    const regularNode: RenderNode = {
      id: node.id,
      x: node.x,
      y: node.y,
      clusterName: getClusterKey(node),
      edgeCount: node.edgeCount ?? 0,
      isGroupNode: false,
      subclusterId,
      label: node.origId,
      origNode: node,
    };

    renderNodes.push(regularNode);
    renderNodeMap.set(node.id, regularNode);
    memberToDisplayId.set(node.id, node.id);
  });

  const renderEdges: RenderEdge[] = [];
  const seen = new Set<string>();
  const edgeCountMap = new Map<number | string, number>();

  scopedEdges.forEach((edge) => {
    const sId = memberToDisplayId.get(edge.source);
    const tId = memberToDisplayId.get(edge.target);
    if (sId === undefined || tId === undefined || sId === tId) return;

    const key = [String(sId), String(tId)].sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);

    const sNode = renderNodeMap.get(sId);
    const tNode = renderNodeMap.get(tId);
    if (!sNode || !tNode) return;

    renderEdges.push({
      id: key,
      source: sId,
      target: tId,
      isIntraCluster: sNode.clusterName === tNode.clusterName,
    });

    edgeCountMap.set(sId, (edgeCountMap.get(sId) ?? 0) + 1);
    edgeCountMap.set(tId, (edgeCountMap.get(tId) ?? 0) + 1);
  });

  const nodesWithEdgeCount = renderNodes.map((node) => ({
    ...node,
    edgeCount: edgeCountMap.get(node.id) ?? node.edgeCount ?? 0,
  }));

  return { nodes: nodesWithEdgeCount, edges: renderEdges };
}

function buildClusterCenters(
  nodes: PositionedNode[],
  width: number,
  height: number,
): Map<string, ClusterMeta> {
  const grouped = new Map<string, PositionedNode[]>();
  nodes.forEach((node) => {
    const key = getClusterKey(node);
    const bucket = grouped.get(key) ?? [];
    bucket.push(node);
    grouped.set(key, bucket);
  });

  const keys = Array.from(grouped.keys());
  const total = Math.max(1, keys.length);
  const cx = width / 2;
  const cy = height / 2;

  type ClusterSeed = d3Force.SimulationNodeDatum & {
    key: string;
    radius: number;
    x: number;
    y: number;
  };

  const seeds: ClusterSeed[] = keys.map((key, idx) => {
    const nodeCount = grouped.get(key)?.length ?? 1;
    const radius = Math.max(100, 42 + Math.sqrt(nodeCount) * 26);
    const angle = (2 * Math.PI * idx) / total;
    const dist = Math.min(width, height) * Math.min(0.44, 0.22 + total * 0.05);
    return {
      key,
      radius,
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
    };
  });

  const sim = d3Force
    .forceSimulation<ClusterSeed>(seeds)
    .force("center", d3Force.forceCenter(cx, cy).strength(0.015))
    .force("charge", d3Force.forceManyBody().strength(-1800))
    .force(
      "collide",
      d3Force
        .forceCollide<ClusterSeed>(
          (d) => d.radius + Math.min(100, 30 + total * 14),
        )
        .strength(1)
        .iterations(6),
    )
    .stop();

  for (let i = 0; i < 200; i += 1) {
    sim.tick();
    seeds.forEach((seed) => {
      seed.x = clamp(seed.x ?? cx, -width, width * 2);
      seed.y = clamp(seed.y ?? cy, -height, height * 2);
    });
  }

  return new Map(
    seeds.map((seed) => [
      seed.key,
      {
        key: seed.key,
        centerX: seed.x,
        centerY: seed.y,
        radius: seed.radius,
      },
    ]),
  );
}

function buildLayout(
  rawNodes: PositionedNode[],
  rawEdges: PositionedEdge[],
  width: number,
  height: number,
  minEdgeWeight: number,
): {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  circles: ClusterCircle[];
} {
  const ids = new Set(rawNodes.map((n) => n.id));
  const filteredEdges = rawEdges.filter(
    (edge) =>
      edge.weight >= minEdgeWeight &&
      ids.has(edge.source) &&
      ids.has(edge.target),
  );

  const edgeDegree = new Map<number, number>();
  rawNodes.forEach((node) => edgeDegree.set(node.id, 0));
  filteredEdges.forEach((edge) => {
    edgeDegree.set(edge.source, (edgeDegree.get(edge.source) ?? 0) + 1);
    edgeDegree.set(edge.target, (edgeDegree.get(edge.target) ?? 0) + 1);
  });

  const clusterCenters = buildClusterCenters(rawNodes, width, height);
  const nodeById = new Map(rawNodes.map((node) => [node.id, node]));

  const simNodes: SimNode[] = rawNodes.map((node, index) => {
    const clusterKey = getClusterKey(node);
    const cluster = clusterCenters.get(clusterKey);
    const angle = (2 * Math.PI * index) / Math.max(rawNodes.length, 1);
    const jitter = 14 + Math.random() * 26;

    return {
      ...node,
      clusterKey,
      edgeCount: edgeDegree.get(node.id) ?? 0,
      x: cluster ? cluster.centerX + Math.cos(angle) * jitter : width / 2,
      y: cluster ? cluster.centerY + Math.sin(angle) * jitter : height / 2,
      vx: 0,
      vy: 0,
    };
  });

  const clusterKeyById = new Map<number, string>(
    simNodes.map((node) => [node.id, node.clusterKey]),
  );

  const simLinks: SimLink[] = filteredEdges.map((edge) => {
    const sKey = clusterKeyById.get(edge.source);
    const tKey = clusterKeyById.get(edge.target);
    return {
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
      isIntraCluster: !!sKey && !!tKey && sKey === tKey,
    };
  });
  const physicalLinks = simLinks.filter((link) => link.isIntraCluster);

  const simulation = d3Force
    .forceSimulation<SimNode>(simNodes)
    .force(
      "link",
      d3Force
        .forceLink<SimNode, SimLink>(physicalLinks)
        .id((d) => d.id)
        .distance(65)
        .strength(0.24),
    )
    .force("charge", d3Force.forceManyBody<SimNode>().strength(-110))
    .force(
      "collide",
      d3Force.forceCollide<SimNode>(() => BASE_NODE_RADIUS + 4).iterations(2),
    )
    .force(
      "x",
      d3Force
        .forceX<SimNode>(
          (d) => clusterCenters.get(d.clusterKey)?.centerX ?? width / 2,
        )
        .strength(0.45),
    )
    .force(
      "y",
      d3Force
        .forceY<SimNode>(
          (d) => clusterCenters.get(d.clusterKey)?.centerY ?? height / 2,
        )
        .strength(0.45),
    )
    .alpha(1)
    .alphaDecay(0.045)
    .stop();

  for (let i = 0; i < 260; i += 1) {
    simulation.tick();

    simNodes.forEach((node) => {
      const cluster = clusterCenters.get(node.clusterKey);
      if (!cluster) return;

      const dx = (node.x ?? cluster.centerX) - cluster.centerX;
      const dy = (node.y ?? cluster.centerY) - cluster.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const limit = Math.max(14, cluster.radius - 18);

      if (dist > limit) {
        const ratio = limit / dist;
        node.x = cluster.centerX + dx * ratio;
        node.y = cluster.centerY + dy * ratio;
      }
    });
  }

  const positionedNodes: PositionedNode[] = simNodes.map((node) => ({
    ...node,
    x: node.x ?? width / 2,
    y: node.y ?? height / 2,
    edgeCount: edgeDegree.get(node.id) ?? 0,
  }));

  const classifiedEdges: PositionedEdge[] = filteredEdges.map((edge) => {
    const s = nodeById.get(edge.source);
    const t = nodeById.get(edge.target);
    const isIntra = !!s && !!t && getClusterKey(s) === getClusterKey(t);

    return {
      ...edge,
      intraCluster: isIntra,
      isIntraCluster: isIntra,
    };
  });

  const groupedNodes = new Map<string, PositionedNode[]>();
  positionedNodes.forEach((node) => {
    const key = getClusterKey(node);
    const bucket = groupedNodes.get(key) ?? [];
    bucket.push(node);
    groupedNodes.set(key, bucket);
  });

  const circles: ClusterCircle[] = Array.from(groupedNodes.entries()).map(
    ([key, nodes]) => {
      const avgX = nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
      const avgY = nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length;
      const maxDist = Math.max(
        ...nodes.map((node) => Math.hypot(node.x - avgX, node.y - avgY)),
        30,
      );

      return {
        clusterId: key,
        clusterName: key,
        centerX: avgX,
        centerY: avgY,
        radius: maxDist + 34,
      };
    },
  );

  return {
    nodes: positionedNodes,
    edges: classifiedEdges,
    circles,
  };
}

export default function Graph2D({
  rawNodes,
  rawEdges,
  rawSubclusters,
  width,
  height,
  avatarUrl,
  onClustersReady,
  zoomToClusterId,
  minEdgeWeight = 0.6,
  onZoomReady,
  onScaleChange,
  activeNodeId = null,
  onActiveNodeChange,
}: GraphProps) {
  const subclusters = rawSubclusters ?? [];
  const subclusterIdsKey = useMemo(
    () => [...subclusters.map((subcluster) => subcluster.id)].sort().join("|"),
    [subclusters],
  );
  void avatarUrl;

  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [edges, setEdges] = useState<PositionedEdge[]>([]);
  const [circles, setCircles] = useState<ClusterCircle[]>([]);
  const [collapsedSubclusters, setCollapsedSubclusters] = useState<Set<string>>(
    () => new Set(subclusters.map((subcluster) => subcluster.id)),
  );
  const [hoveredNodeId, setHoveredNodeId] = useState<number | string | null>(
    null,
  );
  const [selectedNode, setSelectedNode] = useState<{
    origId: string;
    sourceType?: "chat" | "markdown" | "notion";
  } | null>(null);
  const [rightClickedNode, setRightClickedNode] = useState<{
    id: number;
    origid: string;
    position: { x: number; y: number };
  } | null>(null);
  const [focusedClusterId, setFocusedClusterId] = useState<string | null>(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [draggingTarget, setDraggingTarget] = useState<DragTarget | null>(null);
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isMutatingRef = useRef(false);

  const [pendingMutation, setPendingMutation] =
    useState<PendingMutation | null>(null);
  const pendingMutationRef = useRef<PendingMutation | null>(null);

  const scheduleMutation = useCallback(
    (revert: () => void, commit: () => Promise<void>, label: string) => {
      if (pendingMutationRef.current) {
        clearTimeout(pendingMutationRef.current.timerId);
        const prev = pendingMutationRef.current;
        prev.commit().catch(prev.revert);
      }
      const timerId = setTimeout(async () => {
        pendingMutationRef.current = null;
        setPendingMutation(null);
        try {
          await commit();
        } catch {
          revert();
        }
      }, 3500);
      const mutation: PendingMutation = { label, revert, commit, timerId };
      pendingMutationRef.current = mutation;
      setPendingMutation(mutation);
    },
    [],
  );

  const handleUndo = useCallback(() => {
    const m = pendingMutationRef.current;
    if (!m) return;
    clearTimeout(m.timerId);
    m.revert();
    pendingMutationRef.current = null;
    setPendingMutation(null);
  }, []);

  useEffect(
    () => () => {
      const m = pendingMutationRef.current;
      if (m) {
        clearTimeout(m.timerId);
        m.commit().catch(m.revert);
      }
    },
    [],
  );

  const nodesRef = useRef<PositionedNode[]>([]);
  const edgesRef = useRef<PositionedEdge[]>([]);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const nodeEditActions = useMemo(() => {
    if (!rightClickedNode) return null;
    const nid = rightClickedNode.id;

    return {
      rename: async (label: string) => {
        let snap: PositionedNode[] | null = null;
        setNodes((prev) => {
          snap = prev;
          return prev.map((n) =>
            n.id === nid ? { ...n, nodeTitle: label } : n,
          );
        });
        scheduleMutation(
          () => setNodes(snap!),
          async () => {
            const res = await api.graphEditor.updateNode(nid, { label });
            if (!res.isSuccess) throw res.error;
            isMutatingRef.current = true;
            queryClient.setQueryData(
              ["graphData"],
              (
                old:
                  | { nodeEdgeData: GraphSnapshot; graphSummary: unknown }
                  | undefined,
              ) => {
                if (!old) return old;
                return {
                  ...old,
                  nodeEdgeData: {
                    ...old.nodeEdgeData,
                    nodes: old.nodeEdgeData.nodes.map((n) =>
                      n.id === nid ? { ...n, nodeTitle: label } : n,
                    ),
                  },
                };
              },
            );
          },
          t("visualize.nodeEditMenu.rename"),
        );
      },

      move: async (clusterKey: string) => {
        const realClusterId =
          nodesRef.current.find((n) => getClusterKey(n) === clusterKey)
            ?.clusterId ?? clusterKey;
        let snap: PositionedNode[] | null = null;
        let oldClusterKey: string | null = null;
        let oldClusterName: string | null = null;
        let oldClusterId: string | null = null;
        setNodes((prev) => {
          snap = prev;
          return prev.map((n) =>
            n.id === nid
              ? { ...n, clusterId: realClusterId, clusterName: clusterKey }
              : n,
          );
        });
        const simNode = simNodeMapRef.current.get(nid);
        if (simNode) {
          oldClusterKey = simNode.clusterKey;
          oldClusterName = simNode.clusterName;
          oldClusterId = simNode.clusterId;
          simNode.clusterKey = clusterKey;
          simNode.clusterName = clusterKey;
          simNode.clusterId = realClusterId;

          const dispNode = displaySimNodeMapRef.current.get(nid);
          if (dispNode) dispNode.clusterName = clusterKey;

          // Dynamic strength: zero out links that cross cluster boundaries after move
          (simulationRef.current?.force("link") as d3Force.ForceLink<SimNode, SimLink> | undefined)
            ?.strength((link) => {
              const s = (link.source as unknown) as SimNode;
              const t = (link.target as unknown) as SimNode;
              return s.clusterKey === t.clusterKey ? 0.24 : 0;
            });
          (displaySimulationRef.current?.force("link") as d3Force.ForceLink<DisplaySimNode, DisplaySimLink> | undefined)
            ?.strength((link) => {
              const s = (link.source as unknown) as DisplaySimNode;
              const t = (link.target as unknown) as DisplaySimNode;
              return s.clusterName === t.clusterName ? 0.24 : 0;
            });

          simulationRef.current?.alpha(0.3).restart();
          displaySimulationRef.current?.alpha(0.3).restart();
        }
        scheduleMutation(
          () => {
            setNodes(snap!);
            const sn = simNodeMapRef.current.get(nid);
            if (sn && oldClusterKey) {
              sn.clusterKey = oldClusterKey;
              sn.clusterName = oldClusterName!;
              sn.clusterId = oldClusterId!;

              const dispNode = displaySimNodeMapRef.current.get(nid);
              if (dispNode) dispNode.clusterName = oldClusterName!;

              simulationRef.current?.alpha(0.3).restart();
              displaySimulationRef.current?.alpha(0.3).restart();
            }
          },
          async () => {
            const res = await api.graphEditor.moveNodeToCluster(nid, {
              newClusterId: realClusterId,
            });
            if (!res.isSuccess) throw res.error;
            isMutatingRef.current = true;
            queryClient.setQueryData(
              ["graphData"],
              (
                old:
                  | { nodeEdgeData: GraphSnapshot; graphSummary: unknown }
                  | undefined,
              ) => {
                if (!old) return old;
                return {
                  ...old,
                  nodeEdgeData: {
                    ...old.nodeEdgeData,
                    nodes: old.nodeEdgeData.nodes.map((n) =>
                      n.id === nid
                        ? {
                            ...n,
                            clusterId: realClusterId,
                            clusterName: clusterKey,
                          }
                        : n,
                    ),
                  },
                };
              },
            );
          },
          t("visualize.nodeEditMenu.move"),
        );
      },

      connect: async (targetId: number) => {
        const tempId = `temp-${Date.now()}`;
        const tempEdge: PositionedEdge = {
          id: tempId,
          source: nid,
          target: targetId,
          weight: 1.0,
          userId: "",
          type: "insight",
          intraCluster: false,
          isIntraCluster: false,
        };
        setEdges((prev) => [...prev, tempEdge]);
        scheduleMutation(
          () => setEdges((prev) => prev.filter((e) => e.id !== tempId)),
          async () => {
            const res = await api.graphEditor.createEdge({
              source: nid,
              target: targetId,
              weight: 1.0,
            });
            if (!res.isSuccess) throw res.error;
            const realId = res.data.edgeId;
            setEdges((prev) =>
              prev.map((e) => (e.id === tempId ? { ...e, id: realId } : e)),
            );
            isMutatingRef.current = true;
            queryClient.setQueryData(
              ["graphData"],
              (
                old:
                  | { nodeEdgeData: GraphSnapshot; graphSummary: unknown }
                  | undefined,
              ) => {
                if (!old) return old;
                return {
                  ...old,
                  nodeEdgeData: {
                    ...old.nodeEdgeData,
                    edges: [
                      ...old.nodeEdgeData.edges,
                      { ...tempEdge, id: realId },
                    ],
                  },
                };
              },
            );
          },
          t("visualize.nodeEditMenu.connect"),
        );
      },

      disconnect: async (edgeId: string) => {
        let snap: PositionedEdge[] | null = null;
        setEdges((prev) => {
          snap = prev;
          return prev.filter((e) => e.id !== edgeId);
        });
        scheduleMutation(
          () => setEdges(snap!),
          async () => {
            const res = await api.graphEditor.deleteEdge(edgeId);
            if (!res.isSuccess) throw res.error;
            isMutatingRef.current = true;
            queryClient.setQueryData(
              ["graphData"],
              (
                old:
                  | { nodeEdgeData: GraphSnapshot; graphSummary: unknown }
                  | undefined,
              ) => {
                if (!old) return old;
                return {
                  ...old,
                  nodeEdgeData: {
                    ...old.nodeEdgeData,
                    edges: old.nodeEdgeData.edges.filter(
                      (e) => e.id !== edgeId,
                    ),
                  },
                };
              },
            );
          },
          t("visualize.nodeEditMenu.disconnect"),
        );
      },

      delete: async () => {
        let snapNodes: PositionedNode[] | null = null;
        let snapEdges: PositionedEdge[] | null = null;
        setNodes((prev) => {
          snapNodes = prev;
          return prev.filter((n) => n.id !== nid);
        });
        setEdges((prev) => {
          snapEdges = prev;
          return prev.filter((e) => e.source !== nid && e.target !== nid);
        });
        scheduleMutation(
          () => {
            setNodes(snapNodes!);
            setEdges(snapEdges!);
          },
          async () => {
            const res = await api.graphEditor.deleteNode(nid, true);
            if (!res.isSuccess) throw res.error;
            isMutatingRef.current = true;
            queryClient.setQueryData(
              ["graphData"],
              (
                old:
                  | { nodeEdgeData: GraphSnapshot; graphSummary: unknown }
                  | undefined,
              ) => {
                if (!old) return old;
                return {
                  ...old,
                  nodeEdgeData: {
                    ...old.nodeEdgeData,
                    nodes: old.nodeEdgeData.nodes.filter((n) => n.id !== nid),
                    edges: old.nodeEdgeData.edges.filter(
                      (e) => e.source !== nid && e.target !== nid,
                    ),
                  },
                };
              },
            );
          },
          t("visualize.nodeEditMenu.delete"),
        );
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rightClickedNode, scheduleMutation, t]);

  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragNodeOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const dragStartPointerRef = useRef<{ x: number; y: number } | null>(null);
  const nodeDraggedRef = useRef(false);
  const simulationRef = useRef<d3Force.Simulation<SimNode, SimLink> | null>(
    null,
  );
  const simNodeMapRef = useRef<Map<number, SimNode>>(new Map());
  const displaySimulationRef = useRef<d3Force.Simulation<
    DisplaySimNode,
    DisplaySimLink
  > | null>(null);
  const displaySimNodeMapRef = useRef<Map<number | string, DisplaySimNode>>(
    new Map(),
  );
  const displaySimSettlingTimerRef = useRef<number | null>(null);
  const dragSettleTimerRef = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  const draggingGroupActiveRef = useRef(false);
  const [displayPositions, setDisplayPositions] = useState<
    Map<number | string, { x: number; y: number }>
  >(new Map());
  const displayPositionsRef = useRef<
    Map<number | string, { x: number; y: number }>
  >(new Map());

  scaleRef.current = scale;
  offsetRef.current = offset;
  displayPositionsRef.current = displayPositions;
  draggingGroupActiveRef.current = !!draggingTarget?.isGroup;

  const scopedNodes = useMemo(
    () =>
      focusedClusterId
        ? nodes.filter((node) => getClusterKey(node) === focusedClusterId)
        : nodes,
    [nodes, focusedClusterId],
  );
  const scopedNodeIdSet = useMemo(
    () => new Set(scopedNodes.map((node) => node.id)),
    [scopedNodes],
  );
  const scopedEdges = useMemo(
    () =>
      focusedClusterId
        ? edges.filter(
            (edge) =>
              scopedNodeIdSet.has(edge.source) &&
              scopedNodeIdSet.has(edge.target),
          )
        : edges,
    [edges, focusedClusterId, scopedNodeIdSet],
  );
  const scopedCircles = useMemo(
    () =>
      focusedClusterId
        ? circles.filter((circle) => circle.clusterId === focusedClusterId)
        : circles,
    [circles, focusedClusterId],
  );
  const activeSubclusters = useMemo(
    () =>
      subclusters.filter((subcluster) =>
        subcluster.nodeIds.some((nodeId) => scopedNodeIdSet.has(nodeId)),
      ),
    [subclusters, scopedNodeIdSet],
  );
  const subclusterMap = useMemo(
    () => new Map(subclusters.map((subcluster) => [subcluster.id, subcluster])),
    [subclusters],
  );
  const displayGraph = useMemo(
    () =>
      buildVisibleSubclusterGraph(
        scopedNodes,
        scopedEdges,
        activeSubclusters,
        collapsedSubclusters,
      ),
    [scopedNodes, scopedEdges, activeSubclusters, collapsedSubclusters],
  );
  const renderNodes = displayGraph.nodes;
  const renderEdges = displayGraph.edges;
  const edgeCounts = useMemo(
    () => new Map(renderNodes.map((node) => [node.id, node.edgeCount])),
    [renderNodes],
  );
  const maxEdgeCount = useMemo(
    () =>
      Math.max(
        1,
        ...renderNodes
          .filter((node) => !node.isGroupNode)
          .map((node) => node.edgeCount ?? 0),
      ),
    [renderNodes],
  );
  const activeConnectedNodeIds = useMemo(() => {
    if (activeNodeId === null) return null;
    const connected = new Set<number | string>([activeNodeId]);
    renderEdges.forEach((edge) => {
      if (edge.source === activeNodeId) connected.add(edge.target);
      if (edge.target === activeNodeId) connected.add(edge.source);
    });
    return connected;
  }, [activeNodeId, renderEdges]);

  const activeEdgeIds = useMemo(() => {
    if (activeNodeId === null) return null;
    const ids = new Set<string>();
    renderEdges.forEach((edge) => {
      if (edge.source === activeNodeId || edge.target === activeNodeId)
        ids.add(edge.id);
    });
    return ids;
  }, [activeNodeId, renderEdges]);

  const displayTopologyKey = useMemo(() => {
    const nodeIds = [...renderNodes.map((node) => String(node.id))].sort();
    const edgeIds = [...renderEdges.map((edge) => edge.id)].sort();
    return `${nodeIds.join(",")}__${edgeIds.join(",")}`;
  }, [renderNodes, renderEdges]);
  const renderedNodes = useMemo(
    () =>
      renderNodes.map((node) => {
        const position = displayPositions.get(node.id);
        if (!position) return node;
        return { ...node, x: position.x, y: position.y };
      }),
    [renderNodes, displayPositions],
  );
  const renderedNodeMap = useMemo(
    () => new Map(renderedNodes.map((node) => [node.id, node])),
    [renderedNodes],
  );

  useEffect(() => {
    setHoveredNodeId(null);
  }, [focusedClusterId]);

  useEffect(() => {
    setCollapsedSubclusters(
      new Set(subclusters.map((subcluster) => subcluster.id)),
    );
  }, [subclusterIdsKey, subclusters]);

  const clearDragSettleTimer = useCallback(() => {
    if (dragSettleTimerRef.current !== null) {
      window.clearTimeout(dragSettleTimerRef.current);
      dragSettleTimerRef.current = null;
    }
  }, []);

  const clearDisplaySimSettlingTimer = useCallback(() => {
    if (displaySimSettlingTimerRef.current !== null) {
      window.clearTimeout(displaySimSettlingTimerRef.current);
      displaySimSettlingTimerRef.current = null;
    }
  }, []);

  const stopDisplaySimulation = useCallback(() => {
    clearDisplaySimSettlingTimer();
    const sim = displaySimulationRef.current;
    if (sim) {
      sim.stop();
      displaySimulationRef.current = null;
    }
    displaySimNodeMapRef.current = new Map();
  }, [clearDisplaySimSettlingTimer]);

  const stopInteractiveSimulation = useCallback(() => {
    clearDragSettleTimer();
    const sim = simulationRef.current;
    if (sim) {
      sim.stop();
      simulationRef.current = null;
    }
    simNodeMapRef.current = new Map();
    stopDisplaySimulation();
  }, [clearDragSettleTimer, stopDisplaySimulation]);

  const createInteractiveSimulation = useCallback(
    (
      baseNodes: PositionedNode[],
      baseEdges: PositionedEdge[],
      baseCircles: ClusterCircle[],
    ) => {
      stopInteractiveSimulation();
      if (baseNodes.length === 0) return;

      const centerByCluster = new Map(
        baseCircles.map((circle) => [
          circle.clusterId,
          {
            x: circle.centerX,
            y: circle.centerY,
            radius: circle.radius,
          },
        ]),
      );

      const simNodes: SimNode[] = baseNodes.map((node) => ({
        ...node,
        clusterKey: getClusterKey(node),
        vx: 0,
        vy: 0,
      }));
      const simNodeMap = new Map(simNodes.map((node) => [node.id, node]));
      simNodeMapRef.current = simNodeMap;

      const simLinks: SimLink[] = baseEdges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        isIntraCluster: edge.isIntraCluster,
      }));
      const physicalLinks = simLinks.filter((link) => link.isIntraCluster);

      const simulation = d3Force
        .forceSimulation<SimNode>(simNodes)
        .force(
          "link",
          d3Force
            .forceLink<SimNode, SimLink>(physicalLinks)
            .id((d) => d.id)
            .distance(65)
            .strength(0.24),
        )
        .force("charge", d3Force.forceManyBody<SimNode>().strength(-110))
        .force(
          "collide",
          d3Force
            .forceCollide<SimNode>(() => BASE_NODE_RADIUS + 4)
            .iterations(2),
        )
        .force(
          "x",
          d3Force
            .forceX<SimNode>(
              (d) => centerByCluster.get(d.clusterKey)?.x ?? width / 2,
            )
            .strength(0.45),
        )
        .force(
          "y",
          d3Force
            .forceY<SimNode>(
              (d) => centerByCluster.get(d.clusterKey)?.y ?? height / 2,
            )
            .strength(0.45),
        )
        .alpha(0)
        .alphaMin(0.001)
        .on("tick", () => {
          simNodes.forEach((node) => {
            const center = centerByCluster.get(node.clusterKey);
            if (!center) return;
            const dx = (node.x ?? center.x) - center.x;
            const dy = (node.y ?? center.y) - center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const limit = Math.max(14, center.radius - 12);
            if (dist > limit) {
              const ratio = limit / dist;
              node.x = center.x + dx * ratio;
              node.y = center.y + dy * ratio;
              if (node.fx != null) {
                node.fx = node.x;
                node.fy = node.y;
              }
            }
          });
          setNodes(simNodes.map((node) => ({ ...node })));
        });

      simulation.stop();
      simulationRef.current = simulation;
    },
    [height, stopInteractiveSimulation, width],
  );

  useEffect(() => {
    // 그래프 수정 엑션 발생 시 그래프 시뮬레이션 재실행 방지
    if (isMutatingRef.current) {
      isMutatingRef.current = false;
      return;
    }

    if (rawNodes.length === 0) {
      stopInteractiveSimulation();
      setNodes([]);
      setEdges([]);
      setCircles([]);
      return;
    }

    const next = buildLayout(rawNodes, rawEdges, width, height, minEdgeWeight);
    setNodes(next.nodes);
    setEdges(next.edges);
    setCircles(next.circles);
    createInteractiveSimulation(next.nodes, next.edges, next.circles);

    onClustersReady?.(next.circles, next.nodes, next.edges);
  }, [
    rawNodes,
    rawEdges,
    width,
    height,
    minEdgeWeight,
    onClustersReady,
    createInteractiveSimulation,
    stopInteractiveSimulation,
  ]);

  useEffect(
    () => () => stopInteractiveSimulation(),
    [stopInteractiveSimulation],
  );

  useEffect(() => {
    stopDisplaySimulation();
    if (renderNodes.length === 0) {
      setDisplayPositions(new Map());
      return;
    }

    const previousPositions = displayPositionsRef.current.size
      ? displayPositionsRef.current
      : new Map(renderNodes.map((node) => [node.id, { x: node.x, y: node.y }]));

    const nodesForDisplaySim: DisplaySimNode[] = renderNodes.map((node) => {
      let startPos = previousPositions.get(node.id);

      if (!startPos && !node.isGroupNode && node.subclusterId) {
        startPos = previousPositions.get(`__group_${node.subclusterId}`);
      }

      if (!startPos && node.isGroupNode && node.subclusterId) {
        const subcluster = subclusterMap.get(node.subclusterId);
        if (subcluster) {
          const memberPositions = subcluster.nodeIds
            .map((id) => previousPositions.get(id))
            .filter((p): p is { x: number; y: number } => !!p);
          if (memberPositions.length > 0) {
            startPos = {
              x:
                memberPositions.reduce((sum, p) => sum + p.x, 0) /
                memberPositions.length,
              y:
                memberPositions.reduce((sum, p) => sum + p.y, 0) /
                memberPositions.length,
            };
          }
        }
      }

      const simNode: DisplaySimNode = {
        id: node.id,
        kind: node.isGroupNode ? "group" : "node",
        anchored: false,
        clusterName: node.clusterName,
        subclusterId: node.subclusterId,
        size: node.size,
        targetX: node.x,
        targetY: node.y,
        x: startPos?.x ?? node.x,
        y: startPos?.y ?? node.y,
      };

      if (simNode.kind === "node") {
        const distanceFromTarget = Math.hypot(
          (simNode.x ?? node.x) - node.x,
          (simNode.y ?? node.y) - node.y,
        );
        simNode.anchored = distanceFromTarget < 1.5;
        if (simNode.anchored) {
          simNode.fx = node.x;
          simNode.fy = node.y;
        }
      }

      return simNode;
    });

    const nodeById = new Map(nodesForDisplaySim.map((node) => [node.id, node]));
    displaySimNodeMapRef.current = nodeById;

    const linksForDisplaySim: DisplaySimLink[] = renderEdges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      isIntraCluster: edge.isIntraCluster,
    }));
    const physicalLinksForDisplaySim = linksForDisplaySim.filter(
      (link) => link.isIntraCluster,
    );

    const centerByCluster = new Map(
      scopedCircles.map((circle) => [
        circle.clusterId,
        { x: circle.centerX, y: circle.centerY, radius: circle.radius },
      ]),
    );

    const simulation = d3Force
      .forceSimulation<DisplaySimNode>(nodesForDisplaySim)
      .force(
        "link",
        d3Force
          .forceLink<DisplaySimNode, DisplaySimLink>(physicalLinksForDisplaySim)
          .id((d) => d.id)
          .distance(65)
          .strength(0.24),
      )
      .force(
        "charge",
        d3Force
          .forceManyBody<DisplaySimNode>()
          .strength((node) => (node.kind === "group" ? -65 : -22)),
      )
      .force(
        "collide",
        d3Force
          .forceCollide<DisplaySimNode>((node) => {
            if (node.kind === "group") {
              return Math.max(
                BASE_NODE_RADIUS * 1.5,
                Math.min(BASE_NODE_RADIUS * 2.3, 7 + Math.sqrt(node.size ?? 1)),
              );
            }
            return BASE_NODE_RADIUS + 4;
          })
          .iterations(2),
      )
      .force(
        "x",
        d3Force
          .forceX<DisplaySimNode>((node) => {
            if (node.kind === "node") return node.targetX;
            return centerByCluster.get(node.clusterName)?.x ?? node.targetX;
          })
          .strength((node) => {
            if (node.kind === "group") return 0.08;
            if (draggingGroupActiveRef.current) return 0.12;
            return node.anchored ? 1 : 0.45;
          }),
      )
      .force(
        "y",
        d3Force
          .forceY<DisplaySimNode>((node) => {
            if (node.kind === "node") return node.targetY;
            return centerByCluster.get(node.clusterName)?.y ?? node.targetY;
          })
          .strength((node) => {
            if (node.kind === "group") return 0.08;
            if (draggingGroupActiveRef.current) return 0.12;
            return node.anchored ? 1 : 0.45;
          }),
      )
      .alpha(0.55)
      .alphaDecay(0.06)
      .on("tick", () => {
        nodesForDisplaySim.forEach((node) => {
          if (node.kind === "node") {
            if (node.anchored && !draggingGroupActiveRef.current) {
              node.x = node.targetX;
              node.y = node.targetY;
              node.fx = node.targetX;
              node.fy = node.targetY;
              return;
            }

            const dxToTarget = node.targetX - (node.x ?? node.targetX);
            const dyToTarget = node.targetY - (node.y ?? node.targetY);
            const distToTarget = Math.sqrt(
              dxToTarget * dxToTarget + dyToTarget * dyToTarget,
            );
            if (distToTarget < 1.2 && !draggingGroupActiveRef.current) {
              node.anchored = true;
              node.x = node.targetX;
              node.y = node.targetY;
              node.fx = node.targetX;
              node.fy = node.targetY;
            } else if (draggingGroupActiveRef.current) {
              node.anchored = false;
              node.fx = null;
              node.fy = null;
            }

            if (!node.anchored) {
              const center = centerByCluster.get(node.clusterName);
              if (center) {
                const cdx = (node.x ?? center.x) - center.x;
                const cdy = (node.y ?? center.y) - center.y;
                const dist = Math.sqrt(cdx * cdx + cdy * cdy);
                const limit = Math.max(14, center.radius - 12);
                if (dist > limit) {
                  const ratio = limit / dist;
                  node.x = center.x + cdx * ratio;
                  node.y = center.y + cdy * ratio;
                }
              }
            }
            return;
          }

          const center = centerByCluster.get(node.clusterName);
          if (!center) return;
          const dx = (node.x ?? center.x) - center.x;
          const dy = (node.y ?? center.y) - center.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const limit = Math.max(20, center.radius - 8);
          if (dist > limit) {
            const ratio = limit / dist;
            node.x = center.x + dx * ratio;
            node.y = center.y + dy * ratio;
          }
        });

        setDisplayPositions(
          new Map(
            nodesForDisplaySim.map((node) => [
              node.id,
              { x: node.x, y: node.y },
            ]),
          ),
        );
      });

    displaySimulationRef.current = simulation;
    setDisplayPositions(
      new Map(
        nodesForDisplaySim.map((node) => [node.id, { x: node.x, y: node.y }]),
      ),
    );

    clearDisplaySimSettlingTimer();
    displaySimSettlingTimerRef.current = window.setTimeout(() => {
      simulation.alphaTarget(0);
      displaySimSettlingTimerRef.current = null;
    }, 700);

    return () => {
      stopDisplaySimulation();
    };
  }, [
    displayTopologyKey,
    subclusterMap,
    clearDisplaySimSettlingTimer,
    stopDisplaySimulation,
  ]);

  useEffect(() => {
    const displaySim = displaySimulationRef.current;
    if (!displaySim) {
      setDisplayPositions(
        new Map(renderNodes.map((node) => [node.id, { x: node.x, y: node.y }])),
      );
      return;
    }

    const simNodeMap = displaySimNodeMapRef.current;
    renderNodes.forEach((node) => {
      const simNode = simNodeMap.get(node.id);
      if (!simNode) return;
      const movementDelta = Math.hypot(
        (simNode.targetX ?? node.x) - node.x,
        (simNode.targetY ?? node.y) - node.y,
      );
      simNode.targetX = node.x;
      simNode.targetY = node.y;
      simNode.clusterName = node.clusterName;
      simNode.size = node.size;
      if (simNode.kind === "node") {
        if (draggingGroupActiveRef.current) {
          simNode.anchored = false;
          simNode.fx = null;
          simNode.fy = null;
          return;
        }
        if (simNode.anchored) {
          simNode.fx = node.x;
          simNode.fy = node.y;
        } else if (movementDelta > 8) {
          simNode.anchored = false;
          simNode.fx = null;
          simNode.fy = null;
        }
      }
    });
  }, [renderNodes]);

  const zoomIn = useCallback(() => {
    setScale((current) => Math.min(5, current * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((current) => Math.max(0.1, current / 1.2));
  }, []);

  useEffect(() => {
    onZoomReady?.({ zoomIn, zoomOut });
  }, [onZoomReady, zoomIn, zoomOut]);

  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  const animateZoomToCluster = useCallback(
    (clusterId: string) => {
      const circle = circles.find((c) => c.clusterId === clusterId);
      if (!circle || !svgRef.current) return;

      const rect = svgRef.current.getBoundingClientRect();
      const targetScale = clamp(170 / Math.max(circle.radius, 1), 1.05, 2.4);
      const targetOffsetX = rect.width / 2 - circle.centerX * targetScale;
      const targetOffsetY = rect.height / 2 - circle.centerY * targetScale;

      const startScale = scaleRef.current;
      const startOffset = offsetRef.current;
      const duration = 700;
      const startTime = performance.now();

      const animate = (now: number) => {
        const progress = clamp((now - startTime) / duration, 0, 1);
        const eased =
          progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        setScale(startScale + (targetScale - startScale) * eased);
        setOffset({
          x: startOffset.x + (targetOffsetX - startOffset.x) * eased,
          y: startOffset.y + (targetOffsetY - startOffset.y) * eased,
        });

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    },
    [circles],
  );

  useEffect(() => {
    if (!zoomToClusterId) return;
    animateZoomToCluster(zoomToClusterId);
  }, [zoomToClusterId, animateZoomToCluster]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    return {
      x: (mouseX - offsetRef.current.x) / scaleRef.current,
      y: (mouseY - offsetRef.current.y) / scaleRef.current,
    };
  }, []);

  const handleNativeWheel = useCallback((event: WheelEvent) => {
    const svg = svgRef.current;
    if (!svg) return;
    event.preventDefault();
    const zoomIntensity = 0.003;
    const rect = svg.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const currentScale = scaleRef.current;
    const currentOffset = offsetRef.current;
    const worldX = (mouseX - currentOffset.x) / currentScale;
    const worldY = (mouseY - currentOffset.y) / currentScale;

    const nextScale = clamp(
      currentScale * (1 - event.deltaY * zoomIntensity),
      0.1,
      5,
    );
    const nextOffsetX = mouseX - worldX * nextScale;
    const nextOffsetY = mouseY - worldY * nextScale;

    setScale(nextScale);
    setOffset({ x: nextOffsetX, y: nextOffsetY });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", handleNativeWheel);
    };
  }, [handleNativeWheel]);

  const handleMouseDown = (event: React.MouseEvent<SVGSVGElement>) => {
    if (draggingTarget !== null) return;
    setIsPanning(true);
    panStartRef.current = {
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
    };
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (draggingTarget !== null && dragNodeOffsetRef.current) {
      const pointer = dragStartPointerRef.current;
      if (pointer) {
        const moved = Math.hypot(
          event.clientX - pointer.x,
          event.clientY - pointer.y,
        );
        if (moved > 3) nodeDraggedRef.current = true;
      }

      const world = screenToWorld(event.clientX, event.clientY);
      const nextX = world.x + dragNodeOffsetRef.current.dx;
      const nextY = world.y + dragNodeOffsetRef.current.dy;

      if (draggingTarget.isGroup) {
        const displayNode = displaySimNodeMapRef.current.get(draggingTarget.id);
        const prevX = displayNode?.x ?? nextX;
        const prevY = displayNode?.y ?? nextY;
        const dx = nextX - prevX;
        const dy = nextY - prevY;

        if (displayNode) {
          displayNode.fx = nextX;
          displayNode.fy = nextY;
          displayNode.x = nextX;
          displayNode.y = nextY;
        }

        if (draggingTarget.subclusterId) {
          const subcluster = subclusterMap.get(draggingTarget.subclusterId);
          if (subcluster && (Math.abs(dx) > 0 || Math.abs(dy) > 0)) {
            const memberSet = new Set(subcluster.nodeIds);
            const clusterById = new Map(circles.map((c) => [c.clusterId, c]));

            const clampToCluster = (
              nx: number,
              ny: number,
              clusterKey: string,
            ) => {
              const cluster = clusterById.get(clusterKey);
              if (!cluster) return { x: nx, y: ny };
              const cdx = nx - cluster.centerX;
              const cdy = ny - cluster.centerY;
              const dist = Math.sqrt(cdx * cdx + cdy * cdy);
              const limit = Math.max(14, cluster.radius - 18);
              if (dist > limit) {
                const ratio = limit / dist;
                return {
                  x: cluster.centerX + cdx * ratio,
                  y: cluster.centerY + cdy * ratio,
                };
              }
              return { x: nx, y: ny };
            };

            setNodes((prev) =>
              prev.map((node) => {
                if (!memberSet.has(node.id)) return node;
                const pos = clampToCluster(
                  node.x + dx,
                  node.y + dy,
                  getClusterKey(node),
                );
                return { ...node, x: pos.x, y: pos.y };
              }),
            );
            subcluster.nodeIds.forEach((memberId) => {
              const member = simNodeMapRef.current.get(memberId);
              if (!member) return;
              const pos = clampToCluster(
                (member.x ?? 0) + dx,
                (member.y ?? 0) + dy,
                member.clusterKey,
              );
              member.x = pos.x;
              member.y = pos.y;
            });
          }
        }
      } else if (typeof draggingTarget.id === "number") {
        const simNode = simNodeMapRef.current.get(draggingTarget.id);
        if (simNode) {
          simNode.fx = nextX;
          simNode.fy = nextY;
          simNode.x = nextX;
          simNode.y = nextY;
        }
      }

      const sim = simulationRef.current;
      if (sim && !draggingTarget.isGroup) {
        sim.alphaTarget(0.26).restart();
      }
      const displaySim = displaySimulationRef.current;
      if (displaySim) {
        displaySim.alphaTarget(0.22).restart();
      }
      return;
    }

    if (!isPanning || !panStartRef.current) return;
    setOffset({
      x: event.clientX - panStartRef.current.x,
      y: event.clientY - panStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    if (draggingTarget !== null) {
      if (!draggingTarget.isGroup && typeof draggingTarget.id === "number") {
        const simNode = simNodeMapRef.current.get(draggingTarget.id);
        if (simNode) {
          // Pin at drop position permanently so forceX/Y never pulls the node
          // back when the simulation is restarted for subsequent interactions.
          simNode.fx = simNode.x;
          simNode.fy = simNode.y;
        }
      }
      if (draggingTarget.isGroup) {
        const displayNode = displaySimNodeMapRef.current.get(draggingTarget.id);
        if (displayNode) {
          displayNode.fx = null;
          displayNode.fy = null;
        }
      }
      const sim = simulationRef.current;
      if (sim && !draggingTarget.isGroup) {
        sim.alphaTarget(0).alpha(0.15).restart();
        clearDragSettleTimer();
        dragSettleTimerRef.current = window.setTimeout(() => {
          sim.stop();
          dragSettleTimerRef.current = null;
        }, 500);
      }
      const displaySim = displaySimulationRef.current;
      if (displaySim) {
        displaySim.alphaTarget(0).alpha(0.12).restart();
      }
      if (nodeDraggedRef.current) {
        onActiveNodeChange?.(null);
      }
      setDraggingTarget(null);
      dragNodeOffsetRef.current = null;
      dragStartPointerRef.current = null;
    }
    setIsPanning(false);
    panStartRef.current = null;
  };

  const handleNodeMouseDown = (
    event: React.MouseEvent<SVGGElement>,
    node: RenderNode,
  ) => {
    event.stopPropagation();
    onActiveNodeChange?.(node.id);

    const world = screenToWorld(event.clientX, event.clientY);
    dragNodeOffsetRef.current = {
      dx: node.x - world.x,
      dy: node.y - world.y,
    };
    dragStartPointerRef.current = { x: event.clientX, y: event.clientY };
    nodeDraggedRef.current = false;
    panStartRef.current = null;
    setIsPanning(false);
    setDraggingTarget({
      id: node.id,
      isGroup: node.isGroupNode,
      subclusterId: node.subclusterId,
    });

    if (!node.isGroupNode && typeof node.id === "number") {
      const simNode = simNodeMapRef.current.get(node.id);
      if (simNode) {
        simNode.fx = node.x;
        simNode.fy = node.y;
      }
      simulationRef.current?.alphaTarget(0.26).restart();
    } else {
      const displayNode = displaySimNodeMapRef.current.get(node.id);
      if (displayNode) {
        displayNode.fx = node.x;
        displayNode.fy = node.y;
      }
      displaySimNodeMapRef.current.forEach((simNode) => {
        if (simNode.kind === "node") {
          simNode.anchored = false;
          simNode.fx = null;
          simNode.fy = null;
        }
      });
      displaySimulationRef.current?.alphaTarget(0.22).restart();
    }
    clearDragSettleTimer();
  };

  const handleSubclusterToggle = useCallback((subclusterId: string) => {
    setCollapsedSubclusters((prev) => {
      const next = new Set(prev);
      if (next.has(subclusterId)) next.delete(subclusterId);
      else next.add(subclusterId);
      return next;
    });
  }, []);

  const handleNodeClick = (node: RenderNode) => {
    if (node.isGroupNode && node.subclusterId) {
      handleSubclusterToggle(node.subclusterId);
      return;
    }
    if (!node.origNode) return;
    setSelectedNode({
      origId: node.origNode.origId,
      sourceType: node.origNode.sourceType,
    });
  };

  const handleBackgroundClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.target !== event.currentTarget) return;
    if (draggingTarget !== null || isPanning) return;
    onActiveNodeChange?.(null);
    if (!focusedClusterId) return;
    setFocusedClusterId(null);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {hoveredNodeId !== null &&
        (() => {
          const node = renderedNodeMap.get(hoveredNodeId);
          if (!node) return null;
          const left = node.x * scale + offset.x;
          const top = node.y * scale + offset.y - 24;
          const hoveredSubcluster =
            node.isGroupNode && node.subclusterId
              ? subclusterMap.get(node.subclusterId)
              : null;
          const label = node.isGroupNode
            ? (node.label ?? "Group")
            : (node.origNode?.nodeTitle ??
              node.origNode?.origId ??
              String(node.id));

          return (
            <div
              className="absolute -translate-x-1/2 -translate-y-full py-0.5 px-1.5 text-[10px] bg-sidebar-button-hover text-primary rounded pointer-events-none whitespace-nowrap z-10"
              style={{ left, top }}
            >
              <div className="font-semibold">{label}</div>
              {hoveredSubcluster && (
                <div className="text-[9px] opacity-80">
                  Size: {hoveredSubcluster.size} | Density:{" "}
                  {hoveredSubcluster.density.toFixed(2)}
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
          cursor: draggingTarget !== null || isPanning ? "grabbing" : "grab",
          touchAction: "none",
          backgroundColor: "var(--color-cluster-default)",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBackgroundClick}
      >
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          {scopedCircles.map((circle) => (
            <g key={`circle-${circle.clusterId}`}>
              <text
                x={circle.centerX}
                y={circle.centerY - circle.radius - 12}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill="var(--color-text-secondary)"
                style={{
                  pointerEvents: "all",
                  userSelect: "none",
                  cursor: "pointer",
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  setFocusedClusterId(circle.clusterId);
                  animateZoomToCluster(circle.clusterId);
                }}
              >
                {circle.clusterName}
              </text>
            </g>
          ))}

          {renderEdges.map((edge, index) => {
            const source = renderedNodeMap.get(edge.source);
            const target = renderedNodeMap.get(edge.target);
            if (!source || !target) return null;

            const isActive = activeEdgeIds?.has(edge.id) ?? false;
            const isDimmed = activeEdgeIds !== null && !isActive;

            return (
              <line
                key={edge.id ?? `edge-${edge.source}-${edge.target}-${index}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={
                  isActive
                    ? "var(--color-edge-active)"
                    : "var(--color-edge-default)"
                }
                strokeWidth={isActive ? 1.4 : edge.isIntraCluster ? 0.9 : 0.7}
                strokeOpacity={
                  isDimmed
                    ? 0.18
                    : isActive
                      ? 0.9
                      : edge.isIntraCluster
                        ? 0.65
                        : 0.32
                }
              />
            );
          })}

          {renderedNodes.map((node) => {
            const degree = edgeCounts.get(node.id) ?? 0;
            const isHovered = hoveredNodeId === node.id;
            const isActive = node.id === activeNodeId;
            const isDimmed =
              activeConnectedNodeIds !== null &&
              !activeConnectedNodeIds.has(node.id);
            const groupBaseRadius = Math.max(
              BASE_NODE_RADIUS * 1.2,
              Math.min(BASE_NODE_RADIUS * 2.2, 6 + Math.sqrt(node.size ?? 1)),
            );
            const radius = node.isGroupNode
              ? isHovered || isActive
                ? groupBaseRadius + 1.5
                : groupBaseRadius
              : isHovered || isActive
                ? BASE_NODE_RADIUS + 1.5
                : BASE_NODE_RADIUS;
            const highlightThreshold = Math.max(
              MIN_HIGHLIGHT_EDGE_COUNT,
              Math.ceil(maxEdgeCount * HIGH_EDGE_RATIO),
            );
            const isHighlyConnected = degree >= highlightThreshold;
            const fill = isActive
              ? "var(--color-node-active)"
              : node.isGroupNode
                ? "var(--color-node-focus)"
                : isHighlyConnected
                  ? "var(--color-node-focus)"
                  : "var(--color-node-default)";

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                className="cursor-pointer"
                style={{
                  opacity: isDimmed ? 0.35 : 1,
                  transition: "opacity 0.15s",
                }}
                onMouseDown={(event) => handleNodeMouseDown(event, node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (nodeDraggedRef.current) {
                    nodeDraggedRef.current = false;
                    return;
                  }
                  handleNodeClick(node);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (node.isGroupNode || !node.origNode) return;
                  setRightClickedNode({
                    id: node.id as number,
                    origid: node.origNode.origId,
                    position: { x: event.clientX, y: event.clientY },
                  });
                }}
              >
                <circle
                  r={radius}
                  fill={fill}
                  stroke={
                    isActive
                      ? "var(--color-node-active)"
                      : "var(--color-cluster-default)"
                  }
                  strokeWidth={isActive ? 2 : 0.8}
                  strokeOpacity={isActive ? 0.5 : 1}
                />
                {node.isGroupNode && (
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fontSize={9}
                    fontWeight={700}
                    fill="white"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {node.size ?? 0}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {pendingMutation && (
        <div className="fixed bottom-20 left-1/2 z-50 flex min-w-56 -translate-x-1/2 items-center justify-between gap-4 rounded-lg border border-sidebar-button-border bg-sidebar-expanded-background px-4 py-1.5 text-sm shadow-lg">
          <span className="text-text-secondary">{pendingMutation.label}</span>
          <button
            className="shrink-0 font-semibold text-primary hover:underline"
            onClick={handleUndo}
          >
            {t("visualize.undoToast.undo")}
          </button>
        </div>
      )}

      {rightClickedNode && nodeEditActions && (
        <NodeEditMenu
          nodeId={rightClickedNode.id}
          origId={rightClickedNode.origid}
          position={rightClickedNode.position}
          onClose={() => {
            setRightClickedNode(null);
            onActiveNodeChange?.(null);
          }}
          allNodes={nodes}
          allEdges={edges}
          clusters={circles}
          actions={nodeEditActions}
        />
      )}

      {selectedNode && (
        <NodePreview
          nodeId={selectedNode.origId}
          sourceType={selectedNode.sourceType}
          onClose={() => {
            setSelectedNode(null);
            onActiveNodeChange?.(null);
          }}
          onExpand={() => {
            setSelectedNode(null);
            onActiveNodeChange?.(null);
          }}
        />
      )}
    </div>
  );
}
