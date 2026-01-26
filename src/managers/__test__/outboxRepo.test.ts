import { outboxRepo } from "../outboxRepo";
import { OutboxOp } from "@/types/Outbox";

// DB 모킹
const mockOutbox = new Map<string, OutboxOp>();

jest.mock("@/db/graphnode.db", () => ({
  db: {
    outbox: {
      put: jest.fn((op: OutboxOp) => {
        mockOutbox.set(op.opId, op);
        return Promise.resolve(op.opId);
      }),
      where: jest.fn((criteria: any) => {
        if (typeof criteria === "string") {
          // where("entityId").equals(...)
          return {
            equals: jest.fn((value: string) => ({
              toArray: jest.fn(() =>
                Promise.resolve(
                  Array.from(mockOutbox.values()).filter(
                    (op) => op.entityId === value,
                  ),
                ),
              ),
              first: jest.fn(() =>
                Promise.resolve(
                  Array.from(mockOutbox.values()).find(
                    (op) => op.entityId === value,
                  ),
                ),
              ),
            })),
          };
        } else {
          // where({ entityId, type, status })
          return {
            first: jest.fn(() =>
              Promise.resolve(
                Array.from(mockOutbox.values()).find(
                  (op) =>
                    op.entityId === criteria.entityId &&
                    op.type === criteria.type &&
                    op.status === criteria.status,
                ),
              ),
            ),
            toArray: jest.fn(() =>
              Promise.resolve(
                Array.from(mockOutbox.values()).filter(
                  (op) =>
                    op.entityId === criteria.entityId &&
                    op.type === criteria.type &&
                    op.status === criteria.status,
                ),
              ),
            ),
          };
        }
      }),
      update: jest.fn((opId: string, updates: Partial<OutboxOp>) => {
        const op = mockOutbox.get(opId);
        if (op) {
          mockOutbox.set(opId, { ...op, ...updates });
          return Promise.resolve(1);
        }
        return Promise.resolve(0);
      }),
      bulkDelete: jest.fn((ids: string[]) => {
        ids.forEach((id) => mockOutbox.delete(id));
        return Promise.resolve();
      }),
    },
    transaction: jest.fn(async (...args: any[]) => {
      const callback = args[args.length - 1];
      if (typeof callback === "function") {
        return await callback();
      }
    }),
  },
}));

// uuid 모킹
let uuidCounter = 0;
jest.mock("@/utils/uuid", () => ({
  __esModule: true,
  default: jest.fn(() => `mock-op-${++uuidCounter}`),
}));

describe("outboxRepo", () => {
  beforeEach(() => {
    mockOutbox.clear();
    uuidCounter = 0;
    jest.clearAllMocks();
  });

  describe("enqueueNoteCreate", () => {
    test("새 create op 생성", async () => {
      await outboxRepo.enqueueNoteCreate("note-1", {
        id: "note-1",
        title: "Test Note",
        content: "Content",
        folderId: null,
      });

      expect(mockOutbox.size).toBe(1);
      const op = Array.from(mockOutbox.values())[0];
      expect(op.type).toBe("note.create");
      expect(op.entityId).toBe("note-1");
      expect(op.status).toBe("pending");
    });

    test("create op에 올바른 payload 저장", async () => {
      const payload = {
        id: "note-1",
        title: "My Note",
        content: "Hello World",
        folderId: "folder-1",
      };

      await outboxRepo.enqueueNoteCreate("note-1", payload);

      const op = Array.from(mockOutbox.values())[0];
      expect(op.payload).toEqual(payload);
    });
  });

  describe("enqueueNoteUpdate", () => {
    test("새 update op 생성", async () => {
      await outboxRepo.enqueueNoteUpdate("note-1", {
        title: "Updated Title",
        content: "Updated Content",
      });

      expect(mockOutbox.size).toBe(1);
      const op = Array.from(mockOutbox.values())[0];
      expect(op.type).toBe("note.update");
    });

    test("pending create가 있으면 create payload에 흡수", async () => {
      // 먼저 create op 생성
      const createOp: OutboxOp = {
        opId: "create-op-1",
        entityId: "note-1",
        type: "note.create",
        payload: {
          id: "note-1",
          title: "Original",
          content: "Original Content",
          folderId: null,
        },
        status: "pending",
        retryCount: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockOutbox.set("create-op-1", createOp);

      // update 시도
      await outboxRepo.enqueueNoteUpdate("note-1", {
        title: "Updated",
        content: "Updated Content",
      });

      // create op만 있어야 함 (update가 create에 흡수)
      expect(mockOutbox.size).toBe(1);
      const mergedOp = mockOutbox.get("create-op-1");
      expect(mergedOp!.type).toBe("note.create");
      expect(mergedOp!.payload.title).toBe("Updated");
      expect(mergedOp!.payload.content).toBe("Updated Content");
    });

    test("기존 pending update가 있으면 덮어쓰기", async () => {
      // 먼저 update op 생성
      const updateOp: OutboxOp = {
        opId: "update-op-1",
        entityId: "note-1",
        type: "note.update",
        payload: { title: "First Update" },
        status: "pending",
        retryCount: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockOutbox.set("update-op-1", updateOp);

      // 두 번째 update
      await outboxRepo.enqueueNoteUpdate("note-1", {
        title: "Second Update",
      });

      // 여전히 하나의 update op만 있어야 함
      expect(mockOutbox.size).toBe(1);
      const op = mockOutbox.get("update-op-1");
      expect(op!.payload.title).toBe("Second Update");
    });
  });

  describe("enqueueNoteMove", () => {
    test("새 move op 생성", async () => {
      await outboxRepo.enqueueNoteMove("note-1", {
        folderId: "folder-1",
      });

      expect(mockOutbox.size).toBe(1);
      const op = Array.from(mockOutbox.values())[0];
      expect(op.type).toBe("note.move");
      expect(op.payload.folderId).toBe("folder-1");
    });

    test("pending create가 있으면 create payload에 흡수", async () => {
      const createOp: OutboxOp = {
        opId: "create-op-1",
        entityId: "note-1",
        type: "note.create",
        payload: {
          id: "note-1",
          title: "Note",
          content: "Content",
          folderId: null,
        },
        status: "pending",
        retryCount: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockOutbox.set("create-op-1", createOp);

      await outboxRepo.enqueueNoteMove("note-1", {
        folderId: "new-folder",
      });

      expect(mockOutbox.size).toBe(1);
      const mergedOp = mockOutbox.get("create-op-1");
      expect(mergedOp!.payload.folderId).toBe("new-folder");
    });
  });

  describe("enqueueNoteDelete", () => {
    test("새 delete op 생성", async () => {
      await outboxRepo.enqueueNoteDelete("note-1");

      expect(mockOutbox.size).toBe(1);
      const op = Array.from(mockOutbox.values())[0];
      expect(op.type).toBe("note.delete");
      expect(op.payload).toEqual({ id: "note-1" });
    });

    test("delete 시 기존 pending op들 제거", async () => {
      // pending create 추가
      const createOp: OutboxOp = {
        opId: "create-op-1",
        entityId: "note-1",
        type: "note.create",
        payload: { id: "note-1", title: "Note", content: "", folderId: null },
        status: "pending",
        retryCount: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockOutbox.set("create-op-1", createOp);

      // pending update 추가
      const updateOp: OutboxOp = {
        opId: "update-op-1",
        entityId: "note-1",
        type: "note.update",
        payload: { title: "Updated" },
        status: "pending",
        retryCount: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockOutbox.set("update-op-1", updateOp);

      // delete 호출
      await outboxRepo.enqueueNoteDelete("note-1");

      // delete op만 남아야 함
      expect(mockOutbox.size).toBe(1);
      const remainingOp = Array.from(mockOutbox.values())[0];
      expect(remainingOp.type).toBe("note.delete");
    });

    test("processing 상태의 op는 제거하지 않음", async () => {
      // processing 상태의 create
      const processingOp: OutboxOp = {
        opId: "processing-op",
        entityId: "note-1",
        type: "note.create",
        payload: { id: "note-1", title: "Note", content: "", folderId: null },
        status: "processing",
        retryCount: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockOutbox.set("processing-op", processingOp);

      await outboxRepo.enqueueNoteDelete("note-1");

      // processing op는 유지, delete op 추가
      expect(mockOutbox.size).toBe(2);
    });
  });

  describe("Coalesce 규칙", () => {
    test("여러 update → 마지막 값으로 coalesce", async () => {
      await outboxRepo.enqueueNoteUpdate("note-1", { title: "First" });

      // 첫 번째 op를 저장한 후 두 번째 update 시도
      const firstOp = Array.from(mockOutbox.values())[0];

      // where 모킹 업데이트
      const { db } = require("@/db/graphnode.db");
      db.outbox.where.mockImplementation((criteria: any) => {
        if (typeof criteria === "object") {
          return {
            first: jest.fn(() => {
              if (
                criteria.entityId === "note-1" &&
                criteria.type === "note.update" &&
                criteria.status === "pending"
              ) {
                return Promise.resolve(firstOp);
              }
              return Promise.resolve(undefined);
            }),
          };
        }
        return {
          equals: jest.fn(() => ({
            toArray: jest.fn(() => Promise.resolve([])),
          })),
        };
      });

      await outboxRepo.enqueueNoteUpdate("note-1", { title: "Second" });

      // 하나의 op만 있어야 함
      expect(mockOutbox.size).toBe(1);
      expect(mockOutbox.get(firstOp.opId)!.payload.title).toBe("Second");
    });

    test("서로 다른 noteId의 op는 독립적", async () => {
      // where 모킹 초기화 - 각각 다른 entityId이므로 기존 op가 없음
      const { db } = require("@/db/graphnode.db");
      db.outbox.where.mockImplementation((criteria: any) => {
        if (typeof criteria === "object") {
          return {
            first: jest.fn(() => Promise.resolve(undefined)),
          };
        }
        return {
          equals: jest.fn(() => ({
            toArray: jest.fn(() => Promise.resolve([])),
          })),
        };
      });

      await outboxRepo.enqueueNoteUpdate("note-1", { title: "Note 1" });
      await outboxRepo.enqueueNoteUpdate("note-2", { title: "Note 2" });

      // 두 개의 op가 있어야 함
      expect(mockOutbox.size).toBe(2);
    });
  });

  describe("enqueueThreadUpdateTitle", () => {
    test("새 thread.update op 생성", async () => {
      await outboxRepo.enqueueThreadUpdateTitle("thread-1", {
        title: "Updated Title",
      });

      expect(mockOutbox.size).toBe(1);
      const op = Array.from(mockOutbox.values())[0];
      expect(op.type).toBe("thread.update");
      expect(op.entityId).toBe("thread-1");
      expect(op.payload).toEqual({ title: "Updated Title" });
    });

    test("기존 pending thread.update가 있으면 덮어쓰기", async () => {
      // 먼저 thread.update op 생성
      const updateOp: OutboxOp = {
        opId: "thread-update-op-1",
        entityId: "thread-1",
        type: "thread.update",
        payload: { title: "First Title" },
        status: "pending",
        retryCount: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockOutbox.set("thread-update-op-1", updateOp);

      // where 모킹 업데이트
      const { db } = require("@/db/graphnode.db");
      db.outbox.where.mockImplementation((criteria: any) => {
        if (typeof criteria === "object") {
          return {
            first: jest.fn(() => {
              if (
                criteria.entityId === "thread-1" &&
                criteria.type === "thread.update" &&
                criteria.status === "pending"
              ) {
                return Promise.resolve(updateOp);
              }
              return Promise.resolve(undefined);
            }),
          };
        }
        return {
          equals: jest.fn(() => ({
            toArray: jest.fn(() => Promise.resolve([])),
          })),
        };
      });

      // 두 번째 update
      await outboxRepo.enqueueThreadUpdateTitle("thread-1", {
        title: "Second Title",
      });

      // 하나의 op만 있어야 함
      expect(mockOutbox.size).toBe(1);
      const op = mockOutbox.get("thread-update-op-1");
      expect(op!.payload.title).toBe("Second Title");
    });
  });

  describe("enqueueThreadDelete", () => {
    test("새 thread.delete op 생성", async () => {
      await outboxRepo.enqueueThreadDelete("thread-1");

      expect(mockOutbox.size).toBe(1);
      const op = Array.from(mockOutbox.values())[0];
      expect(op.type).toBe("thread.delete");
      expect(op.entityId).toBe("thread-1");
      expect(op.payload).toBeNull();
    });

    test("delete 시 기존 pending thread.update op 제거", async () => {
      // pending thread.update 추가
      const updateOp: OutboxOp = {
        opId: "thread-update-op-1",
        entityId: "thread-1",
        type: "thread.update",
        payload: { title: "Updated" },
        status: "pending",
        retryCount: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockOutbox.set("thread-update-op-1", updateOp);

      // where 모킹 업데이트
      const { db } = require("@/db/graphnode.db");
      db.outbox.where.mockImplementation((criteria: any) => {
        if (typeof criteria === "string" && criteria === "entityId") {
          return {
            equals: jest.fn((value: string) => ({
              toArray: jest.fn(() =>
                Promise.resolve(
                  Array.from(mockOutbox.values()).filter(
                    (op) => op.entityId === value,
                  ),
                ),
              ),
            })),
          };
        }
        return {
          first: jest.fn(() => Promise.resolve(undefined)),
          toArray: jest.fn(() => Promise.resolve([])),
        };
      });

      // delete 호출
      await outboxRepo.enqueueThreadDelete("thread-1");

      // delete op만 남아야 함
      expect(mockOutbox.size).toBe(1);
      const remainingOp = Array.from(mockOutbox.values())[0];
      expect(remainingOp.type).toBe("thread.delete");
    });

    test("processing 상태의 thread.update op는 제거하지 않음", async () => {
      // processing 상태의 update
      const processingOp: OutboxOp = {
        opId: "processing-thread-op",
        entityId: "thread-1",
        type: "thread.update",
        payload: { title: "Processing" },
        status: "processing",
        retryCount: 0,
        nextRetryAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockOutbox.set("processing-thread-op", processingOp);

      // where 모킹 업데이트
      const { db } = require("@/db/graphnode.db");
      db.outbox.where.mockImplementation((criteria: any) => {
        if (typeof criteria === "string" && criteria === "entityId") {
          return {
            equals: jest.fn((value: string) => ({
              toArray: jest.fn(() =>
                Promise.resolve(
                  Array.from(mockOutbox.values()).filter(
                    (op) => op.entityId === value,
                  ),
                ),
              ),
            })),
          };
        }
        return {
          first: jest.fn(() => Promise.resolve(undefined)),
          toArray: jest.fn(() => Promise.resolve([])),
        };
      });

      await outboxRepo.enqueueThreadDelete("thread-1");

      // processing op는 유지, delete op 추가
      expect(mockOutbox.size).toBe(2);
    });
  });

  describe("entityId 검증", () => {
    test("빈 entityId로 enqueue 시 에러", async () => {
      await expect(
        outboxRepo.enqueueNoteCreate("", {
          id: "",
          title: "Test",
          content: "",
          folderId: null,
        }),
      ).rejects.toThrow("entityId is required");
    });

    test("빈 entityId로 thread enqueue 시 에러", async () => {
      await expect(
        outboxRepo.enqueueThreadUpdateTitle("", { title: "Test" }),
      ).rejects.toThrow("entityId is required");

      await expect(outboxRepo.enqueueThreadDelete("")).rejects.toThrow(
        "entityId is required",
      );
    });
  });

  describe("Op 메타데이터", () => {
    test("생성 시 기본 메타데이터 설정", async () => {
      const beforeTime = Date.now();

      await outboxRepo.enqueueNoteCreate("note-1", {
        id: "note-1",
        title: "Test",
        content: "",
        folderId: null,
      });

      const op = Array.from(mockOutbox.values())[0];
      expect(op.status).toBe("pending");
      expect(op.retryCount).toBe(0);
      expect(op.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(op.updatedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(op.nextRetryAt).toBeGreaterThanOrEqual(beforeTime);
    });
  });
});
