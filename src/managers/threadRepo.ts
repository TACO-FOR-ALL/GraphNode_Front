import sortItemByDate from "@/utils/sortItemByDate";
import { ChatThread, ChatMessage } from "../types/Chat";
import uuid from "../utils/uuid";
import { useThreadsStore } from "@/store/useThreadStore";
import { outboxRepo } from "./outboxRepo";
import { trashRepo } from "./trashRepo";
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
    await (await getPreferredThreadWriteStorage()).putThread(updated);

    // Zustand 상태도 업데이트 (메시지 추가)
    useThreadsStore.getState().updateThreadInStore(updated);
    return updated;
  },

  async updateMessageInThreadById(
    threadId: string,
    messageId: string,
    content: string,
  ) {
    const thread = await this.getThreadById(threadId);
    if (!thread) return null;

    const updated = {
      ...thread,
      messages: thread.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg,
      ),
      updatedAt: Date.now(),
    };
    await (await getPreferredThreadWriteStorage()).putThread(updated);

    // Zustand 상태도 업데이트
    useThreadsStore.getState().updateThreadInStore(updated);
    return updated;
  },

  async deleteMessageFromThreadById(threadId: string, messageId: string) {
    const thread = await this.getThreadById(threadId);
    if (!thread) return null;

    const updated = {
      ...thread,
      messages: thread.messages.filter((msg) => msg.id !== messageId),
      updatedAt: Date.now(),
    };
    await (await getPreferredThreadWriteStorage()).putThread(updated);

    // Zustand 상태도 업데이트
    useThreadsStore.getState().updateThreadInStore(updated);
    return updated;
  },

  async deleteThreadById(id: string): Promise<string | null> {
    const thread = await this.getThreadById(id);
    if (!thread) return null;

    // 휴지통으로 이동 (서버 삭제는 영구 삭제 시에만)
    const trashedThread = await trashRepo.moveThreadToTrash(id);
    if (!trashedThread) return null;

    return id;
  },

  async upsertMany(newOnes: ChatThread[]): Promise<void> {
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
