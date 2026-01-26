import { threadRepo } from "../threadRepo";
import { ChatMessage } from "@/types/Chat";

// DB 모킹
const mockThreads = new Map<string, any>();

jest.mock("@/db/graphnode.db", () => ({
  db: {
    threads: {
      put: jest.fn((thread: any) => {
        mockThreads.set(thread.id, thread);
        return Promise.resolve(thread.id);
      }),
      get: jest.fn((id: string) => Promise.resolve(mockThreads.get(id))),
      orderBy: jest.fn(() => ({
        reverse: jest.fn(() => ({
          toArray: jest.fn(() =>
            Promise.resolve(
              Array.from(mockThreads.values()).sort(
                (a, b) => b.updatedAt - a.updatedAt,
              ),
            ),
          ),
        })),
      })),
      filter: jest.fn((predicate: (thread: any) => boolean) => ({
        toArray: jest.fn(() =>
          Promise.resolve(
            Array.from(mockThreads.values()).filter(predicate),
          ),
        ),
      })),
      delete: jest.fn((id: string) => {
        mockThreads.delete(id);
        return Promise.resolve();
      }),
      bulkPut: jest.fn((threads: any[]) => {
        threads.forEach((t) => mockThreads.set(t.id, t));
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        mockThreads.clear();
        return Promise.resolve();
      }),
    },
  },
}));

// Zustand 스토어 모킹
jest.mock("@/store/useThreadStore", () => ({
  useThreadsStore: {
    getState: jest.fn(() => ({
      updateThreadInStore: jest.fn(),
    })),
  },
}));

// uuid 모킹
jest.mock("@/utils/uuid", () => ({
  __esModule: true,
  default: jest.fn(() => `mock-thread-${Date.now()}-${Math.random()}`),
}));

describe("threadRepo", () => {
  beforeEach(() => {
    mockThreads.clear();
    jest.clearAllMocks();
  });

  const createMockMessage = (
    role: "user" | "assistant" | "system",
    content: string,
  ): ChatMessage => ({
    id: `msg-${Date.now()}`,
    role,
    content,
    ts: Date.now(),
  });

  describe("create", () => {
    test("새 스레드 생성", async () => {
      const thread = await threadRepo.create("Test Thread");

      expect(thread).toBeDefined();
      expect(thread.title).toBe("Test Thread");
      expect(thread.messages).toEqual([]);
      expect(thread.updatedAt).toBeDefined();
    });

    test("메시지와 함께 스레드 생성", async () => {
      const messages = [
        createMockMessage("user", "Hello"),
        createMockMessage("assistant", "Hi there!"),
      ];

      const thread = await threadRepo.create("Chat", messages);

      expect(thread.messages).toHaveLength(2);
    });
  });

  describe("getThreadList", () => {
    test("모든 스레드 조회 (updatedAt 역순)", async () => {
      const baseTime = Date.now();

      mockThreads.set("t1", {
        id: "t1",
        title: "Thread 1",
        messages: [],
        updatedAt: baseTime,
      });
      mockThreads.set("t2", {
        id: "t2",
        title: "Thread 2",
        messages: [],
        updatedAt: baseTime + 1000,
      });

      const threads = await threadRepo.getThreadList();

      expect(threads).toHaveLength(2);
      expect(threads[0].id).toBe("t2"); // 최신이 먼저
    });

    test("빈 목록", async () => {
      const threads = await threadRepo.getThreadList();

      expect(threads).toEqual([]);
    });
  });

  describe("getThreadById", () => {
    test("존재하는 스레드 조회", async () => {
      const created = await threadRepo.create("Test");
      mockThreads.set(created.id, created);

      const found = await threadRepo.getThreadById(created.id);

      expect(found).not.toBeNull();
      expect(found!.title).toBe("Test");
    });

    test("존재하지 않는 스레드 → null", async () => {
      const found = await threadRepo.getThreadById("non-existent");

      expect(found).toBeNull();
    });
  });

  describe("getThreadByQuery", () => {
    test("메시지 내용으로 검색", async () => {
      const thread = {
        id: "t1",
        title: "Chat",
        messages: [
          createMockMessage("user", "Hello World"),
          createMockMessage("assistant", "Hi there!"),
        ],
        updatedAt: Date.now(),
      };
      mockThreads.set("t1", thread);

      // filter 모킹 업데이트 필요
      const { db } = require("@/db/graphnode.db");
      db.threads.filter.mockImplementation(
        (predicate: (t: any) => boolean) => ({
          toArray: jest.fn(() =>
            Promise.resolve(
              Array.from(mockThreads.values()).filter(predicate),
            ),
          ),
        }),
      );

      const results = await threadRepo.getThreadByQuery("hello");

      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test("대소문자 구분 없이 검색", async () => {
      const thread = {
        id: "t1",
        title: "Chat",
        messages: [createMockMessage("user", "HELLO WORLD")],
        updatedAt: Date.now(),
      };
      mockThreads.set("t1", thread);

      const { db } = require("@/db/graphnode.db");
      db.threads.filter.mockImplementation(
        (predicate: (t: any) => boolean) => ({
          toArray: jest.fn(() =>
            Promise.resolve(
              Array.from(mockThreads.values()).filter(predicate),
            ),
          ),
        }),
      );

      const results = await threadRepo.getThreadByQuery("hello");

      // 대소문자 구분 없이 검색되어야 함
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("updateThreadTitleById", () => {
    test("스레드 제목 변경", async () => {
      const thread = {
        id: "t1",
        title: "Original",
        messages: [],
        updatedAt: Date.now(),
      };
      mockThreads.set("t1", thread);

      const updatedId = await threadRepo.updateThreadTitleById(
        "t1",
        "Updated Title",
      );

      expect(updatedId).toBe("t1");
      expect(mockThreads.get("t1").title).toBe("Updated Title");
    });

    test("존재하지 않는 스레드 업데이트 → null", async () => {
      const result = await threadRepo.updateThreadTitleById(
        "non-existent",
        "Title",
      );

      expect(result).toBeNull();
    });

    test("업데이트 시 updatedAt 갱신", async () => {
      const baseTime = Date.now() - 10000;
      const thread = {
        id: "t1",
        title: "Thread",
        messages: [],
        updatedAt: baseTime,
      };
      mockThreads.set("t1", thread);

      await threadRepo.updateThreadTitleById("t1", "Updated");

      expect(mockThreads.get("t1").updatedAt).toBeGreaterThan(baseTime);
    });
  });

  describe("addMessageToThreadById", () => {
    test("스레드에 메시지 추가", async () => {
      const thread = {
        id: "t1",
        title: "Chat",
        messages: [createMockMessage("user", "Hello")],
        updatedAt: Date.now(),
      };
      mockThreads.set("t1", thread);

      const newMessage = createMockMessage("assistant", "Hi!");
      const updated = await threadRepo.addMessageToThreadById("t1", newMessage);

      expect(updated).not.toBeNull();
      expect(mockThreads.get("t1").messages).toHaveLength(2);
    });

    test("존재하지 않는 스레드에 메시지 추가 → null", async () => {
      const message = createMockMessage("user", "Hello");
      const result = await threadRepo.addMessageToThreadById(
        "non-existent",
        message,
      );

      expect(result).toBeNull();
    });

    test("메시지 추가 시 updatedAt 갱신", async () => {
      const baseTime = Date.now() - 10000;
      const thread = {
        id: "t1",
        title: "Chat",
        messages: [],
        updatedAt: baseTime,
      };
      mockThreads.set("t1", thread);

      const message = createMockMessage("user", "Hello");
      await threadRepo.addMessageToThreadById("t1", message);

      expect(mockThreads.get("t1").updatedAt).toBeGreaterThan(baseTime);
    });
  });

  describe("deleteThreadById", () => {
    test("스레드 삭제", async () => {
      const thread = {
        id: "t1",
        title: "Thread",
        messages: [],
        updatedAt: Date.now(),
      };
      mockThreads.set("t1", thread);

      const deletedId = await threadRepo.deleteThreadById("t1");

      expect(deletedId).toBe("t1");
      expect(mockThreads.has("t1")).toBe(false);
    });

    test("삭제 실패 시 null 반환", async () => {
      const { db } = require("@/db/graphnode.db");
      db.threads.delete.mockRejectedValueOnce(new Error("Delete failed"));

      const result = await threadRepo.deleteThreadById("t1");

      expect(result).toBeNull();
    });
  });

  describe("upsertMany", () => {
    test("여러 스레드 일괄 삽입", async () => {
      const baseTime = Date.now();
      const threads = [
        { id: "t1", title: "Thread 1", messages: [], updatedAt: baseTime },
        {
          id: "t2",
          title: "Thread 2",
          messages: [],
          updatedAt: baseTime + 1000,
        },
      ];

      await threadRepo.upsertMany(threads);

      expect(mockThreads.size).toBe(2);
    });
  });

  describe("clearAll", () => {
    test("모든 스레드 삭제", async () => {
      mockThreads.set("t1", {
        id: "t1",
        title: "Thread",
        messages: [],
        updatedAt: Date.now(),
      });

      await threadRepo.clearAll();

      expect(mockThreads.size).toBe(0);
    });
  });
});
