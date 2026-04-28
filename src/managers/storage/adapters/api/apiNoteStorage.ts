import { api } from "@/apiClient";
import type { Note } from "@/types/Note";
import type {
  NoteStorageAdapter,
  CreateNoteRecordInput,
  UpdateNoteRecordInput,
  MoveNoteRecordInput,
} from "../../contracts/noteStorage";

type FolderDto = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};

function toNote(dto: { id: string; title: string; content: string; folderId: string | null; createdAt: string; updatedAt: string }): Note {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt).getTime(),
    updatedAt: new Date(dto.updatedAt).getTime(),
  };
}

async function listAllFolders(): Promise<FolderDto[]> {
  const allFolders = new Map<string, FolderDto>();
  const pendingParents: Array<string | null> = [null];

  while (pendingParents.length > 0) {
    const parentId = pendingParents.shift() ?? null;
    const result = await api.note.listFolders(parentId ?? undefined);
    if (!result.isSuccess) {
      continue;
    }

    for (const folder of result.data) {
      if (allFolders.has(folder.id)) {
        continue;
      }
      allFolders.set(folder.id, folder);
      pendingParents.push(folder.id);
    }
  }

  return Array.from(allFolders.values());
}

async function listAllNotesAcrossFolders(): Promise<Array<{
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}>> {
  const rootResult = await api.note.listNotes();
  if (!rootResult.isSuccess) {
    return [];
  }

  const allNotes = new Map(rootResult.data.map((note) => [note.id, note]));
  const folders = await listAllFolders();

  if (folders.length === 0) {
    return Array.from(allNotes.values());
  }

  const folderResults = await Promise.all(
    folders.map((folder) => api.note.listNotes(folder.id)),
  );

  for (const result of folderResults) {
    if (!result.isSuccess) {
      continue;
    }
    for (const note of result.data) {
      allNotes.set(note.id, note);
    }
  }

  return Array.from(allNotes.values()).sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export const apiNoteStorage: NoteStorageAdapter = {
  async listNotes(): Promise<Note[]> {
    const allNotes = await listAllNotesAcrossFolders();
    return allNotes.map(toNote);
  },

  async getNote(id: string): Promise<Note | null> {
    const result = await api.note.getNote(id);
    if (!result.isSuccess) return null;
    return toNote(result.data);
  },

  async searchNotes(query: string): Promise<Note[]> {
    const allNotes = await listAllNotesAcrossFolders();
    return allNotes
      .filter((dto) => dto.title.includes(query) || dto.content.includes(query))
      .map(toNote);
  },

  async createNoteRecord(input: CreateNoteRecordInput): Promise<Note> {
    const result = await api.note.createNote({
      id: input.id,
      title: input.title,
      content: input.content,
      folderId: input.folderId ?? null,
    });
    if (!result.isSuccess) throw new Error("Failed to create note");
    return toNote(result.data);
  },

  async updateNoteRecord(id: string, input: UpdateNoteRecordInput): Promise<void> {
    await api.note.updateNote(id, {
      title: input.title,
      content: input.content,
    });
  },

  async moveNoteRecord(id: string, input: MoveNoteRecordInput): Promise<void> {
    const noteResult = await api.note.getNote(id);
    if (!noteResult.isSuccess) throw new Error("Note not found");
    const result = await api.note.updateNote(id, {
      title: noteResult.data.title,
      content: noteResult.data.content,
      folderId: input.folderId,
    });
    if (!result.isSuccess) throw new Error(result.error.message);
  },

  async bulkPutNotes(_notes: Note[]): Promise<void> {
    // 웹에서는 서버가 source of truth — 클라이언트 bulk put 불필요
  },

  async bulkDeleteNotes(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => api.note.softDeleteNote(id)));
  },

  async clearNotes(): Promise<void> {
    await api.note.deleteAllNotes();
  },

  async runNoteWriteTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  },
};
