export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  threadId: string;
  role: ChatRole;
  content: string;
  ts: number;
};

export interface MessageVector {
  id: string;
  threadId: string;
  ts: number;
  dim: number;
  model: string;
  vec: ArrayBuffer;
  preview?: string;
}

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

export type ChatMessageRequest = {
  role: ChatRole;
  content: string;
};
