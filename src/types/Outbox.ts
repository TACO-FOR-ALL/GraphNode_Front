export type OutboxOpType =
  | "note.create"
  | "note.update"
  | "note.move"
  | "note.delete";

export type OutboxOp = {
  opId: string;
  entityId: string;
  type: OutboxOpType;

  payload: any;
  status: "pending" | "processing";

  retryCount: number;
  nextRetryAt: number;

  createdAt: number;
  updatedAt: number;
  lastError?: string;
};
