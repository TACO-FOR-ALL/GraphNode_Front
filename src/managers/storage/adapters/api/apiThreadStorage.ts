import { api } from "@/apiClient";
import type { ChatThread, ChatMessage } from "@/types/Chat";
import { unwrapResponse } from "@/utils/httpResponse";
import type {
  ThreadStorageAdapter,
  CreateThreadRecordInput,
} from "../../contracts/threadStorage";

function toThread(dto: {
  id: string;
  title: string;
  updatedAt?: string;
  messages: { id: string; role: string; content: string; createdAt?: string }[];
}): ChatThread {
  return {
    id: dto.id,
    title: dto.title,
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt).getTime() : Date.now(),
    messages: dto.messages.map((msg) => ({
      id: msg.id,
      role: msg.role as ChatMessage["role"],
      content: msg.content,
      ts: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
    })),
  };
}

export const apiThreadStorage: ThreadStorageAdapter = {
  async listThreads(): Promise<ChatThread[]> {
    const result = await api.conversations.list();
    if (!result.isSuccess) return [];
    return result.data.map(toThread);
  },

  async getThread(id: string): Promise<ChatThread | null> {
    const result = await api.conversations.get(id);
    if (!result.isSuccess) return null;
    return toThread(result.data);
  },

  async searchThreads(query: string): Promise<ChatThread[]> {
    const result = await api.conversations.list();
    if (!result.isSuccess) return [];
    return result.data
      .filter((dto) => dto.title.toLowerCase().includes(query.toLowerCase()))
      .map(toThread);
  },

  async createThreadRecord(
    input: CreateThreadRecordInput,
  ): Promise<ChatThread> {
    const result = await api.conversations.create({
      id: input.id,
      title: input.title,
    });
    if (!result.isSuccess) throw new Error("Failed to create thread");
    return toThread(result.data);
  },

  async putThread(thread: ChatThread): Promise<void> {
    const result = await api.conversations.update(thread.id, {
      title: thread.title,
    });
    if (!result.isSuccess) {
      console.error("[apiThreadStorage] putThread failed:", result);
      throw new Error(
        `Failed to update thread title: ${result.error?.message ?? "unknown"}`,
      );
    }
  },

  async bulkPutThreads(_threads: ChatThread[]): Promise<void> {
    // 웹에서는 서버가 source of truth — 클라이언트 bulk put 불필요
  },

  async bulkDeleteThreads(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id) => api.conversations.softDelete(id).then(unwrapResponse)),
    );
  },

  async clearThreads(): Promise<void> {
    await api.conversations.deleteAll();
  },

  async runThreadWriteTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  },
};
