import * as d3 from "d3-force";
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

type SimNode = d3.SimulationNodeDatum &
  Node & {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
  };

type PositionedNode = Node & {
  x: number;
  y: number;
};

type PositionedEdge = Edge & {
  isIntraCluster: boolean;
};

type ClusterLayout = {
  clusterId: string;
  centerX: number;
  centerY: number;
  radius: number;
};

function preprocess(
  nodes: Node[],
  edges: Edge[]
): { clusters: Map<string, Node[]>; edges: PositionedEdge[] } {
  const clusters = new Map<string, Node[]>();

  nodes.forEach((n) => {
    const list = clusters.get(n.cluster_id) ?? [];
    list.push(n);
    clusters.set(n.cluster_id, list);
  });

  const positionedEdges = edges.map((e) => {
    const s = nodes[e.source];
    const t = nodes[e.target];
    const isIntra = s.cluster_id === t.cluster_id;
    return { ...e, isIntraCluster: isIntra };
  });

  return { clusters, edges: positionedEdges };
}

function layoutClustersWithForce(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number
): {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  clusters: ClusterLayout[];
} {
  const { clusters, edges: classifiedEdges } = preprocess(nodes, edges);

  const clusterIds = Array.from(clusters.keys());
  const K = clusterIds.length;

  const centerX = width / 2;
  const centerY = height / 2;
  const bigRadius = Math.min(width, height) * 0.35;

  const positionedNodes: PositionedNode[] = [];
  const clusterLayouts: ClusterLayout[] = [];

  clusterIds.forEach((clusterId, idx) => {
    const clusterNodes = clusters.get(clusterId)!;

    const theta = (2 * Math.PI * idx) / K;
    const cx = centerX + bigRadius * Math.cos(theta);
    const cy = centerY + bigRadius * Math.sin(theta);

    const n = clusterNodes.length;
    const base = 80;
    const scale = 8;
    const clusterRadius = base + scale * Math.sqrt(n);

    const simNodes: SimNode[] = clusterNodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / n;
      const r = clusterRadius * 0.3;
      const jitter = 5;
      return {
        ...node,
        x: cx + r * Math.cos(angle) + (Math.random() - 0.5) * jitter,
        y: cy + r * Math.sin(angle) + (Math.random() - 0.5) * jitter,
      };
    });

    const clusterEdges = classifiedEdges
      .filter((e) => e.isIntraCluster)
      .filter((e) => {
        const s = nodes[e.source];
        const t = nodes[e.target];
        return s.cluster_id === clusterId && t.cluster_id === clusterId;
      })
      .map((e) => ({
        source: simNodes.find((n) => n.id === e.source)!,
        target: simNodes.find((n) => n.id === e.target)!,
      }));

    const edgeCount = clusterEdges.length;
    const density = edgeCount / Math.max(n, 1);

    const chargeStrength = -15 - Math.sqrt(n) * 3 - density * 2;

    const collideRadius = 10 + Math.min(10, density * 1.5);

    const radialRadius = clusterRadius * 0.55;

    const boundaryRadius = clusterRadius * 0.9;

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force("center", d3.forceCenter(cx, cy))
      .force("radial", d3.forceRadial(radialRadius, cx, cy).strength(0.03))
      .force("charge", d3.forceManyBody().strength(chargeStrength))
      .force(
        "link",
        d3
          .forceLink<SimNode, any>(clusterEdges)
          .id((d: any) => d.id)
          .distance(25 + Math.min(15, density * 1.2))
          .strength(0.5)
      )
      .force("collision", d3.forceCollide(collideRadius).iterations(3))
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
      });
    });

    clusterLayouts.push({
      clusterId,
      centerX: cx,
      centerY: cy,
      radius: boundaryRadius,
    });
  });

  const positionedEdges: PositionedEdge[] = classifiedEdges.map((e) => ({
    ...e,
    isIntraCluster: e.isIntraCluster,
  }));

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    clusters: clusterLayouts,
  };
}

const NODE_RADIUS = 3;
const DRAG_MIN_DIST = 10;

type GraphProps = {
  rawNodes: Node[];
  rawEdges: Edge[];
  width: number;
  height: number;
};

export default function ClusterCircleGraph({
  rawNodes,
  rawEdges,
  width,
  height,
}: GraphProps) {
  const [nodes, setNodes] = useState<PositionedNode[]>([]);
  const [edges, setEdges] = useState<PositionedEdge[]>([]);
  const [clusters, setClusters] = useState<ClusterLayout[]>([]);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<number | null>(null);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);

  const [draggingNodeId, setDraggingNodeId] = useState<number | null>(null);
  const dragNodeOffset = useRef<{ dx: number; dy: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

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

  useEffect(() => {
    const { nodes, edges, clusters } = layoutClustersWithForce(
      rawNodes,
      rawEdges,
      width,
      height
    );
    setNodes(nodes);
    setEdges(edges);
    setClusters(clusters);
  }, [rawNodes, rawEdges, width, height]);

  const nodeById = (id: number) => nodes.find((n) => n.id === id)!;
  const clusterById = (clusterId: string) =>
    clusters.find((c) => c.clusterId === clusterId)!;

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
      const node = nodeById(draggingNodeId);
      const cluster = clusterById(node.cluster_id);

      let newX = worldX + dragNodeOffset.current.dx;
      let newY = worldY + dragNodeOffset.current.dy;

      const dxCenter = newX - cluster.centerX;
      const dyCenter = newY - cluster.centerY;
      const distCenter = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);
      if (distCenter > cluster.radius) {
        const k = cluster.radius / distCenter;
        newX = cluster.centerX + dxCenter * k;
        newY = cluster.centerY + dyCenter * k;
      }

      const sameClusterNodes = nodes.filter(
        (n) => n.cluster_id === node.cluster_id && n.id !== node.id
      );
      sameClusterNodes.forEach((other) => {
        const dx = newX - other.x;
        const dy = newY - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < DRAG_MIN_DIST) {
          const k = DRAG_MIN_DIST / dist;
          newX = other.x + dx * k;
          newY = other.y + dy * k;
        }
      });

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

    dragNodeOffset.current = {
      dx: node.x - worldX,
      dy: node.y - worldY,
    };
    setDraggingNodeId(nodeId);
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {hoveredId != null &&
        (() => {
          const n = nodeById(hoveredId);
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
          {clusters.map((c) => (
            <text
              key={c.clusterId}
              x={c.centerX}
              y={c.centerY - c.radius - 10}
              textAnchor="middle"
              fontSize={16}
              fontWeight={600}
              fill="#ccc"
              style={{ pointerEvents: "none" }}
            >
              {c.clusterId}
            </text>
          ))}

          {normalIntraEdges.map((e, idx) => {
            const s = nodeById(e.source);
            const t = nodeById(e.target);
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

          {[...focusedIntraEdges, ...focusedInterEdges].map((e, idx) => {
            const s = nodeById(e.source);
            const t = nodeById(e.target);
            return (
              <line
                key={`focus-${idx}`}
                x1={s.x}
                y1={s.y}
                x2={t.x}
                y2={t.y}
                stroke="#ff4d4f"
                strokeWidth={0.5}
              />
            );
          })}

          {nodes.map((n) => {
            const isHovered = hoveredId === n.id;
            const isFocused = focusNodeId === n.id;
            const radius = isHovered ? 6 : NODE_RADIUS;
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
