import type { OutboxOp } from "@/types/Outbox";
import { outboxRepo } from "../outboxRepo";

const mockOutbox = new Map<string, OutboxOp & { entityType?: string }>();

let uuidCounter = 0;
jest.mock("@/utils/uuid", () => ({
  __esModule: true,
  default: jest.fn(() => `sqlite-op-${++uuidCounter}`),
}));

function installGraphNodeMock() {
  Object.defineProperty(window, "graphnodeAPI", {
    configurable: true,
    value: {
      listSQLiteOutboxByEntityId: jest.fn(async (entityId: string) =>
        Array.from(mockOutbox.values()).filter((op) => op.entityId === entityId),
      ),
      listSQLiteOutboxByEntityIds: jest.fn(async (entityIds: string[]) =>
        Array.from(mockOutbox.values()).filter((op) =>
          entityIds.includes(op.entityId),
        ),
      ),
      getSQLitePendingOutbox: jest.fn(async (entityId: string, type: string) =>
        Array.from(mockOutbox.values()).find(
          (op) =>
            op.entityId === entityId &&
            op.type === type &&
            op.status === "pending",
        ) ?? null,
      ),
      putSQLiteOutbox: jest.fn(async (op: OutboxOp & { entityType: string }) => {
        mockOutbox.set(op.opId, op);
        return { ok: true };
      }),
      updateSQLiteOutbox: jest.fn(
        async (opId: string, updates: Partial<OutboxOp>) => {
          const current = mockOutbox.get(opId);
          if (!current) return { ok: false };
          mockOutbox.set(opId, { ...current, ...updates });
          return { ok: true };
        },
      ),
      bulkDeleteSQLiteOutbox: jest.fn(async (opIds: string[]) => {
        opIds.forEach((opId) => mockOutbox.delete(opId));
        return { ok: true, count: opIds.length };
      }),
    },
  });
}

describe("outboxRepo SQLite", () => {
  beforeEach(() => {
    mockOutbox.clear();
    uuidCounter = 0;
    installGraphNodeMock();
    jest.clearAllMocks();
  });

  test("enqueueNoteCreate stores a SQLite-backed pending op", async () => {
    await outboxRepo.enqueueNoteCreate("note-1", {
      id: "note-1",
      title: "Title",
      content: "Body",
      folderId: null,
    });

    expect(mockOutbox.size).toBe(1);
    const op = Array.from(mockOutbox.values())[0];
    expect(op.type).toBe("note.create");
    expect(op.entityId).toBe("note-1");
    expect(op.status).toBe("pending");
  });

  test("enqueueNoteUpdate merges into an existing pending create op", async () => {
    mockOutbox.set("create-1", {
      opId: "create-1",
      entityId: "note-1",
      type: "note.create",
      payload: {
        id: "note-1",
        title: "Original",
        content: "Original content",
        folderId: null,
      },
      status: "pending",
      retryCount: 0,
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await outboxRepo.enqueueNoteUpdate("note-1", {
      title: "Updated",
      content: "Updated content",
    });

    expect(mockOutbox.size).toBe(1);
    expect(mockOutbox.get("create-1")?.payload).toEqual({
      id: "note-1",
      title: "Updated",
      content: "Updated content",
      folderId: null,
    });
  });

  test("enqueueNoteDelete removes pending ops and leaves only delete", async () => {
    mockOutbox.set("create-1", {
      opId: "create-1",
      entityId: "note-1",
      type: "note.create",
      payload: { id: "note-1" },
      status: "pending",
      retryCount: 0,
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockOutbox.set("move-1", {
      opId: "move-1",
      entityId: "note-1",
      type: "note.move",
      payload: { folderId: "folder-1" },
      status: "pending",
      retryCount: 0,
      nextRetryAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await outboxRepo.enqueueNoteDelete("note-1");

    expect(mockOutbox.size).toBe(1);
    const op = Array.from(mockOutbox.values())[0];
    expect(op.type).toBe("note.delete");
    expect(op.payload).toEqual({ id: "note-1" });
  });
});
