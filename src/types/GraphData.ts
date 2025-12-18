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

type Node = {
  id: number;
  orig_id: string;
  cluster_id: string;
  cluster_name: string;
  num_messages: number;
};

type Edge = {
  source: number; // node id
  target: number; // node id
};
