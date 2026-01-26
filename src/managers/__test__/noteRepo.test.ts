import { noteRepo } from "../noteRepo";

// DB 모킹
const mockNotes = new Map<string, any>();
const mockOutbox = new Map<string, any>();

jest.mock("@/db/graphnode.db", () => ({
  db: {
    notes: {
      put: jest.fn((note: any) => {
        mockNotes.set(note.id, note);
        return Promise.resolve(note.id);
      }),
      get: jest.fn((id: string) => Promise.resolve(mockNotes.get(id))),
      toArray: jest.fn(() => Promise.resolve(Array.from(mockNotes.values()))),
      filter: jest.fn(() => ({
        toArray: jest.fn(() => Promise.resolve(Array.from(mockNotes.values()))),
      })),
      update: jest.fn((id: string, updates: any) => {
        const note = mockNotes.get(id);
        if (note) {
          mockNotes.set(id, { ...note, ...updates });
          return Promise.resolve(1);
        }
        return Promise.resolve(0);
      }),
      delete: jest.fn((id: string) => {
        mockNotes.delete(id);
        return Promise.resolve();
      }),
      bulkPut: jest.fn((notes: any[]) => {
        notes.forEach((n) => mockNotes.set(n.id, n));
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        mockNotes.clear();
        return Promise.resolve();
      }),
    },
    outbox: {
      put: jest.fn((op: any) => {
        mockOutbox.set(op.opId, op);
        return Promise.resolve(op.opId);
      }),
      where: jest.fn((criteria: any) => {
        if (typeof criteria === "string") {
          return {
            equals: jest.fn(() => ({
              toArray: jest.fn(() => Promise.resolve([])),
              first: jest.fn(() => Promise.resolve(undefined)),
            })),
          };
        }
        // Object criteria: { entityId, type, status }
        return {
          first: jest.fn(() => Promise.resolve(undefined)),
          toArray: jest.fn(() => Promise.resolve([])),
        };
      }),
      update: jest.fn(() => Promise.resolve(1)),
      bulkDelete: jest.fn(() => Promise.resolve()),
    },
    transaction: jest.fn(async (...args: any[]) => {
      // Dexie transaction: (mode, tables..., callback)
      const callback = args[args.length - 1];
      if (typeof callback === "function") {
        return await callback();
      }
    }),
  },
}));

// uuid 모킹
jest.mock("@/utils/uuid", () => ({
  __esModule: true,
  default: jest.fn(() => `mock-uuid-${Date.now()}-${Math.random()}`),
}));

describe("noteRepo", () => {
  beforeEach(() => {
    mockNotes.clear();
    mockOutbox.clear();
    jest.clearAllMocks();
  });

  describe("create", () => {
    test("새 노트 생성", async () => {
      const note = await noteRepo.create("# Test Note\nContent here");

      expect(note).toBeDefined();
      expect(note.title).toBe("Test Note");
      expect(note.content).toBe("# Test Note\nContent here");
      expect(note.folderId).toBeNull();
      expect(note.createdAt).toBeDefined();
      expect(note.updatedAt).toBeDefined();
    });

    test("folderId 지정하여 생성", async () => {
      const note = await noteRepo.create("# Note", "folder-123");

      expect(note.folderId).toBe("folder-123");
    });

    test("빈 content로 생성 시 Untitled", async () => {
      const note = await noteRepo.create("");

      expect(note.title).toBe("Untitled");
    });
  });

  describe("getNoteById", () => {
    test("존재하는 노트 조회", async () => {
      const created = await noteRepo.create("# Test");
      mockNotes.set(created.id, created);

      const found = await noteRepo.getNoteById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    test("존재하지 않는 노트 → null", async () => {
      const found = await noteRepo.getNoteById("non-existent");

      expect(found).toBeNull();
    });
  });

  describe("getAllNotes", () => {
    test("모든 노트 조회", async () => {
      await noteRepo.create("# Note 1");
      await noteRepo.create("# Note 2");

      const notes = await noteRepo.getAllNotes();

      expect(notes.length).toBeGreaterThanOrEqual(2);
    });

    test("빈 목록", async () => {
      const notes = await noteRepo.getAllNotes();

      expect(notes).toEqual([]);
    });
  });

  describe("updateNoteById", () => {
    test("노트 업데이트", async () => {
      const created = await noteRepo.create("# Original");
      mockNotes.set(created.id, created);

      const updated = await noteRepo.updateNoteById(
        created.id,
        "# Updated Title\nNew content",
      );

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe("Updated Title");
    });

    test("존재하지 않는 노트 업데이트 → null", async () => {
      const result = await noteRepo.updateNoteById("non-existent", "# Test");

      expect(result).toBeNull();
    });

    test("업데이트 시 updatedAt 갱신", async () => {
      const created = await noteRepo.create("# Test");
      mockNotes.set(created.id, created);
      const originalUpdatedAt = created.updatedAt;

      // 시간 차이를 위해 잠시 대기
      await new Promise((r) => setTimeout(r, 10));

      await noteRepo.updateNoteById(created.id, "# Updated");
      const updatedNote = mockNotes.get(created.id);

      expect(updatedNote.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });

  describe("moveNoteToFolder", () => {
    test("노트를 다른 폴더로 이동", async () => {
      const created = await noteRepo.create("# Test", null);
      mockNotes.set(created.id, created);

      const moved = await noteRepo.moveNoteToFolder(created.id, "new-folder");

      expect(moved).not.toBeNull();
      const updatedNote = mockNotes.get(created.id);
      expect(updatedNote.folderId).toBe("new-folder");
    });

    test("노트를 루트로 이동 (folderId = null)", async () => {
      const created = await noteRepo.create("# Test", "some-folder");
      mockNotes.set(created.id, created);

      const moved = await noteRepo.moveNoteToFolder(created.id, null);

      expect(moved).not.toBeNull();
    });

    test("존재하지 않는 노트 이동 → null", async () => {
      const result = await noteRepo.moveNoteToFolder(
        "non-existent",
        "folder-id",
      );

      expect(result).toBeNull();
    });
  });

  describe("deleteNoteById", () => {
    test("노트 삭제", async () => {
      const created = await noteRepo.create("# Test");
      mockNotes.set(created.id, created);

      const deletedId = await noteRepo.deleteNoteById(created.id);

      expect(deletedId).toBe(created.id);
    });

    test("존재하지 않는 노트 삭제 → null", async () => {
      const result = await noteRepo.deleteNoteById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("upsertMany", () => {
    test("여러 노트 일괄 삽입", async () => {
      const baseTime = Date.now();
      const notes = [
        {
          id: "n1",
          title: "Note 1",
          content: "Content 1",
          folderId: null,
          createdAt: baseTime,
          updatedAt: baseTime,
        },
        {
          id: "n2",
          title: "Note 2",
          content: "Content 2",
          folderId: null,
          createdAt: baseTime,
          updatedAt: baseTime + 1000,
        },
      ];

      await noteRepo.upsertMany(notes);

      expect(mockNotes.size).toBe(2);
    });
  });

  describe("clearAll", () => {
    test("모든 노트 삭제", async () => {
      await noteRepo.create("# Note 1");
      await noteRepo.create("# Note 2");

      await noteRepo.clearAll();

      expect(mockNotes.size).toBe(0);
    });
  });
});
