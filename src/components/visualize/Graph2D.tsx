import threadRepo from "@/managers/threadRepo";
import * as d3Force from "d3-force";
import {
  GraphEdgeDto,
  GraphNodeDto,
} from "node_modules/@taco_tsinghua/graphnode-sdk/dist/types/graph";
import React, { useEffect, useRef, useState, useCallback } from "react";
import NodeChatPreview from "./NodeChatPreview";
import {
  PositionedEdge,
  ClusterCircle,
  Subcluster,
  DisplayNode,
} from "@/types/GraphData";

// ===== 노드 크기 설정 =====
// 중분류 노드 반지름
// - 값 증가: 중분류 노드가 커짐 (더 눈에 띔)
// - 값 감소: 중분류 노드가 작아짐
const SUBCLUSTER_NODE_RADIUS = 7;

// 일반 노드 기본/최대 반지름
// - BASE_NODE_RADIUS: 엣지가 0개인 노드의 크기
// - MAX_NODE_RADIUS: 엣지가 가장 많은 노드의 크기
// - 두 값의 차이가 크면 노드 크기 변화가 극적임
const BASE_NODE_RADIUS = 3;
const MAX_NODE_RADIUS = 5;

type SimNode = d3Force.SimulationNodeDatum & {
  id: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  edgeCount: number;
  isSubcluster: boolean;
  subclusterId?: string;
  subclusterSize?: number;
  containedNodeIds?: number[];
  clusterName: string;
  clusterId: string;
  origId: string;
  userId: string;
  timestamp: string | null;
  numMessages: number;
};

// ===== 일반 노드 크기 계산 함수 =====
// 노드의 엣지 수에 따라 크기가 결정됨
// - 엣지가 많은 노드: MAX_NODE_RADIUS에 가까워짐
// - 엣지가 적은 노드: BASE_NODE_RADIUS에 가까워짐
// - Math.sqrt 사용: 크기 변화가 완만하게 적용됨
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
  subclusters: Subcluster[];
  width: number;
  height: number;
  avatarUrl: string | null;
  onClustersReady?: (
    clusters: ClusterCircle[],
    nodes: DisplayNode[],
    edges: PositionedEdge[],
  ) => void;
  zoomToClusterId?: string | null;
  onNodeClick?: (nodeId: number) => void;
  onSubclusterClick?: (subclusterId: string) => void;
  externalFocusNodeId?: number | null;
  expandedSubclusters: Set<string>;
  onToggleSubcluster: (subclusterId: string) => void;
  onClusterClick?: (clusterName: string) => void;
};

export default function Graph2D({
  rawNodes,
  rawEdges,
  subclusters,
  width,
  height,
  avatarUrl,
  onClustersReady,
  zoomToClusterId,
  onNodeClick,
  externalFocusNodeId,
  expandedSubclusters,
  onToggleSubcluster,
  onClusterClick,
}: GraphProps) {
  const [displayNodes, setDisplayNodes] = useState<DisplayNode[]>([]);
  const [edges, setEdges] = useState<PositionedEdge[]>([]);
  const [circles, setCircles] = useState<ClusterCircle[]>([]);
  const [maxEdgeCount, setMaxEdgeCount] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [hoveredSubclusterId, setHoveredSubclusterId] = useState<string | null>(
    null,
  );
  const [hoveredThreadTitle, setHoveredThreadTitle] = useState<string | null>(
    null,
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
    null,
  );
  const dragClusterOffset = useRef<{ dx: number; dy: number } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const isAnimatingRef = useRef(false);
  const simulationRef = useRef<d3Force.Simulation<SimNode, undefined> | null>(
    null,
  );
  const animationFrameRef = useRef<number | null>(null);
  const previousPositionsRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const previousExpandedSubclustersRef = useRef<Set<string>>(new Set());
  const isInitialLayoutRef = useRef(true);

  const onClustersReadyRef = useRef(onClustersReady);
  useEffect(() => {
    onClustersReadyRef.current = onClustersReady;
  }, [onClustersReady]);

  // 노드를 subcluster별로 그룹화하는 맵 생성
  const nodeToSubclusterMap = useCallback(() => {
    const map = new Map<number, Subcluster>();
    subclusters.forEach((sc) => {
      sc.node_ids.forEach((nodeId) => {
        map.set(nodeId, sc);
      });
    });
    return map;
  }, [subclusters]);

  // 레이아웃 계산 및 시뮬레이션
  const runLayout = useCallback(() => {
    if (rawNodes.length === 0 || width === 0 || height === 0) return;

    const nodeSubclusterMap = nodeToSubclusterMap();

    // 변경된 subcluster 찾기
    const prevExpanded = previousExpandedSubclustersRef.current;
    const changedSubclusterIds = new Set<string>();
    expandedSubclusters.forEach((id) => {
      if (!prevExpanded.has(id)) changedSubclusterIds.add(id);
    });
    prevExpanded.forEach((id) => {
      if (!expandedSubclusters.has(id)) changedSubclusterIds.add(id);
    });

    // 영향받는 클러스터 찾기
    const affectedClusterIds = new Set<string>();
    changedSubclusterIds.forEach((scId) => {
      const sc = subclusters.find((s) => s.id === scId);
      if (sc) affectedClusterIds.add(sc.cluster_id);
    });

    // 이전 상태 업데이트
    previousExpandedSubclustersRef.current = new Set(expandedSubclusters);

    // 노드 분류: 어떤 노드가 표시되고 어떤 노드가 숨겨지는지
    const visibleNodes: SimNode[] = [];
    const nodeMap = new Map<number, GraphNodeDto>();
    rawNodes.forEach((n) => nodeMap.set(n.id, n));

    // 엣지 카운트 계산
    const edgeCounts = new Map<number, number>();
    rawNodes.forEach((n) => edgeCounts.set(n.id, 0));
    rawEdges.forEach((e) => {
      edgeCounts.set(e.source, (edgeCounts.get(e.source) ?? 0) + 1);
      edgeCounts.set(e.target, (edgeCounts.get(e.target) ?? 0) + 1);
    });

    // 처리된 subcluster 추적
    const processedSubclusters = new Set<string>();

    // 이전 위치 맵
    const prevPositions = previousPositionsRef.current;

    rawNodes.forEach((node) => {
      const subcluster = nodeSubclusterMap.get(node.id);

      if (subcluster) {
        if (expandedSubclusters.has(subcluster.id)) {
          // 펼쳐진 subcluster: 개별 노드로 표시
          const prevPos = prevPositions.get(node.id);
          // ===== 펼쳐진 중분류 노드들의 초기 배치 반경 (spreadRadius) =====
          // 중분류를 클릭해서 펼칠 때 하위 노드들이 원형으로 배치되는 반경
          // - 기본값(25) 증가: 펼쳐진 노드들의 초기 원 크기 증가
          // - 계수(3) 증가: 노드 수가 많을수록 더 넓게 펼쳐짐
          const scRepId = -subcluster.representative_node_id;
          const scPrevPos = prevPositions.get(scRepId);
          const nodeIndex = subcluster.node_ids.indexOf(node.id);
          const totalNodes = subcluster.node_ids.length;
          const spreadRadius = 25 + totalNodes * 7;
          const angle = (5 * Math.PI * nodeIndex) / totalNodes;

          visibleNodes.push({
            ...node,
            x:
              prevPos?.x ??
              (scPrevPos?.x ?? 0) +
                spreadRadius * Math.cos(angle) +
                (Math.random() - 0.5) * 8,
            y:
              prevPos?.y ??
              (scPrevPos?.y ?? 0) +
                spreadRadius * Math.sin(angle) +
                (Math.random() - 0.5) * 8,
            edgeCount: edgeCounts.get(node.id) ?? 0,
            isSubcluster: false,
            timestamp: node.timestamp ?? null,
          });
        } else {
          // 접힌 subcluster: 대표 노드 하나만 표시
          if (!processedSubclusters.has(subcluster.id)) {
            processedSubclusters.add(subcluster.id);
            const repNode =
              nodeMap.get(subcluster.representative_node_id) || node;
            const scId = -subcluster.representative_node_id;

            // 접힌 subcluster의 총 엣지 수 계산
            let totalEdgeCount = 0;
            subcluster.node_ids.forEach((nid) => {
              totalEdgeCount += edgeCounts.get(nid) ?? 0;
            });

            // 이전 위치 찾기 (subcluster 자체 또는 포함된 노드들의 중심)
            let initX = 0,
              initY = 0;
            const scPrevPos = prevPositions.get(scId);
            if (scPrevPos) {
              initX = scPrevPos.x;
              initY = scPrevPos.y;
            } else {
              // 포함된 노드들의 평균 위치
              let count = 0;
              subcluster.node_ids.forEach((nid) => {
                const pos = prevPositions.get(nid);
                if (pos) {
                  initX += pos.x;
                  initY += pos.y;
                  count++;
                }
              });
              if (count > 0) {
                initX /= count;
                initY /= count;
              }
            }

            visibleNodes.push({
              id: scId,
              userId: repNode.userId,
              origId: repNode.origId,
              clusterId: subcluster.cluster_id,
              clusterName: repNode.clusterName,
              timestamp: repNode.timestamp ?? null,
              numMessages: 0,
              x: initX,
              y: initY,
              edgeCount: totalEdgeCount,
              isSubcluster: true,
              subclusterId: subcluster.id,
              subclusterSize: subcluster.size,
              containedNodeIds: subcluster.node_ids,
            });
          }
        }
      } else {
        // subcluster에 속하지 않는 일반 노드
        const prevPos = prevPositions.get(node.id);
        visibleNodes.push({
          ...node,
          x: prevPos?.x ?? 0,
          y: prevPos?.y ?? 0,
          edgeCount: edgeCounts.get(node.id) ?? 0,
          isSubcluster: false,
          timestamp: node.timestamp ?? null,
        });
      }
    });

    // 클러스터별 그룹화
    const clusterGroups = new Map<string, SimNode[]>();
    visibleNodes.forEach((n) => {
      const list = clusterGroups.get(n.clusterName) ?? [];
      list.push(n);
      clusterGroups.set(n.clusterName, list);
    });

    const clusterNames = Array.from(clusterGroups.keys());
    const K = clusterNames.length;
    const centerX = width / 2;
    const centerY = height / 2;

    // ===== 클러스터 간 거리 (bigRadius) =====
    // 클러스터들이 화면 중앙에서 얼마나 떨어져 배치되는지 결정
    // - 계수(0.15) 증가: 클러스터들이 더 멀리 퍼짐 (클러스터 간 거리 증가)
    // - 계수(0.15) 감소: 클러스터들이 중앙에 더 모임 (클러스터 간 거리 감소)
    // - K(클러스터 개수) 추가: 클러스터가 많을수록 자동으로 더 퍼짐
    // - 최소값 100 보장: 작은 화면에서도 충분한 간격 확보
    const bigRadius = Math.max(100, Math.min(width, height) * 0.15 + K * 20);

    const newCircles: ClusterCircle[] = [];

    // 클러스터별 초기 위치 설정
    clusterNames.forEach((clusterName, idx) => {
      const clusterNodes = clusterGroups.get(clusterName)!;
      const theta = (2 * Math.PI * idx) / K;
      const n = clusterNodes.length;

      // ===== 클러스터 원 크기 (clusterRadius) =====
      // 각 클러스터의 배경 원 크기 결정
      // - 기본값(35) 증가: 모든 클러스터의 최소 크기 증가
      // - 계수(10) 증가: 노드 수에 따른 크기 증가 폭이 커짐 (큰 클러스터가 더 커짐)
      // - Math.sqrt 사용: 노드 수가 많아도 크기가 급격히 커지지 않도록 완화
      // - 최대값 제한: 클러스터가 너무 커지는 것을 방지
      const clusterRadius = Math.min(120, 35 + Math.sqrt(n) * 10);

      const cx = centerX + bigRadius * Math.cos(theta);
      const cy = centerY + bigRadius * Math.sin(theta);

      // ===== 초기 노드 배치 =====
      // 클러스터 내 노드들의 초기 위치 설정
      // - 계수(0.4): 클러스터 반경의 몇 %에 노드 배치 (값 증가 → 더 바깥에 배치)
      // - 랜덤값(8): 노드 위치에 약간의 랜덤성 추가 (자연스러운 배치)
      if (isInitialLayoutRef.current) {
        clusterNodes.forEach((node, i) => {
          if (node.x === 0 && node.y === 0) {
            const angle = (2 * Math.PI * i) / n;
            const r = clusterRadius * 0.7;
            node.x = cx + r * Math.cos(angle) + (Math.random() - 0.5) * 8;
            node.y = cy + r * Math.sin(angle) + (Math.random() - 0.5) * 8;
          }
        });
      }

      newCircles.push({
        clusterId: clusterName,
        clusterName: clusterName,
        centerX: cx,
        centerY: cy,
        radius: clusterRadius,
      });
    });

    // 엣지 처리: 접힌 subcluster는 대표 노드로 연결
    const nodeIdToVisibleId = new Map<number, number>();

    visibleNodes.forEach((vn) => {
      if (vn.isSubcluster && vn.containedNodeIds) {
        vn.containedNodeIds.forEach((nid) => {
          nodeIdToVisibleId.set(nid, vn.id);
        });
      } else {
        nodeIdToVisibleId.set(vn.id, vn.id);
      }
    });

    const processedEdges: PositionedEdge[] = [];
    const edgeSet = new Set<string>();

    rawEdges.forEach((e) => {
      const sourceId = nodeIdToVisibleId.get(e.source);
      const targetId = nodeIdToVisibleId.get(e.target);

      if (
        sourceId !== undefined &&
        targetId !== undefined &&
        sourceId !== targetId
      ) {
        const edgeKey = `${Math.min(sourceId, targetId)}-${Math.max(sourceId, targetId)}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          const sourceNode = visibleNodes.find((n) => n.id === sourceId);
          const targetNode = visibleNodes.find((n) => n.id === targetId);
          const isIntra =
            sourceNode &&
            targetNode &&
            sourceNode.clusterName === targetNode.clusterName;

          processedEdges.push({
            ...e,
            source: sourceId,
            target: targetId,
            isIntraCluster: !!isIntra,
          });
        }
      }
    });

    // Force simulation
    const simEdges = processedEdges
      .map((e) => ({
        source: visibleNodes.find((n) => n.id === e.source)!,
        target: visibleNodes.find((n) => n.id === e.target)!,
      }))
      .filter((e) => e.source && e.target);

    // 기존 시뮬레이션 중지
    if (simulationRef.current) {
      simulationRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // 영향받지 않는 클러스터의 노드 위치 고정 (첫 레이아웃 제외)
    const isSubclusterToggle =
      !isInitialLayoutRef.current && affectedClusterIds.size > 0;

    if (isSubclusterToggle) {
      visibleNodes.forEach((node) => {
        if (!affectedClusterIds.has(node.clusterId)) {
          // 이 노드는 영향받지 않음 - 위치 고정
          (node as any).fx = node.x;
          (node as any).fy = node.y;
        }
      });
    }

    // ===== Force Simulation 설정 =====
    const simulation = d3Force
      .forceSimulation<SimNode>(visibleNodes)

      // ----- 중앙으로 당기는 힘 (초기 레이아웃에만 적용) -----
      // strength(0.02): 값 증가 → 노드들이 중앙에 더 강하게 모임
      .force(
        "center",
        isInitialLayoutRef.current
          ? d3Force.forceCenter(centerX, centerY).strength(0.02)
          : null,
      )

      // ----- 노드 간 척력 (charge) -----
      // 음수 값: 노드끼리 서로 밀어냄
      // - 절대값 증가 (예: -10 → -30): 노드들이 더 멀리 퍼짐 (척력 증가)
      // - 절대값 감소 (예: -30 → -10): 노드들이 더 가까이 모임 (척력 감소)
      // - 중분류 노드(-15/-30)가 일반 노드(-10)보다 더 큰 척력을 가짐
      .force(
        "charge",
        d3Force.forceManyBody<SimNode>().strength((d) => {
          if (isSubclusterToggle) return d.isSubcluster ? -15 : -10;
          return d.isSubcluster ? -30 : -10;
        }),
      )

      // ----- 연결된 노드 간 인력 (link) -----
      // distance: 연결된 노드 사이의 목표 거리
      //   - 값 증가 (30): 연결된 노드들 사이 거리 증가
      //   - 값 감소 (25): 연결된 노드들 사이 거리 감소
      // strength: 목표 거리를 유지하려는 힘의 세기
      //   - 값 증가 (0.2): 연결된 노드들이 더 강하게 서로 끌림 (인력 증가)
      //   - 값 감소 (0.15): 연결된 노드들이 약하게 끌림 (인력 감소)
      .force(
        "link",
        d3Force
          .forceLink(simEdges)
          .id((d: any) => d.id)
          .distance(isSubclusterToggle ? 30 : 25)
          .strength(isSubclusterToggle ? 0.15 : 0.2),
      )

      // ----- 노드 충돌 방지 (collision) -----
      // radius: 각 노드 주변의 충돌 방지 영역 크기
      // - 값 증가: 노드들이 서로 더 멀리 떨어짐 (최소 거리 증가)
      // - 값 감소: 노드들이 더 가깝게 붙을 수 있음
      .force(
        "collision",
        d3Force
          .forceCollide<SimNode>()
          .radius((d) => (d.isSubcluster ? SUBCLUSTER_NODE_RADIUS + 3 : 5)),
      )

      // ----- 클러스터 중심으로 당기는 힘 (cluster force) -----
      // 노드들을 각자 속한 클러스터 중심으로 끌어당김
      // strength: 클러스터 중심으로 당기는 힘의 세기
      //   - 값 증가 (0.15): 노드들이 클러스터 중심에 더 밀집 (응집력 증가)
      //   - 값 감소 (0.08): 노드들이 클러스터 내에서 더 퍼짐 (응집력 감소)
      .force("cluster", (alpha) => {
        visibleNodes.forEach((node) => {
          if ((node as any).fx !== undefined) return;
          const circle = newCircles.find(
            (c) => c.clusterName === node.clusterName,
          );
          if (circle) {
            const dx = circle.centerX - node.x;
            const dy = circle.centerY - node.y;
            const strength = isSubclusterToggle ? 0.15 : 0.08;
            node.vx = (node.vx ?? 0) + dx * alpha * strength;
            node.vy = (node.vy ?? 0) + dy * alpha * strength;
          }
        });
      })

      // ----- 시뮬레이션 감쇠 설정 -----
      // alphaDecay: 시뮬레이션이 멈추는 속도
      //   - 값 증가 (0.04): 시뮬레이션이 빨리 멈춤 (빠른 안정화)
      //   - 값 감소 (0.02): 시뮬레이션이 오래 지속 (더 정교한 배치)
      // velocityDecay: 노드 이동 속도 감쇠
      //   - 값 증가 (0.4): 노드가 빨리 멈춤 (덜 튀어다님)
      //   - 값 감소 (0.3): 노드가 더 오래 움직임
      .alphaDecay(isSubclusterToggle ? 0.08 : 0.02)
      .velocityDecay(isSubclusterToggle ? 0.3 : 0.3);

    simulationRef.current = simulation;

    // 애니메이션 루프
    setIsSimulating(true);

    const updateState = () => {
      // 클러스터 중심만 업데이트, 반경은 고정 (초기값 유지)
      clusterNames.forEach((clusterName) => {
        const clusterNodes = visibleNodes.filter(
          (n) => n.clusterName === clusterName,
        );
        if (clusterNodes.length > 0) {
          const circle = newCircles.find((c) => c.clusterName === clusterName);
          if (circle) {
            // 중심 계산
            const sumX = clusterNodes.reduce((s, n) => s + n.x, 0);
            const sumY = clusterNodes.reduce((s, n) => s + n.y, 0);
            circle.centerX = sumX / clusterNodes.length;
            circle.centerY = sumY / clusterNodes.length;
            // 반경은 초기값 유지 (동적으로 커지지 않음)
          }
        }
      });

      // 상태 업데이트
      const finalNodes: DisplayNode[] = visibleNodes.map((sn) => ({
        id: sn.id,
        userId: sn.userId,
        origId: sn.origId,
        clusterId: sn.clusterId,
        clusterName: sn.clusterName,
        timestamp: sn.timestamp,
        numMessages: sn.numMessages,
        x: sn.x,
        y: sn.y,
        edgeCount: sn.edgeCount,
        isSubcluster: sn.isSubcluster,
        subclusterId: sn.subclusterId,
        subclusterSize: sn.subclusterSize,
        containedNodeIds: sn.containedNodeIds,
      }));

      // 위치 저장 (다음 레이아웃용)
      finalNodes.forEach((n) => {
        previousPositionsRef.current.set(n.id, { x: n.x, y: n.y });
      });

      setDisplayNodes(finalNodes);
      setEdges(processedEdges);
      setCircles([...newCircles]);

      const max = Math.max(...finalNodes.map((n) => n.edgeCount), 1);
      setMaxEdgeCount(max);
    };

    // 첫 레이아웃: 빠르게 계산
    if (isInitialLayoutRef.current) {
      for (let i = 0; i < 150; i++) {
        simulation.tick();
      }
      updateState();
      isInitialLayoutRef.current = false;
      setIsSimulating(false);

      if (onClustersReadyRef.current) {
        const finalNodes: DisplayNode[] = visibleNodes.map((sn) => ({
          id: sn.id,
          userId: sn.userId,
          origId: sn.origId,
          clusterId: sn.clusterId,
          clusterName: sn.clusterName,
          timestamp: sn.timestamp,
          numMessages: sn.numMessages,
          x: sn.x,
          y: sn.y,
          edgeCount: sn.edgeCount,
          isSubcluster: sn.isSubcluster,
          subclusterId: sn.subclusterId,
          subclusterSize: sn.subclusterSize,
          containedNodeIds: sn.containedNodeIds,
        }));
        onClustersReadyRef.current(newCircles, finalNodes, processedEdges);
      }
    } else {
      // 후속 레이아웃: 애니메이션으로 실행
      simulation.alpha(0.8).restart();

      const animate = () => {
        if (simulation.alpha() > 0.01) {
          updateState();
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          simulation.stop();
          setIsSimulating(false);
          updateState();

          if (onClustersReadyRef.current) {
            const finalNodes: DisplayNode[] = visibleNodes.map((sn) => ({
              id: sn.id,
              userId: sn.userId,
              origId: sn.origId,
              clusterId: sn.clusterId,
              clusterName: sn.clusterName,
              timestamp: sn.timestamp,
              numMessages: sn.numMessages,
              x: sn.x,
              y: sn.y,
              edgeCount: sn.edgeCount,
              isSubcluster: sn.isSubcluster,
              subclusterId: sn.subclusterId,
              subclusterSize: sn.subclusterSize,
              containedNodeIds: sn.containedNodeIds,
            }));
            onClustersReadyRef.current(newCircles, finalNodes, processedEdges);
          }
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    // 정리
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    rawNodes,
    rawEdges,
    subclusters,
    width,
    height,
    expandedSubclusters,
    nodeToSubclusterMap,
  ]);

  // 레이아웃 실행
  useEffect(() => {
    runLayout();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [runLayout]);

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
    if (hoveredId == null || hoveredSubclusterId != null) {
      setHoveredThreadTitle(null);
      return;
    }

    const n = displayNodes.find((node) => node.id === hoveredId);
    if (!n || n.isSubcluster) {
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
  }, [hoveredId, hoveredSubclusterId, displayNodes]);

  // 외부에서 전달받은 focusNodeId 동기화 및 줌인
  useEffect(() => {
    if (
      externalFocusNodeId == null ||
      displayNodes.length === 0 ||
      isAnimatingRef.current
    )
      return;

    const targetNode = displayNodes.find((n) => n.id === externalFocusNodeId);
    if (!targetNode || !svgRef.current) return;

    setFocusNodeId(externalFocusNodeId);
    isAnimatingRef.current = true;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const svgCenterX = rect.width / 2;
    const svgCenterY = rect.height / 2;

    const targetScale = 2.5;
    const targetOffsetX = svgCenterX - targetNode.x * targetScale;
    const targetOffsetY = svgCenterY - targetNode.y * targetScale;

    const startScale = scale;
    const startOffsetX = offset.x;
    const startOffsetY = offset.y;

    const duration = 600;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
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
  }, [externalFocusNodeId, displayNodes]);

  // 클러스터로 줌인
  useEffect(() => {
    if (!zoomToClusterId || circles.length === 0 || isAnimatingRef.current)
      return;

    const circle = circles.find((c) => c.clusterId === zoomToClusterId);
    if (!circle || !svgRef.current) return;

    isAnimatingRef.current = true;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const svgCenterX = rect.width / 2;
    const svgCenterY = rect.height / 2;

    const targetScale = Math.min(3, Math.max(1.5, 200 / circle.radius));
    const targetOffsetX = svgCenterX - circle.centerX * targetScale;
    const targetOffsetY = svgCenterY - circle.centerY * targetScale;

    const startScale = scale;
    const startOffsetX = offset.x;
    const startOffsetY = offset.y;

    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeInOut =
        progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

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
      }
    };

    requestAnimationFrame(animate);
  }, [zoomToClusterId, circles]);

  const nodeById = (id: number) => displayNodes.find((n) => n.id === id);

  const screenToWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    const worldX = (mouseX - offset.x) / scale;
    const worldY = (mouseY - offset.y) / scale;
    return { worldX, worldY };
  };

  // wheel 이벤트
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.003;
      const { clientX, clientY, deltaY } = e;

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

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", handleWheel);
    };
  }, [offset, scale]);

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

      setDisplayNodes((prev) =>
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
      const newX = worldX + dragNodeOffset.current.dx;
      const newY = worldY + dragNodeOffset.current.dy;

      setDisplayNodes((prev) =>
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

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    setIsPanning(false);
    panStart.current = null;

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

    if (!wasDragging && prevDraggingNodeId) {
      const node = nodeById(prevDraggingNodeId);
      if (node && !node.isSubcluster) {
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
    e: React.MouseEvent<SVGCircleElement | SVGGElement>,
    nodeId: number,
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

  // Subcluster 노드 클릭 핸들러
  const handleSubclusterClick = (e: React.MouseEvent, subclusterId: string) => {
    e.stopPropagation();
    onToggleSubcluster(subclusterId);
  };

  return (
    <div style={{ position: "relative", overflow: "hidden" }}>
      {/* 툴팁 */}
      {hoveredId != null &&
        hoveredThreadTitle != null &&
        !hoveredSubclusterId &&
        (() => {
          const n = nodeById(hoveredId);
          if (!n || n.isSubcluster) return null;
          const left = n.x * scale + offset.x;
          const top = n.y * scale + offset.y - 24;

          return (
            <div
              className="absolute -translate-x-1/2 -translate-y-full py-0.5 px-1.5 text-[10px] bg-sidebar-button-hover text-primary rounded pointer-events-none whitespace-nowrap z-10"
              style={{ left, top }}
            >
              {hoveredThreadTitle}
            </div>
          );
        })()}

      {/* Subcluster 툴팁 */}
      {hoveredSubclusterId &&
        (() => {
          const n = displayNodes.find(
            (node) => node.subclusterId === hoveredSubclusterId,
          );
          if (!n) return null;
          const sc = subclusters.find((s) => s.id === hoveredSubclusterId);
          const left = n.x * scale + offset.x;
          const top = n.y * scale + offset.y - 30;

          return (
            <div
              className="absolute -translate-x-1/2 -translate-y-full py-1 px-2 text-[10px] bg-sidebar-button-hover text-text-primary rounded pointer-events-none whitespace-nowrap z-10"
              style={{ left, top }}
            >
              <div className="font-medium text-node-focus">
                {n.subclusterSize}개 노드
              </div>
              {sc && sc.top_keywords.length > 0 && (
                <div className="text-text-tertiary mt-0.5 max-w-[150px] truncate">
                  {sc.top_keywords[0]}
                </div>
              )}
              <div className="text-text-tertiary text-[9px] mt-0.5">
                클릭하여 펼치기
              </div>
            </div>
          );
        })()}

      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{
          border: "1px solid var(--color-base-border)",
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
                cursor: "pointer",
                pointerEvents: "all",
                userSelect: "none",
              }}
              className="hover:fill-primary transition-colors"
              onMouseDown={(e) =>
                handleClusterLabelMouseDown(e, circle.clusterId)
              }
              onClick={(e) => {
                e.stopPropagation();
                onClusterClick?.(circle.clusterName);
              }}
            >
              {circle.clusterName}
            </text>
          ))}

          {/* Inter-cluster 엣지 (클러스터 간) */}
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
                strokeWidth={1.2}
              />
            );
          })}

          {/* Intra-cluster 엣지 (클러스터 내) */}
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
                strokeWidth={1}
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
                stroke="var(--color-node-focus)"
                strokeWidth={2}
              />
            );
          })}

          {/* 노드 렌더링 */}
          {displayNodes.map((n) => {
            const isHovered =
              hoveredId === n.id || hoveredSubclusterId === n.subclusterId;
            const isFocused = focusNodeId === n.id;

            if (n.isSubcluster) {
              // 접힌 중분류 노드 렌더링
              const radius = isHovered
                ? SUBCLUSTER_NODE_RADIUS + 2
                : SUBCLUSTER_NODE_RADIUS;

              return (
                <g
                  key={`subcluster-${n.subclusterId}`}
                  style={{ cursor: "pointer" }}
                  onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
                  onMouseEnter={() => {
                    setHoveredId(n.id);
                    setHoveredSubclusterId(n.subclusterId!);
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    setHoveredSubclusterId(null);
                  }}
                  onClick={(e) => handleSubclusterClick(e, n.subclusterId!)}
                >
                  {/* 메인 원 */}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={radius}
                    fill="var(--color-node-focus)"
                    style={{
                      filter: isHovered
                        ? "drop-shadow(0 0 6px var(--color-node-focus))"
                        : undefined,
                    }}
                  />
                  {/* 숫자 표시 */}
                  <text
                    x={n.x}
                    y={n.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={9}
                    fontWeight={600}
                    fill="var(--color-bg-primary)"
                    style={{ pointerEvents: "none" }}
                  >
                    {n.subclusterSize}
                  </text>
                </g>
              );
            } else {
              // 일반 노드 렌더링
              const baseRadius = getNodeRadius(n.edgeCount, maxEdgeCount);
              const radius = isHovered
                ? baseRadius + 2
                : isFocused
                  ? baseRadius + 1
                  : baseRadius;

              const fill = isFocused
                ? "var(--color-node-focus)"
                : isHovered
                  ? "var(--color-node-focus)"
                  : "var(--color-node-default)";

              return (
                <g key={n.id}>
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={radius}
                    fill={fill}
                    className="cursor-pointer"
                    style={{
                      filter: isFocused
                        ? "drop-shadow(0 0 8px var(--color-node-focus))"
                        : undefined,
                    }}
                    onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
                    onMouseEnter={() => setHoveredId(n.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      // 이미 포커싱된 노드를 다시 클릭하면 디테일 페이지로 이동
                      if (focusNodeId === n.id) {
                        onNodeClick?.(n.id);
                      } else {
                        // 첫 번째 클릭: 포커싱만
                        setFocusNodeId(n.id);
                      }
                    }}
                  />
                </g>
              );
            }
          })}
        </g>
      </svg>

      {/* 줌 컨트롤 */}
      <div className="absolute bottom-20 right-6 flex items-center gap-1 bg-bg-secondary/90 backdrop-blur rounded-xl p-1 shadow-lg border border-base-border">
        <button
          onClick={() => setScale((s) => Math.min(s * 1.2, 5))}
          className="w-8 h-8 hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-text-primary transition-colors text-lg"
        >
          +
        </button>
        <button
          onClick={() => setScale((s) => Math.max(s / 1.2, 0.1))}
          className="w-8 h-8 hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-text-primary transition-colors text-lg"
        >
          −
        </button>
        <div className="w-px h-6 bg-base-border mx-1" />
        <span className="px-2 text-xs text-text-secondary min-w-[45px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <div className="w-px h-6 bg-base-border mx-1" />
        <button
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="px-3 h-8 hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-xs text-text-secondary transition-colors"
        >
          초기화
        </button>
      </div>

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
