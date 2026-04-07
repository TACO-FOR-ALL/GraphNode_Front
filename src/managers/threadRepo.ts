import sortItemByDate from "@/utils/sortItemByDate";
import { ChatThread, ChatMessage } from "../types/Chat";
import uuid from "../utils/uuid";
import { useThreadsStore } from "@/store/useThreadStore";
import { outboxRepo } from "./outboxRepo";
import { trashRepo } from "./trashRepo";
import { isElectron } from "@/utils/platform";
import {
  getPreferredThreadReadStorage,
  getPreferredThreadWriteStorage,
} from "./storage/selectors/entityStorageSelector";

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
    const writeStorage = await getPreferredThreadWriteStorage();
    await writeStorage.createThreadRecord(newThread);
    return newThread;
  },

  async getThreadList(): Promise<ChatThread[]> {
    const rows = await (await getPreferredThreadReadStorage()).listThreads();
    return rows ?? [];
  },

  async getThreadById(id: string): Promise<ChatThread | null> {
    return (await getPreferredThreadReadStorage()).getThread(id);
  },

  async getThreadByQuery(query: string): Promise<ChatThread[]> {
    return (await getPreferredThreadReadStorage()).searchThreads(query);
  },

  async updateThreadTitleById(id: string, title: string) {
    const thread = await this.getThreadById(id);
    if (!thread) return null;

    const updated = { ...thread, title, updatedAt: Date.now() };
    const writeStorage = await getPreferredThreadWriteStorage();

    await writeStorage.runThreadWriteTransaction(async () => {
      await writeStorage.putThread(updated);
      if (isElectron()) {
        await outboxRepo.enqueueThreadUpdateTitle(id, { title: title });
      }

      // Zustand 상태 반영 (타이틀 변경)
      useThreadsStore.getState().updateThreadInStore(updated);
    });

    return updated.id;
  },

  async addMessageToThreadById(id: string, message: ChatMessage) {
    // 웹에서 getThreadById는 API 호출 → 서버는 로컬에서 추가한 메시지를 모름
    // → Zustand 캐시 우선 사용, 없을 때만 스토리지 조회
    const thread =
      useThreadsStore.getState().threads[id] ?? (await this.getThreadById(id));
    if (!thread) return null;

    const updated = {
      ...thread,
      messages: [...thread.messages, message],
      updatedAt: Date.now(),
    };

    // UI 즉시 반영 (낙관적 업데이트, API 호출 전)
    useThreadsStore.getState().updateThreadInStore(updated);
    await (await getPreferredThreadWriteStorage()).putThread(updated);
    return updated;
  },

  async updateMessageInThreadById(
    threadId: string,
    messageId: string,
    content: string,
  ) {
    // 웹에서 API getThread는 로컬 메시지를 모르므로 Zustand 캐시 우선 사용
    const thread =
      useThreadsStore.getState().threads[threadId] ??
      (await this.getThreadById(threadId));
    if (!thread) return null;

    const updated = {
      ...thread,
      messages: thread.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg,
      ),
      updatedAt: Date.now(),
    };

    // UI 즉시 반영 (낙관적 업데이트, API 호출 전)
    useThreadsStore.getState().updateThreadInStore(updated);
    await (await getPreferredThreadWriteStorage()).putThread(updated);
    return updated;
  },

  async deleteMessageFromThreadById(threadId: string, messageId: string) {
    const thread =
      useThreadsStore.getState().threads[threadId] ??
      (await this.getThreadById(threadId));
    if (!thread) return null;

    const updated = {
      ...thread,
      messages: thread.messages.filter((msg) => msg.id !== messageId),
      updatedAt: Date.now(),
    };

    // UI 즉시 반영 (낙관적 업데이트, API 호출 전)
    useThreadsStore.getState().updateThreadInStore(updated);
    await (await getPreferredThreadWriteStorage()).putThread(updated);
    return updated;
  },

  async deleteThreadById(id: string): Promise<string | null> {
    const thread = await this.getThreadById(id);
    if (!thread) return null;

    if (isElectron()) {
      // 휴지통으로 이동 (서버 삭제는 영구 삭제 시에만)
      const trashedThread = await trashRepo.moveThreadToTrash(id);
      if (!trashedThread) return null;
    } else {
      const writeStorage = await getPreferredThreadWriteStorage();
      await writeStorage.bulkDeleteThreads([id]);
    }

    return id;
  },

  async upsertMany(newOnes: ChatThread[]): Promise<void> {
    if (!isElectron()) return;
    await (await getPreferredThreadWriteStorage()).bulkPutThreads(newOnes);
  },

  async deleteMany(ids: string[]): Promise<void> {
    await (await getPreferredThreadWriteStorage()).bulkDeleteThreads(ids);
  },

  async clearAll(): Promise<void> {
    await (await getPreferredThreadWriteStorage()).clearThreads();
  },
};

export default threadRepo;
