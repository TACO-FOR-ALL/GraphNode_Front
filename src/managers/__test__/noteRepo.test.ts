import type { Note } from "@/types/Note";

const noteStore = new Map<string, Note>();
const mockEnqueueNoteCreate = jest.fn();
const mockEnqueueNoteUpdate = jest.fn();
const mockEnqueueNoteMove = jest.fn();
const mockMoveNoteToTrash = jest.fn();

jest.mock("@/utils/uuid", () => ({
  __esModule: true,
  default: jest.fn(() => "note-1"),
}));

jest.mock("../outboxRepo", () => ({
  outboxRepo: {
    enqueueNoteCreate: (...args: unknown[]) => mockEnqueueNoteCreate(...args),
    enqueueNoteUpdate: (...args: unknown[]) => mockEnqueueNoteUpdate(...args),
    enqueueNoteMove: (...args: unknown[]) => mockEnqueueNoteMove(...args),
  },
}));

jest.mock("../trashRepo", () => ({
  trashRepo: {
    moveNoteToTrash: (...args: unknown[]) => mockMoveNoteToTrash(...args),
  },
}));

jest.mock("../storage/selectors/noteStorageSelector", () => {
  const createAdapter = () => ({
    createNoteRecord: jest.fn(async (input: Note) => {
      noteStore.set(input.id, input);
      return input;
    }),
    listNotes: jest.fn(async () =>
      Array.from(noteStore.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    ),
    getNote: jest.fn(async (id: string) => noteStore.get(id) ?? null),
    searchNotes: jest.fn(async (query: string) => {
      const lowered = query.toLowerCase();
      return Array.from(noteStore.values()).filter(
        (note) =>
          note.title.toLowerCase().includes(lowered) ||
          note.content.toLowerCase().includes(lowered),
      );
    }),
    updateNoteRecord: jest.fn(
      async (
        id: string,
        input: { title: string; content: string; updatedAt: number },
      ) => {
        const current = noteStore.get(id);
        if (current) {
          noteStore.set(id, { ...current, ...input });
        }
      },
    ),
    moveNoteRecord: jest.fn(
      async (
        id: string,
        input: { folderId: string | null; updatedAt: number },
      ) => {
        const current = noteStore.get(id);
        if (current) {
          noteStore.set(id, { ...current, ...input });
        }
      },
    ),
    bulkPutNotes: jest.fn(async (notes: Note[]) => {
      notes.forEach((note) => noteStore.set(note.id, note));
    }),
    bulkDeleteNotes: jest.fn(async (ids: string[]) => {
      ids.forEach((id) => noteStore.delete(id));
    }),
    clearNotes: jest.fn(async () => {
      noteStore.clear();
    }),
    runNoteWriteTransaction: jest.fn(async <T>(callback: () => Promise<T>) =>
      callback(),
    ),
  });

  const adapter = createAdapter();

  return {
    getPreferredNoteReadStorage: jest.fn(async () => adapter),
    getPreferredNoteWriteStorage: jest.fn(async () => adapter),
    resetNoteStorageSelection: jest.fn(),
  };
});

import { noteRepo } from "../noteRepo";

describe("noteRepo", () => {
  beforeEach(() => {
    noteStore.clear();
    mockEnqueueNoteCreate.mockReset();
    mockEnqueueNoteUpdate.mockReset();
    mockEnqueueNoteMove.mockReset();
    mockMoveNoteToTrash.mockReset();
    mockMoveNoteToTrash.mockResolvedValue({ id: "note-1" });
  });

  test("새 노트를 생성하고 outbox create를 적재한다", async () => {
    const note = await noteRepo.create("# Test Note\nBody", "folder-1");

    expect(note.id).toBe("note-1");
    expect(note.title).toBe("Test Note");
    expect(note.folderId).toBe("folder-1");
    expect(noteStore.get("note-1")).toEqual(note);
    expect(mockEnqueueNoteCreate).toHaveBeenCalledWith("note-1", {
      id: "note-1",
      title: "Test Note",
      content: "# Test Note\nBody",
      folderId: "folder-1",
    });
  });

  test("노트를 수정하고 최신 내용으로 다시 조회한다", async () => {
    noteStore.set("note-1", {
      id: "note-1",
      title: "Old",
      content: "# Old",
      folderId: null,
      createdAt: 1,
      updatedAt: 1,
    });

    const updated = await noteRepo.updateNoteById("note-1", "# New Title\nNext");

    expect(updated).toMatchObject({
      id: "note-1",
      title: "New Title",
      content: "# New Title\nNext",
    });
    expect(mockEnqueueNoteUpdate).toHaveBeenCalledWith("note-1", {
      title: "New Title",
      content: "# New Title\nNext",
    });
  });

  test("노트를 폴더로 이동한다", async () => {
    noteStore.set("note-1", {
      id: "note-1",
      title: "Title",
      content: "# Title",
      folderId: null,
      createdAt: 1,
      updatedAt: 1,
    });

    const moved = await noteRepo.moveNoteToFolder("note-1", "folder-2");

    expect(moved?.folderId).toBe("folder-2");
    expect(mockEnqueueNoteMove).toHaveBeenCalledWith("note-1", {
      folderId: "folder-2",
    });
  });

  test("검색은 현재 storage adapter를 통해 수행한다", async () => {
    noteStore.set("note-1", {
      id: "note-1",
      title: "Alpha",
      content: "hello world",
      folderId: null,
      createdAt: 1,
      updatedAt: 1,
    });
    noteStore.set("note-2", {
      id: "note-2",
      title: "Beta",
      content: "different",
      folderId: null,
      createdAt: 2,
      updatedAt: 2,
    });

    const results = await noteRepo.getNoteByQuery("hello");

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("note-1");
  });

  test("삭제는 trashRepo로 위임한다", async () => {
    noteStore.set("note-1", {
      id: "note-1",
      title: "Title",
      content: "# Title",
      folderId: null,
      createdAt: 1,
      updatedAt: 1,
    });

    const deletedId = await noteRepo.deleteNoteById("note-1");

    expect(deletedId).toBe("note-1");
    expect(mockMoveNoteToTrash).toHaveBeenCalledWith("note-1");
  });
});
