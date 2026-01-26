import sortItemByDate from "@/utils/sortItemByDate";
import { ChatThread, ChatMessage } from "../types/Chat";
import uuid from "../utils/uuid";
import { db } from "@/db/graphnode.db";
import { useThreadsStore } from "@/store/useThreadStore";
import { outboxRepo } from "./outboxRepo";

export const threadRepo = {
  async create(
    title: string,
    messages: ChatMessage[] = [],
  ): Promise<ChatThread> {
    const newThread: ChatThread = {
      id: uuid(),
      title,
      messages,
      updatedAt: Date.now(),
    };
    await db.threads.put(newThread);
    return newThread;
  },

  async getThreadList(): Promise<ChatThread[]> {
    const rows = await db.threads.orderBy("updatedAt").reverse().toArray();
    return rows ?? [];
  },

  async getThreadById(id: string): Promise<ChatThread | null> {
    return (await db.threads.get(id)) ?? null;
  },

  async getThreadByQuery(query: string): Promise<ChatThread[]> {
    return await db.threads
      .filter((thread) =>
        thread.messages.some((message) =>
          message.content.toLowerCase().includes(query.toLowerCase()),
        ),
      )
      .toArray();
  },

  async updateThreadTitleById(id: string, title: string) {
    const thread = await this.getThreadById(id);
    if (!thread) return null;

    const updated = { ...thread, title, updatedAt: Date.now() };

    await db.transaction("rw", db.threads, db.outbox, async () => {
      await db.threads.put(updated);
      await outboxRepo.enqueueThreadUpdateTitle(id, { title: title });

      // Zustand 상태 반영 (타이틀 변경)
      useThreadsStore.getState().updateThreadInStore(updated);
    });

    return updated.id;
  },

  async addMessageToThreadById(id: string, message: ChatMessage) {
    const thread = await this.getThreadById(id);
    if (!thread) return null;

    const updated = {
      ...thread,
      messages: [...thread.messages, message],
      updatedAt: Date.now(),
    };
    await db.threads.put(updated);

    // Zustand 상태도 업데이트 (메시지 추가)
    useThreadsStore.getState().updateThreadInStore(updated);
    return updated;
  },

  async deleteThreadById(id: string): Promise<string | null> {
    const thread = await this.getThreadById(id);
    if (!thread) return null;

    await db.transaction("rw", db.threads, db.outbox, async () => {
      await db.threads.delete(id);
      await outboxRepo.enqueueThreadDelete(id);
    });

    return id;
  },

  async upsertMany(newOnes: ChatThread[]): Promise<void> {
    const sorted = sortItemByDate(newOnes);
    await db.threads.bulkPut(sorted);
  },

  async clearAll(): Promise<void> {
    await db.threads.clear();
  },
};

export default threadRepo;
