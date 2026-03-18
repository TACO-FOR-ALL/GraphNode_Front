import type { ChatThread, ChatMessage } from "@/types/Chat";

export type CreateThreadRecordInput = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
};

export interface ThreadStorageAdapter {
  createThreadRecord(input: CreateThreadRecordInput): Promise<ChatThread>;
  listThreads(): Promise<ChatThread[]>;
  getThread(id: string): Promise<ChatThread | null>;
  searchThreads(query: string): Promise<ChatThread[]>;
  putThread(thread: ChatThread): Promise<void>;
  bulkPutThreads(threads: ChatThread[]): Promise<void>;
  bulkDeleteThreads(ids: string[]): Promise<void>;
  clearThreads(): Promise<void>;
  runThreadWriteTransaction<T>(callback: () => Promise<T>): Promise<T>;
}
