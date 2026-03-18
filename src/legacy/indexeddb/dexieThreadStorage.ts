import { db } from "@/legacy/indexeddb/graphnode.db";
import type { ChatThread } from "@/types/Chat";
import sortItemByDate from "@/utils/sortItemByDate";
import type {
  CreateThreadRecordInput,
  ThreadStorageAdapter,
} from "@/managers/storage/contracts/threadStorage";

export const dexieThreadStorage: ThreadStorageAdapter = {
  async createThreadRecord(input: CreateThreadRecordInput): Promise<ChatThread> {
    await db.threads.put(input);
    return input;
  },
  async listThreads(): Promise<ChatThread[]> {
    return db.threads.orderBy("updatedAt").reverse().toArray();
  },
  async getThread(id: string): Promise<ChatThread | null> {
    return (await db.threads.get(id)) ?? null;
  },
  async searchThreads(query: string): Promise<ChatThread[]> {
    return db.threads
      .filter((thread) =>
        thread.messages.some((message) =>
          message.content.toLowerCase().includes(query.toLowerCase()),
        ),
      )
      .toArray();
  },
  async putThread(thread: ChatThread): Promise<void> {
    await db.threads.put(thread);
  },
  async bulkPutThreads(threads: ChatThread[]): Promise<void> {
    await db.threads.bulkPut(sortItemByDate(threads));
  },
  async bulkDeleteThreads(ids: string[]): Promise<void> {
    await db.threads.bulkDelete(ids);
  },
  async clearThreads(): Promise<void> {
    await db.threads.clear();
  },
  async runThreadWriteTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return db.transaction("rw", db.threads, db.outbox, callback);
  },
};
