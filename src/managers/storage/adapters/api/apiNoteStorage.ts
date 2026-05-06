import { api } from "@/apiClient";
import type { Note } from "@/types/Note";
import type {
  NoteStorageAdapter,
  CreateNoteRecordInput,
  UpdateNoteRecordInput,
  MoveNoteRecordInput,
} from "../../contracts/noteStorage";

function toNote(dto: {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}): Note {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt).getTime(),
    updatedAt: new Date(dto.updatedAt).getTime(),
  };
}

async function fetchAllNotes(): Promise<Note[]> {
  const folderResult = await api.note.listFolders(undefined);
  const allFolderIds: Array<string | null> = [null];

  if (folderResult.isSuccess) {
    const pendingParents: Array<string | null> = [null];
    const seen = new Set<string>();
    while (pendingParents.length > 0) {
      const parentId = pendingParents.shift()!;
      const result = await api.note.listFolders(parentId ?? undefined);
      if (!result.isSuccess) continue;
      for (const folder of result.data) {
        if (seen.has(folder.id)) continue;
        seen.add(folder.id);
        allFolderIds.push(folder.id);
        pendingParents.push(folder.id);
      }
    }
  }

  const noteResults = await Promise.all(
    allFolderIds.map((folderId) => api.note.listNotes(folderId ?? undefined)),
  );

  const allNotes = new Map<string, Note>();
  for (const result of noteResults) {
    if (!result.isSuccess) continue;
    for (const dto of result.data) {
      allNotes.set(dto.id, toNote(dto));
    }
  }

  return Array.from(allNotes.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const apiNoteStorage: NoteStorageAdapter = {
  async listNotes(): Promise<Note[]> {
    return fetchAllNotes();
  },

  async listNotesByFolder(folderId: string | null): Promise<Note[]> {
    const result = await api.note.listNotes(folderId ?? undefined);
    if (!result.isSuccess) return [];
    return result.data.map(toNote);
  },

  async getNote(id: string): Promise<Note | null> {
    const result = await api.note.getNote(id);
    if (!result.isSuccess) return null;
    return toNote(result.data);
  },

  async searchNotes(query: string): Promise<Note[]> {
    const allNotes = await fetchAllNotes();
    return allNotes.filter(
      (note) => note.title.includes(query) || note.content.includes(query),
    );
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

  async updateNoteRecord(
    id: string,
    input: UpdateNoteRecordInput,
  ): Promise<void> {
    await api.note.updateNote(id, {
      title: input.title,
      content: input.content,
    });
  },

  async moveNoteRecord(id: string, input: MoveNoteRecordInput): Promise<void> {
    const result = await api.note.updateNote(id, {
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
