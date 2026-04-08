import { trashRepo } from "../trashRepo";

jest.mock("@/apiClient", () => ({
  api: {
    note: {
      getNote: jest.fn(async (id: string) => ({
        isSuccess: notes.has(id),
        data: notes.get(id),
      })),
      getFolder: jest.fn(async () => ({ isSuccess: false, data: undefined })),
      listNotes: jest.fn(async () => ({ isSuccess: true, data: [] })),
      softDeleteNote: jest.fn(async () => ({ isSuccess: true, data: undefined })),
      restoreNote: jest.fn(async () => ({ isSuccess: true, data: undefined })),
      hardDeleteNote: jest.fn(async () => ({ isSuccess: true, data: undefined })),
      softDeleteFolder: jest.fn(async () => ({ isSuccess: true, data: undefined })),
      restoreFolder: jest.fn(async () => ({ isSuccess: true, data: undefined })),
      hardDeleteFolder: jest.fn(async () => ({ isSuccess: true, data: undefined })),
      listTrash: jest.fn(async () => ({
        isSuccess: true,
        data: { notes: [], folders: [] },
      })),
    },
    conversations: {
      get: jest.fn(async () => ({ isSuccess: false, data: undefined })),
      softDelete: jest.fn(async () => ({ isSuccess: true, data: undefined })),
      restore: jest.fn(async () => ({ isSuccess: true, data: undefined })),
      hardDelete: jest.fn(async () => ({ isSuccess: true, data: undefined })),
      listTrash: jest.fn(async () => ({ isSuccess: true, data: [] })),
    },
  },
}));

const notes = new Map<string, any>();
const trashedNotes = new Map<string, any>();

function installGraphNodeMock() {
  Object.defineProperty(window, "windowAPI", {
    configurable: true,
    value: {},
  });

  Object.defineProperty(window, "graphnodeAPI", {
    configurable: true,
    value: {
      getSQLiteNoteById: jest.fn(async (id: string) => notes.get(id) ?? null),
      bulkDeleteSQLiteNotes: jest.fn(async (ids: string[]) => {
        ids.forEach((id) => notes.delete(id));
        return { ok: true, count: ids.length };
      }),
      upsertSQLiteNote: jest.fn(async (note: any) => {
        notes.set(note.id, note);
        return { ok: true, note };
      }),
      upsertSQLiteTrashedNote: jest.fn(async (trashedNote: any) => {
        trashedNotes.set(trashedNote.id, trashedNote);
        return { ok: true };
      }),
      getSQLiteTrashedNoteById: jest.fn(
        async (id: string) => trashedNotes.get(id) ?? null,
      ),
      deleteSQLiteTrashedNote: jest.fn(async (id: string) => {
        trashedNotes.delete(id);
        return { ok: true };
      }),
      listSQLiteTrashedNotes: jest.fn(async () => Array.from(trashedNotes.values())),
      listSQLiteTrashedThreads: jest.fn(async () => []),
      listSQLiteTrashedFolders: jest.fn(async () => []),
      clearSQLiteTrash: jest.fn(async () => {
        trashedNotes.clear();
        return { ok: true };
      }),
      bulkDeleteExpiredSQLiteTrash: jest.fn(async () => ({ ok: true })),
      getSQLiteThreadById: jest.fn(async () => null),
      bulkDeleteSQLiteThreads: jest.fn(async () => ({ ok: true, count: 0 })),
      upsertSQLiteThread: jest.fn(async () => ({ ok: true })),
      upsertSQLiteTrashedThread: jest.fn(async () => ({ ok: true })),
      getSQLiteTrashedThreadById: jest.fn(async () => null),
      deleteSQLiteTrashedThread: jest.fn(async () => ({ ok: true })),
      getSQLiteFolderById: jest.fn(async () => null),
      listSQLiteNotes: jest.fn(async () => Array.from(notes.values())),
      bulkUpsertSQLiteNotes: jest.fn(async () => ({ ok: true, count: 0 })),
      bulkDeleteSQLiteFolders: jest.fn(async () => ({ ok: true, count: 0 })),
      upsertSQLiteFolder: jest.fn(async () => ({ ok: true })),
      upsertSQLiteTrashedFolder: jest.fn(async () => ({ ok: true })),
      getSQLiteTrashedFolderById: jest.fn(async () => null),
      deleteSQLiteTrashedFolder: jest.fn(async () => ({ ok: true })),
    },
  });
}

describe("trashRepo SQLite", () => {
  beforeEach(() => {
    notes.clear();
    trashedNotes.clear();
    installGraphNodeMock();
    jest.clearAllMocks();
  });

  test("moveNoteToTrash moves a live note into SQLite trash", async () => {
    notes.set("note-1", {
      id: "note-1",
      title: "Title",
      content: "Body",
      folderId: null,
      createdAt: 1,
      updatedAt: 2,
    });

    const result = await trashRepo.moveNoteToTrash("note-1");

    expect(result?.id).toBe("note-1");
    expect(notes.has("note-1")).toBe(false);
    expect(trashedNotes.has("note-1")).toBe(true);
  });

  test("restoreNote moves a trashed note back into SQLite notes", async () => {
    trashedNotes.set("note-1", {
      id: "note-1",
      originalNote: {
        id: "note-1",
        title: "Restored",
        content: "Body",
        folderId: null,
        createdAt: 1,
        updatedAt: 2,
      },
      deletedAt: 100,
      expiresAt: 200,
    });

    const restored = await trashRepo.restoreNote("note-1");

    expect(restored).toBe(true);
    expect(notes.get("note-1")?.title).toBe("Restored");
    expect(trashedNotes.has("note-1")).toBe(false);
  });

  test("cleanupExpiredItems delegates expiration cleanup to SQLite", async () => {
    await trashRepo.cleanupExpiredItems();

    expect(window.graphnodeAPI.bulkDeleteExpiredSQLiteTrash).toHaveBeenCalled();
  });

  test("moveNoteToTrash uses API only on web", async () => {
    Object.defineProperty(window, "windowAPI", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "graphnodeAPI", {
      configurable: true,
      value: undefined,
    });

    notes.set("note-web", {
      id: "note-web",
      title: "Web title",
      content: "Web body",
      folderId: null,
      createdAt: "2026-04-08T00:00:00.000Z",
      updatedAt: "2026-04-08T00:00:00.000Z",
    });

    const result = await trashRepo.moveNoteToTrash("note-web");

    expect(result?.id).toBe("note-web");
    expect(result?.originalNote.title).toBe("Web title");
  });
});
