import { ChatThread, ChatMessage } from "../types/Chat";
import uuid from "../utils/uuid";
import { db } from "../db/chat.db";
import sortThread from "../utils/sortThread";
import { useThreadsStore } from "@/store/useThreadStore";
import { deleteVectorsByIds } from "./vectorManager";

export const threadRepo = {
  async create(
    title: string,
    messages: ChatMessage[] = []
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

  async updateThreadTitleById(id: string, title: string) {
    const thread = await this.getThreadById(id);
    if (!thread) return null;

    const updated = { ...thread, title, updatedAt: Date.now() };
    await db.threads.put(updated);

    // Zustand 상태 반영 (타이틀 변경)
    useThreadsStore.getState().updateThreadInStore(updated);
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
    try {
      // 1. 먼저 해당 스레드의 모든 벡터 데이터 삭제
      const vectors = await db.vectors.where("threadId").equals(id).toArray();
      const vectorIds = vectors.map((v) => v.id);

      if (vectorIds.length > 0) {
        await deleteVectorsByIds(vectorIds);
        console.log(`🗑️ 스레드 ${id}의 ${vectorIds.length}개 벡터 삭제 완료`);
      }

      // 2. 스레드 삭제
      await db.threads.delete(id);

      // // 3. Zustand 상태에서도 제거
      // useThreadsStore.getState().removeThreadFromStore(id);

      return id;
    } catch (error) {
      console.error("스레드 삭제 오류:", error);
      return null;
    }
  },

  async upsertMany(newOnes: ChatThread[]): Promise<void> {
    const sorted = sortThread(newOnes);
    await db.threads.bulkPut(sorted);
  },

  async clearAll(): Promise<void> {
    await db.threads.clear();
  },
};

export default threadRepo;
