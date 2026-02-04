export type GraphNode = {
  id: string;
  clusterId?: string;
};

export type GraphEdge = {
  source: string;
  target: string;
};

export type GraphData = {
  nodes: Node[];
  edges: Edge[];
};

export type Node = {
  id: number;
  orig_id: string;
  cluster_id: string;
  cluster_name: string;
  num_messages: number;
};

export type Edge = {
  source: number; // node id
  target: number; // node id
};

export type PositionedNode = {
  id: number;
  userId: string;
  origId: string;
  clusterId: string;
  clusterName: string;
  timestamp: string | null;
  numMessages: number;
  createdAt?: string;
  updatedAt?: string;
  x: number;
  y: number;
  edgeCount: number;
};

export type PositionedEdge = {
  userId: string;
  id?: string;
  source: number;
  target: number;
  weight: number;
  type: "hard" | "insight";
  intraCluster: boolean;
  createdAt?: string;
  updatedAt?: string;
  isIntraCluster: boolean;
};

export type ClusterCircle = {
  clusterId: string;
  clusterName: string;
  centerX: number;
  centerY: number;
  radius: number;
};

export type Subcluster = {
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
