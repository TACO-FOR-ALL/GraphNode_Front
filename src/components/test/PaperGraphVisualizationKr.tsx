import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3Force from "d3-force";
import ZoomControls from "@/components/visualize/ZoomControls";

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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
  Paper: "논문",
  Problem: "문제",
  Method: "방법",
  Dataset: "데이터",
  Metric: "지표",
  Result: "결과",
  Baseline: "기준",
  Limitation: "한계",
};

// 노드 타입 한국어
const NODE_TYPE_KR: Record<string, string> = {
  Paper: "논문",
  Problem: "문제",
  Method: "방법론",
  Dataset: "데이터셋",
  Metric: "평가 지표",
  Result: "결과",
  Baseline: "베이스라인",
  Limitation: "한계점",
};

// 엣지 타입 한국어
const EDGE_TYPE_KR: Record<string, string> = {
  proposes: "제안",
  addresses: "해결",
  evaluates_on: "평가",
  uses: "사용",
  achieves: "달성",
  measured_by: "측정",
  outperforms: "능가",
  suffers_from: "문제점",
};

type ViewMode = "network" | "cluster";

interface Props {
  data: { nodes: RawNode[]; edges: RawEdge[] }[];
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}

const NODE_RADIUS = 18;

// 가짜 AI 응답 생성 함수
function generateFakeResponse(contextNodes: GraphNode[], question: string): string {
  if (contextNodes.length === 0) {
    return "컨텍스트에 선택된 노드가 없습니다. Ctrl+클릭으로 노드를 선택해주세요.";
  }

  const nodeNames = contextNodes.map((n) => `"${n.name}"`).join(", ");
  const nodeTypes = contextNodes.map((n) => NODE_TYPE_KR[n.type] || n.type);

  if (question.includes("관계") || question.includes("연결") || question.includes("connection")) {
    if (contextNodes.length === 1) {
      const node = contextNodes[0];
      return `**${node.name}**에 대한 분석:\n\n이 ${NODE_TYPE_KR[node.type] || node.type}은(는) 논문의 핵심 요소 중 하나입니다.\n\n**설명:** ${node.description}\n\n이 노드는 다른 노드들과 다양한 관계를 맺고 있으며, 전체 연구의 맥락에서 중요한 역할을 합니다.`;
    } else {
      const relationshipAnalysis = contextNodes
        .map((n, i) => `${i + 1}. **${n.name}** (${NODE_TYPE_KR[n.type]}): ${n.description.slice(0, 100)}...`)
        .join("\n\n");

      return `**선택된 ${contextNodes.length}개 노드 간의 관계 분석:**\n\n${relationshipAnalysis}\n\n**관계성 요약:**\n이 노드들은 음성 감정 인식(SER) 연구에서 서로 밀접하게 연결되어 있습니다. ${contextNodes[0].name}은(는) ${contextNodes.length > 1 ? contextNodes[1].name : "다른 요소들"}과 함께 연구의 핵심 프레임워크를 구성합니다.\n\n특히, 이들 간의 상호작용은 크로스-코퍼스 일반화 문제를 해결하는 데 중요한 역할을 합니다.`;
    }
  }

  if (question.includes("설명") || question.includes("뭐") || question.includes("무엇")) {
    return `**선택된 노드들에 대한 설명:**\n\n${contextNodes.map((n) => `- **${n.name}** (${NODE_TYPE_KR[n.type]})\n  ${n.description}`).join("\n\n")}`;
  }

  if (question.includes("중요") || question.includes("핵심") || question.includes("의미")) {
    return `**${nodeNames}의 중요성:**\n\n선택하신 노드들은 이 연구에서 매우 중요한 역할을 합니다.\n\n${contextNodes.map((n) => `- **${n.name}**: 이 ${NODE_TYPE_KR[n.type]}은(는) 연구의 ${n.type === "Method" ? "방법론적 기반" : n.type === "Result" ? "성과 입증" : n.type === "Problem" ? "연구 동기" : "핵심 구성 요소"}을 담당합니다.`).join("\n\n")}\n\n이러한 요소들의 조합이 5%의 성능 향상이라는 유의미한 결과를 이끌어냈습니다.`;
  }

  // 기본 응답
  return `**컨텍스트 노드:** ${nodeNames}\n\n질문하신 내용에 대해 분석해드리겠습니다.\n\n선택하신 ${contextNodes.length}개의 노드(${nodeTypes.join(", ")})는 이 논문에서 중요한 역할을 합니다. 각 노드는 크로스-코퍼스 음성 감정 인식 연구의 서로 다른 측면을 나타내며, 함께 연구의 전체적인 기여를 구성합니다.\n\n더 구체적인 질문이 있으시면 말씀해주세요!`;
}

export default function PaperGraphVisualizationKr({
  data,
  width = 1200,
  height = 800,
  title,
  subtitle,
  onBack,
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

  // 에이전트 관련 상태
  const [contextNodes, setContextNodes] = useState<GraphNode[]>([]);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const layoutCalculatedRef = useRef<{ network: boolean; cluster: boolean }>({ network: false, cluster: false });
  const initialDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  // 컨테이너 크기 감지 - 최초 한 번만 dimensions 설정
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // 최초 dimensions만 저장
        if (!initialDimensionsRef.current) {
          initialDimensionsRef.current = {
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          };
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // 채팅 스크롤
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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
            x: 0, // force simulation에서 위치 설정
            y: 0,
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
  }, [data]);

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

  // 클러스터 위치 계산
  const clusterPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.32;

    positions["Paper"] = { x: centerX, y: centerY };

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
    if (processedData.nodes.length === 0 || viewMode !== "network" || dimensions.width === 0) return;
    // 이미 레이아웃이 계산되었으면 재실행하지 않음
    if (layoutCalculatedRef.current.network) return;
    layoutCalculatedRef.current.network = true;

    // 초기 위치를 dimensions 기반으로 랜덤 설정
    const simNodes = processedData.nodes.map((n, i) => ({
      ...n,
      x: dimensions.width / 2 + (Math.random() - 0.5) * 200,
      y: dimensions.height / 2 + (Math.random() - 0.5) * 200,
    }));
    const simEdges = processedData.edges
      .map((e) => ({
        source: simNodes.find((n) => n.id === e.source),
        target: simNodes.find((n) => n.id === e.target),
      }))
      .filter((e) => e.source && e.target);

    const simulation = d3Force
      .forceSimulation(simNodes as any)
      .force("center", d3Force.forceCenter(dimensions.width / 2, dimensions.height / 2).strength(0.05))
      .force(
        "charge",
        d3Force.forceManyBody().strength((d: any) => {
          return d.hasEdges ? -350 : -150;
        })
      )
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
    if (processedData.nodes.length === 0 || viewMode !== "cluster" || dimensions.width === 0) return;
    // 이미 레이아웃이 계산되었으면 재실행하지 않음
    if (layoutCalculatedRef.current.cluster) return;
    layoutCalculatedRef.current.cluster = true;

    const simNodes = processedData.nodes.map((n) => ({
      ...n,
      x: clusterPositions[n.type]?.x || dimensions.width / 2,
      y: clusterPositions[n.type]?.y || dimensions.height / 2,
    }));

    const simulation = d3Force
      .forceSimulation(simNodes as any)
      .force("charge", d3Force.forceManyBody().strength(-80))
      .force("collision", d3Force.forceCollide(NODE_RADIUS + 20))
      .force(
        "x",
        d3Force.forceX((d: any) => clusterPositions[d.type]?.x || dimensions.width / 2).strength(0.5)
      )
      .force(
        "y",
        d3Force.forceY((d: any) => clusterPositions[d.type]?.y || dimensions.height / 2).strength(0.5)
      )
      .stop();

    for (let i = 0; i < 200; i++) {
      simulation.tick();
    }

    setNodes(simNodes);
    setEdges(processedData.edges);
  }, [processedData, dimensions.width, dimensions.height, viewMode, clusterPositions]);

  // 모드 변경 시 선택 초기화 및 레이아웃 플래그 리셋
  useEffect(() => {
    setSelectedNode(null);
    setHoveredNode(null);
    setHoveredEdge(null);
    // 현재 모드가 아닌 쪽의 레이아웃 플래그만 리셋 (다시 진입할 때 재계산)
    if (viewMode === "network") {
      layoutCalculatedRef.current.cluster = false;
    } else {
      layoutCalculatedRef.current.network = false;
    }
  }, [viewMode]);

  // 마우스 이벤트
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.002;
    const newScale = scale * (1 - e.deltaY * zoomIntensity);
    setScale(Math.min(Math.max(newScale, 0.3), 3));
  };

  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest(".node-group")) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !panStart.current) return;
    setOffset({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // 클릭인지 드래그인지 판단 (5px 이내면 클릭으로 간주)
    if (mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      const isClick = Math.sqrt(dx * dx + dy * dy) < 5;

      // 배경 클릭 시 노드 선택 해제
      if (isClick && !(e.target as Element).closest(".node-group")) {
        setSelectedNode(null);
        setHoveredEdge(null);
      }
    }

    setIsPanning(false);
    panStart.current = null;
    mouseDownPos.current = null;
  };

  // 노드 클릭 핸들러 (Ctrl+클릭 지원)
  const handleNodeClick = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();

    if (e.ctrlKey || e.metaKey) {
      // Ctrl+클릭: 컨텍스트에 추가/제거
      setContextNodes((prev) => {
        const exists = prev.find((n) => n.id === node.id);
        if (exists) {
          return prev.filter((n) => n.id !== node.id);
        } else {
          return [...prev, node];
        }
      });
      // 에이전트 창 열기
      setIsAgentOpen(true);
    } else {
      // 일반 클릭: 노드 선택
      setSelectedNode(selectedNode?.id === node.id ? null : node);
    }
  };

  // 채팅 메시지 전송
  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: inputValue };
    setChatMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // 가짜 응답 생성 (타이핑 효과)
    setTimeout(() => {
      const response = generateFakeResponse(contextNodes, inputValue);
      setChatMessages((prev) => [...prev, { role: "assistant", content: response }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  // 컨텍스트에서 노드 제거
  const removeFromContext = (nodeId: string) => {
    setContextNodes((prev) => prev.filter((n) => n.id !== nodeId));
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
  const getEdgePath = (source: GraphNode, target: GraphNode) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0)
      return { path: `M${source.x},${source.y}`, x1: source.x, y1: source.y, x2: source.x, y2: source.y };

    const nx = dx / len;
    const ny = dy / len;

    const padding = NODE_RADIUS + 2;
    const x1 = source.x + nx * padding;
    const y1 = source.y + ny * padding;
    const x2 = target.x - nx * padding;
    const y2 = target.y - ny * padding;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const curvature = Math.min(len * 0.15, 40);
    const perpX = -ny * curvature;
    const perpY = nx * curvature;
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

  // 엣지 가시성 체크
  const isEdgeVisible = (edge: GraphEdge) => {
    if (viewMode === "network") return true;

    const sourceNode = nodeById(edge.source);
    const targetNode = nodeById(edge.target);
    if (!sourceNode || !targetNode) return false;

    if (sourceNode.type === targetNode.type) return true;
    if (sourceNode.type === "Paper" || targetNode.type === "Paper") return true;

    if (selectedNode) {
      return edge.source === selectedNode.id || edge.target === selectedNode.id;
    }

    return false;
  };

  // 컨텍스트에 있는 노드인지 확인
  const isInContext = (nodeId: string) => contextNodes.some((n) => n.id === nodeId);

  return (
    <div className="flex flex-col h-screen bg-bg-primary relative">

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 - 범례 */}
        <div className="w-[259px] p-4 pb-20 border-r border-text-tertiary/20 overflow-y-auto scroll-hidden bg-bg-secondary/30">
          {/* 돌아가기 버튼 및 제목 */}
          {(onBack || title) && (
            <div className="mb-6 pb-4 border-b border-text-tertiary/20">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors mb-3"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm font-medium">돌아가기</span>
                </button>
              )}
              {title && (
                <h1 className="text-base font-bold text-text-primary leading-tight mb-1">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-text-secondary">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* 노드 타입 범례 */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-text-primary mb-3 uppercase tracking-wider">
              노드 유형
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
                    {NODE_ABBR[type]?.charAt(0)}
                  </div>
                  <span className="text-xs text-text-secondary flex-1">{NODE_TYPE_KR[type]}</span>
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
              관계 유형
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
                  <span className="text-xs text-text-secondary flex-1">{EDGE_TYPE_KR[type]}</span>
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
              통계
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-bg-primary rounded-lg">
                <p className="text-lg font-bold text-primary">{nodes.length}</p>
                <p className="text-[10px] text-text-secondary">노드</p>
              </div>
              <div className="text-center p-2 bg-bg-primary rounded-lg">
                <p className="text-lg font-bold text-primary">{edges.length}</p>
                <p className="text-[10px] text-text-secondary">엣지</p>
              </div>
            </div>
          </div>

          {/* 도움말 */}
          <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-[10px] text-text-secondary leading-relaxed">
              <strong className="text-text-primary">도움말:</strong>{" "}
              {viewMode === "network"
                ? "스크롤로 확대/축소, 드래그로 이동. 노드 클릭으로 상세 정보 확인."
                : "노드 클릭으로 클러스터 간 연결 표시."}
            </p>
            <p className="text-[10px] text-primary mt-2 leading-relaxed">
              <strong>Ctrl+클릭:</strong> 노드를 컨텍스트에 추가하고 에이전트와 대화
            </p>
          </div>
        </div>

        {/* 그래프 영역 */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden bg-bg-primary">
          {/* Floating 2D/3D 모드 토글 패널 - 오른쪽 상단 */}
          <div className="absolute z-20 top-6 right-6 flex flex-col gap-2">
            {/* 뷰 모드 토글 */}
            <div className="flex gap-1 w-[170px] h-[32px] p-[2px] relative bg-bg-tertiary rounded-md">
              <div
                onClick={() => setViewMode("network")}
                className={`flex-1 flex items-center justify-center text-sm font-medium cursor-pointer relative z-10 transition-colors duration-200 ${
                  viewMode === "network" ? "text-primary" : "text-text-secondary"
                }`}
              >
                네트워크
              </div>
              <div
                onClick={() => setViewMode("cluster")}
                className={`flex-1 flex items-center justify-center text-sm font-medium cursor-pointer relative z-10 transition-colors duration-200 ${
                  viewMode === "cluster" ? "text-primary" : "text-text-secondary"
                }`}
              >
                클러스터
              </div>
              <div
                className={`absolute top-[2px] h-[28px] bg-bg-primary border-base-border border-solid border-[1px] rounded-md w-[81px] transition-all duration-300 ease-in-out ${
                  viewMode === "cluster" ? "left-[87px]" : "left-[2px]"
                }`}
              ></div>
            </div>
          </div>
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
              <filter id="context-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
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
              {/* 클러스터 배경 */}
              {viewMode === "cluster" &&
                nodeTypes.map((type) => {
                  const pos = clusterPositions[type];
                  const colors = NODE_COLORS[type];
                  if (!pos || !colors) return null;

                  return (
                    <g key={`cluster-bg-${type}`}>
                      <circle cx={pos.x} cy={pos.y} r={80} fill={colors.fill} opacity={0.08} />
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
                        {NODE_TYPE_KR[type]}
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
                  selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);
                const color = EDGE_COLORS[edge.type] || "#9CA3AF";
                const pathData = getEdgePath(source, target);
                const isCrossCluster = viewMode === "cluster" && source.type !== target.type;

                return (
                  <g key={`edge-${idx}`}>
                    <path
                      d={pathData.path}
                      stroke="transparent"
                      strokeWidth={12}
                      fill="none"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredEdge(edge)}
                      onMouseLeave={() => setHoveredEdge(null)}
                    />
                    <path
                      d={pathData.path}
                      stroke={color}
                      strokeWidth={isHovered || isConnectedToSelected ? 2 : 1}
                      strokeOpacity={isCrossCluster ? 0.8 : isHovered || isConnectedToSelected ? 0.9 : 0.4}
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
                const isContext = isInContext(node.id);
                const isActive = isHovered || isSelected;

                return (
                  <g
                    key={node.id}
                    className="node-group"
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={(e) => handleNodeClick(e, node)}
                  >
                    {/* 컨텍스트 표시 (외곽 글로우) */}
                    {isContext && (
                      <circle r={NODE_RADIUS + 8} fill="none" stroke="#8B5CF6" strokeWidth={3} opacity={0.6} />
                    )}
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
                    <circle r={NODE_RADIUS} fill={`url(#node-gradient-${node.type})`} filter="url(#node-shadow)" />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="8"
                      fontWeight="bold"
                      fill="white"
                      style={{ pointerEvents: "none" }}
                    >
                      {NODE_ABBR[node.type] || "??"}
                    </text>
                    <g style={{ opacity: isActive ? 1 : 0.7 }}>
                      <rect
                        x={-getTextWidth(truncateText(node.name, 20)) / 2 - 6}
                        y={NODE_RADIUS + 6}
                        width={getTextWidth(truncateText(node.name, 20)) + 12}
                        height={18}
                        rx={9}
                        fill="var(--color-bg-primary)"
                        stroke={isContext ? "#8B5CF6" : "var(--color-text-tertiary)"}
                        strokeWidth={isContext ? 1.5 : 0.5}
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
                        {truncateText(node.name, 20)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* 줌 컨트롤 */}
          <ZoomControls
            scale={scale}
            onZoomIn={() => setScale((s) => Math.min(s * 1.2, 3))}
            onZoomOut={() => setScale((s) => Math.max(s / 1.2, 0.3))}
            onReset={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
          />
        </div>

        {/* 상세 정보 패널 - 선택된 노드가 있을 때만 표시, 애니메이션으로 등장 */}
        <div
          className={`w-80 border-l border-text-tertiary/20 overflow-y-auto scroll-hidden bg-bg-secondary/30 transition-all duration-300 ease-out ${
            selectedNode || hoveredEdge
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0 absolute right-0 top-0 bottom-0 pointer-events-none"
          }`}
        >
          {selectedNode ? (
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${NODE_COLORS[selectedNode.type]?.gradient || "#9CA3AF"} 0%, ${NODE_COLORS[selectedNode.type]?.fill || "#9CA3AF"} 100%)`,
                  }}
                >
                  {NODE_ABBR[selectedNode.type]?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="inline-block text-[10px] font-medium px-2 py-0.5 bg-bg-tertiary rounded-full text-text-secondary mb-1">
                    {NODE_TYPE_KR[selectedNode.type]}
                  </span>
                  <h3 className="text-sm font-semibold text-text-primary leading-tight">{selectedNode.name}</h3>
                </div>
              </div>

              <div className="mb-4 p-3 bg-bg-tertiary/50 rounded-xl">
                <p className="text-xs text-text-secondary leading-relaxed">{selectedNode.description}</p>
              </div>

              <h4 className="text-xs font-semibold text-text-primary mb-2 uppercase tracking-wider">
                연결 ({edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id).length})
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
                            {EDGE_TYPE_KR[edge.type]}
                          </span>
                          <span className="text-text-placeholder text-[10px]">{isSource ? "→" : "←"}</span>
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
                            {NODE_ABBR[otherNode?.type || ""]?.charAt(0) || "?"}
                          </div>
                          <p className="text-text-primary truncate">{truncateText(otherNode?.name || otherNodeId, 30)}</p>
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
                {EDGE_TYPE_KR[hoveredEdge.type]}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">{hoveredEdge.description}</p>
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
                  <span className="text-xs text-text-placeholder">{Math.round(hoveredEdge.confidence * 100)}%</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* 에이전트 패널 */}
      {isAgentOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-bg-primary border-l border-text-tertiary/20 shadow-2xl flex flex-col z-50">
          {/* 헤더 */}
          <div className="p-4 border-b border-text-tertiary/20 bg-bg-secondary/50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-text-primary">AI 에이전트</h2>
              <button
                onClick={() => setIsAgentOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-tertiary text-text-secondary"
              >
                ✕
              </button>
            </div>

            {/* 컨텍스트 노드 목록 */}
            <div>
              <p className="text-xs text-text-secondary mb-2">선택된 컨텍스트 ({contextNodes.length}개)</p>
              <div className="flex flex-wrap gap-1.5">
                {contextNodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-center gap-1 px-2 py-1 bg-bg-tertiary rounded-lg text-xs"
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: NODE_COLORS[node.type]?.fill || "#9CA3AF" }}
                    />
                    <span className="text-text-primary max-w-[120px] truncate">{node.name}</span>
                    <button
                      onClick={() => removeFromContext(node.id)}
                      className="text-text-placeholder hover:text-text-primary ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {contextNodes.length === 0 && (
                  <p className="text-xs text-text-placeholder">Ctrl+클릭으로 노드를 추가하세요</p>
                )}
              </div>
            </div>
          </div>

          {/* 채팅 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-text-secondary mb-2">선택한 노드에 대해 질문해보세요</p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setInputValue("이 노드들의 관계가 뭐야?");
                      handleSendMessage();
                    }}
                    className="block w-full text-left px-3 py-2 bg-bg-tertiary rounded-lg text-xs text-text-primary hover:bg-bg-tertiary/80"
                  >
                    💡 이 노드들의 관계가 뭐야?
                  </button>
                  <button
                    onClick={() => {
                      setInputValue("이것들이 왜 중요해?");
                      handleSendMessage();
                    }}
                    className="block w-full text-left px-3 py-2 bg-bg-tertiary rounded-lg text-xs text-text-primary hover:bg-bg-tertiary/80"
                  >
                    💡 이것들이 왜 중요해?
                  </button>
                </div>
              </div>
            )}

            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-white rounded-br-md"
                      : "bg-bg-tertiary text-text-primary rounded-bl-md"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-bg-tertiary text-text-primary p-3 rounded-2xl rounded-bl-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-text-placeholder rounded-full animate-bounce" />
                    <span
                      className="w-2 h-2 bg-text-placeholder rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <span
                      className="w-2 h-2 bg-text-placeholder rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="p-4 border-t border-text-tertiary/20 bg-bg-secondary/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder="질문을 입력하세요..."
                className="flex-1 px-4 py-2 bg-bg-tertiary rounded-xl text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTextWidth(text: string): number {
  return text.length * 6;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}
