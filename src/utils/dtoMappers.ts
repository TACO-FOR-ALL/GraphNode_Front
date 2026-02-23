import type {
  GraphNodeDto,
  GraphEdgeDto,
  GraphClusterDto,
  GraphStatsDto,
  GraphSubclusterDto,
  GraphSnapshotDto,
  GraphSummaryDto,
} from "node_modules/@taco_tsinghua/graphnode-sdk/dist/types/graph";
import type { NoteDto } from "@taco_tsinghua/graphnode-sdk";
import type {
  PositionedNode,
  PositionedEdge,
  GraphCluster,
  GraphStats,
  GraphSubcluster,
  GraphSnapshot,
} from "@/types/GraphData";
import type { GraphSummary } from "@/types/GraphSummary";
import type { Note } from "@/types/Note";

// 날짜 변환 헬퍼
function toTimestamp(isoString: string | null | undefined): number | null {
  if (!isoString) return null;
  return new Date(isoString).getTime();
}

function toTimestampRequired(isoString: string): number {
  return new Date(isoString).getTime();
}

// Graph Node 변환
export function mapGraphNode(dto: GraphNodeDto): PositionedNode {
  return {
    id: dto.id,
    userId: dto.userId,
    origId: dto.origId,
    clusterId: dto.clusterId,
    clusterName: dto.clusterName,
    timestamp: toTimestamp(dto.timestamp),
    numMessages: dto.numMessages,
    createdAt: toTimestamp(dto.createdAt) ?? undefined,
    updatedAt: toTimestamp(dto.updatedAt) ?? undefined,
    x: 0,
    y: 0,
    edgeCount: 0,
  };
}

// Graph Edge 변환
export function mapGraphEdge(dto: GraphEdgeDto): PositionedEdge {
  return {
    userId: dto.userId,
    id: dto.id,
    source: dto.source,
    target: dto.target,
    weight: dto.weight,
    type: dto.type,
    intraCluster: dto.intraCluster,
    createdAt: toTimestamp(dto.createdAt) ?? undefined,
    updatedAt: toTimestamp(dto.updatedAt) ?? undefined,
    isIntraCluster: dto.intraCluster,
  };
}

// Graph Cluster 변환
export function mapGraphCluster(dto: GraphClusterDto): GraphCluster {
  return {
    id: dto.id,
    userId: dto.userId,
    name: dto.name,
    description: dto.description,
    size: dto.size,
    themes: dto.themes,
    createdAt: toTimestamp(dto.createdAt) ?? undefined,
    updatedAt: toTimestamp(dto.updatedAt) ?? undefined,
  };
}

// Graph Stats 변환
export function mapGraphStats(dto: GraphStatsDto): GraphStats {
  return {
    userId: dto.userId,
    nodes: dto.nodes,
    edges: dto.edges,
    clusters: dto.clusters,
    generatedAt: toTimestamp(dto.generatedAt) ?? undefined,
    metadata: dto.metadata,
  };
}

// Graph Subcluster 변환
export function mapGraphSubcluster(dto: GraphSubclusterDto): GraphSubcluster {
  return {
    id: dto.id,
    userId: dto.userId,
    clusterId: dto.clusterId,
    nodeIds: dto.nodeIds,
    representativeNodeId: dto.representativeNodeId,
    size: dto.size,
    density: dto.density,
    topKeywords: dto.topKeywords,
    createdAt: toTimestamp(dto.createdAt) ?? undefined,
    updatedAt: toTimestamp(dto.updatedAt) ?? undefined,
  };
}

// Graph Snapshot 변환
export function mapGraphSnapshot(dto: GraphSnapshotDto): GraphSnapshot {
  return {
    nodes: dto.nodes.map(mapGraphNode),
    edges: dto.edges.map(mapGraphEdge),
    clusters: dto.clusters.map(mapGraphCluster),
    subclusters: dto.subclusters?.map(mapGraphSubcluster),
    stats: {
      nodes: dto.stats.nodes,
      edges: dto.stats.edges,
      clusters: dto.stats.clusters,
      generatedAt: toTimestamp(dto.stats.generatedAt) ?? undefined,
      metadata: dto.stats.metadata,
    },
  };
}

// Graph Summary 변환
export function mapGraphSummary(dto: GraphSummaryDto): GraphSummary {
  return {
    overview: {
      total_conversations: dto.overview.total_conversations,
      time_span: dto.overview.time_span,
      primary_interests: dto.overview.primary_interests,
      conversation_style: dto.overview.conversation_style,
      most_active_period: dto.overview.most_active_period,
      summary_text: dto.overview.summary_text,
    },
    clusters: dto.clusters.map((c: GraphSummaryDto["clusters"][number]) => ({
      cluster_id: c.cluster_id,
      name: c.name,
      size: c.size,
      density: c.density,
      centrality: c.centrality,
      recency: c.recency as "active" | "dormant" | "new" | "unknown",
      top_keywords: c.top_keywords,
      key_themes: c.key_themes,
      common_question_types: c.common_question_types,
      insight_text: c.insight_text,
      notable_conversations: c.notable_conversations,
    })),
    patterns: dto.patterns.map((p: GraphSummaryDto["patterns"][number]) => ({
      pattern_type: p.pattern_type as
        | "repetition"
        | "progression"
        | "gap"
        | "bridge",
      description: p.description,
      evidence: p.evidence,
      significance: p.significance as "high" | "medium" | "low",
    })),
    connections: dto.connections.map(
      (conn: GraphSummaryDto["connections"][number]) => ({
        source_cluster: conn.source_cluster,
        target_cluster: conn.target_cluster,
        connection_strength: conn.connection_strength,
        bridge_keywords: conn.bridge_keywords,
        description: conn.description,
      }),
    ),
    recommendations: dto.recommendations.map(
      (r: GraphSummaryDto["recommendations"][number]) => ({
        type: r.type as "consolidate" | "explore" | "review" | "connect",
        title: r.title,
        description: r.description,
        related_nodes: r.related_nodes,
        priority: r.priority as "high" | "medium" | "low",
      }),
    ),
    generated_at: dto.generated_at,
    detail_level: dto.detail_level as "brief" | "standard" | "detailed",
  };
}

// Note 변환
export function mapNote(dto: NoteDto): Note {
  return {
    id: dto.id,
    title: dto.title,
    content: dto.content,
    folderId: dto.folderId,
    createdAt: toTimestampRequired(dto.createdAt),
    updatedAt: toTimestampRequired(dto.updatedAt),
  };
}
