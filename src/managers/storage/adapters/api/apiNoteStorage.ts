import { api } from "@/apiClient";
import type { Note } from "@/types/Note";
import type {
  NoteStorageAdapter,
  CreateNoteRecordInput,
  UpdateNoteRecordInput,
  MoveNoteRecordInput,
} from "../../contracts/noteStorage";

function toNote(dto: { id: string; title: string; content: string; folderId: string | null; createdAt: string; updatedAt: string }): Note {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt).getTime(),
    updatedAt: new Date(dto.updatedAt).getTime(),
  };
}

export const apiNoteStorage: NoteStorageAdapter = {
  async listNotes(): Promise<Note[]> {
    const result = await api.note.listNotes();
    if (!result.isSuccess) return [];
    return result.data.map(toNote);
  },

  async getNote(id: string): Promise<Note | null> {
    const result = await api.note.getNote(id);
    if (!result.isSuccess) return null;
    return toNote(result.data);
  },

  async searchNotes(query: string): Promise<Note[]> {
    const result = await api.note.listNotes();
    if (!result.isSuccess) return [];
    return result.data
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
    await api.note.updateNote(id, { folderId: input.folderId });
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
