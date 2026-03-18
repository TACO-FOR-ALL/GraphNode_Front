import type { ChatThread } from "@/types/Chat";
import sortItemByDate from "@/utils/sortItemByDate";
import type {
  CreateThreadRecordInput,
  ThreadStorageAdapter,
} from "../../contracts/threadStorage";

export const sqliteRendererThreadStorage: ThreadStorageAdapter = {
  async createThreadRecord(input: CreateThreadRecordInput): Promise<ChatThread> {
    await window.graphnodeAPI.upsertSQLiteThread(input);
    return input;
  },
  async listThreads(): Promise<ChatThread[]> {
    return window.graphnodeAPI.listSQLiteThreads();
  },
  async getThread(id: string): Promise<ChatThread | null> {
    return window.graphnodeAPI.getSQLiteThreadById(id);
  },
  async searchThreads(query: string): Promise<ChatThread[]> {
    return window.graphnodeAPI.searchSQLiteThreads(query);
  },
  async putThread(thread: ChatThread): Promise<void> {
    await window.graphnodeAPI.upsertSQLiteThread(thread);
  },
  async bulkPutThreads(threads: ChatThread[]): Promise<void> {
    await window.graphnodeAPI.bulkUpsertSQLiteThreads(sortItemByDate(threads));
  },
  async bulkDeleteThreads(ids: string[]): Promise<void> {
    await window.graphnodeAPI.bulkDeleteSQLiteThreads(ids);
  },
  async clearThreads(): Promise<void> {
    await window.graphnodeAPI.clearSQLiteThreads();
  },
  async runThreadWriteTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  },
};
