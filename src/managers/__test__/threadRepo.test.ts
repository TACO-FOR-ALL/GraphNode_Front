import type { ChatMessage, ChatThread } from "@/types/Chat";

const threadStore = new Map<string, ChatThread>();
const mockEnqueueThreadUpdateTitle = jest.fn();
const mockMoveThreadToTrash = jest.fn();
const mockUpdateThreadInStore = jest.fn();

jest.mock("@/utils/uuid", () => ({
  __esModule: true,
  default: jest.fn(() => "thread-1"),
}));

jest.mock("../outboxRepo", () => ({
  outboxRepo: {
    enqueueThreadUpdateTitle: (...args: unknown[]) =>
      mockEnqueueThreadUpdateTitle(...args),
  },
}));

jest.mock("../trashRepo", () => ({
  trashRepo: {
    moveThreadToTrash: (...args: unknown[]) => mockMoveThreadToTrash(...args),
  },
}));

jest.mock("@/store/useThreadStore", () => ({
  useThreadsStore: {
    getState: jest.fn(() => ({
      updateThreadInStore: mockUpdateThreadInStore,
    })),
  },
}));

jest.mock("../storage/selectors/entityStorageSelector", () => {
  const adapter = {
    createThreadRecord: jest.fn(async (input: ChatThread) => {
      threadStore.set(input.id, input);
      return input;
    }),
    listThreads: jest.fn(async () =>
      Array.from(threadStore.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    ),
    getThread: jest.fn(async (id: string) => threadStore.get(id) ?? null),
    searchThreads: jest.fn(async (query: string) => {
      const lowered = query.toLowerCase();
      return Array.from(threadStore.values()).filter(
        (thread) =>
          thread.title.toLowerCase().includes(lowered) ||
          thread.messages.some((message) =>
            message.content.toLowerCase().includes(lowered),
          ),
      );
    }),
    putThread: jest.fn(async (thread: ChatThread) => {
      threadStore.set(thread.id, thread);
    }),
    bulkPutThreads: jest.fn(async (threads: ChatThread[]) => {
      threads.forEach((thread) => threadStore.set(thread.id, thread));
    }),
    bulkDeleteThreads: jest.fn(async (ids: string[]) => {
      ids.forEach((id) => threadStore.delete(id));
    }),
    clearThreads: jest.fn(async () => {
      threadStore.clear();
    }),
    runThreadWriteTransaction: jest.fn(async <T>(callback: () => Promise<T>) =>
      callback(),
    ),
  };

  return {
    getPreferredFolderReadStorage: jest.fn(),
    getPreferredFolderWriteStorage: jest.fn(),
    getPreferredThreadReadStorage: jest.fn(async () => adapter),
    getPreferredThreadWriteStorage: jest.fn(async () => adapter),
  };
});

import { threadRepo } from "../threadRepo";

function makeMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${content}`,
    role,
    content,
    ts: Date.now(),
  };
}

describe("threadRepo", () => {
  beforeEach(() => {
    threadStore.clear();
    mockEnqueueThreadUpdateTitle.mockReset();
    mockMoveThreadToTrash.mockReset();
    mockMoveThreadToTrash.mockResolvedValue({ id: "thread-1" });
    mockUpdateThreadInStore.mockReset();
  });

  test("새 스레드를 생성한다", async () => {
    const thread = await threadRepo.create("Chat", [makeMessage("user", "hello")]);

    expect(thread).toMatchObject({
      id: "thread-1",
      title: "Chat",
    });
    expect(thread.messages).toHaveLength(1);
    expect(threadStore.get("thread-1")).toEqual(thread);
  });

  test("제목 업데이트는 outbox와 store를 함께 갱신한다", async () => {
    threadStore.set("thread-1", {
      id: "thread-1",
      title: "Old",
      messages: [],
      updatedAt: 1,
    });

    const updatedId = await threadRepo.updateThreadTitleById("thread-1", "New");

    expect(updatedId).toBe("thread-1");
    expect(threadStore.get("thread-1")?.title).toBe("New");
    expect(mockEnqueueThreadUpdateTitle).toHaveBeenCalledWith("thread-1", {
      title: "New",
    });
    expect(mockUpdateThreadInStore).toHaveBeenCalled();
  });

  test("메시지 내용으로 검색한다", async () => {
    threadStore.set("thread-1", {
      id: "thread-1",
      title: "General",
      messages: [makeMessage("user", "find me")],
      updatedAt: 1,
    });
    threadStore.set("thread-2", {
      id: "thread-2",
      title: "Other",
      messages: [makeMessage("assistant", "nothing here")],
      updatedAt: 2,
    });

    const results = await threadRepo.getThreadByQuery("find");

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("thread-1");
  });

  test("메시지 추가는 저장소와 Zustand 스토어를 갱신한다", async () => {
    threadStore.set("thread-1", {
      id: "thread-1",
      title: "Chat",
      messages: [],
      updatedAt: 1,
    });

    const updated = await threadRepo.addMessageToThreadById(
      "thread-1",
      makeMessage("assistant", "hello back"),
    );

    expect(updated?.messages).toHaveLength(1);
    expect(mockUpdateThreadInStore).toHaveBeenCalled();
  });

  test("삭제는 trashRepo로 위임한다", async () => {
    threadStore.set("thread-1", {
      id: "thread-1",
      title: "Chat",
      messages: [],
      updatedAt: 1,
    });

    const deletedId = await threadRepo.deleteThreadById("thread-1");

    expect(deletedId).toBe("thread-1");
    expect(mockMoveThreadToTrash).toHaveBeenCalledWith("thread-1");
  });
});
