import type { Note } from "@/types/Note";
import sortItemByDate from "@/utils/sortItemByDate";
import type {
  CreateNoteRecordInput,
  MoveNoteRecordInput,
  NoteStorageAdapter,
  UpdateNoteRecordInput,
} from "../../contracts/noteStorage";

export const sqliteRendererNoteStorage: NoteStorageAdapter = {
  async createNoteRecord(input: CreateNoteRecordInput): Promise<Note> {
    await window.graphnodeAPI.upsertSQLiteNote(input);
    return input;
  },

  async listNotes(): Promise<Note[]> {
    return window.graphnodeAPI.listSQLiteNotes();
  },

  async getNote(id: string): Promise<Note | null> {
    return window.graphnodeAPI.getSQLiteNoteById(id);
  },

  async searchNotes(query: string): Promise<Note[]> {
    return window.graphnodeAPI.searchSQLiteNotes(query);
  },

  async updateNoteRecord(id: string, input: UpdateNoteRecordInput): Promise<void> {
    const existing = await window.graphnodeAPI.getSQLiteNoteById(id);
    if (!existing) return;

    await window.graphnodeAPI.upsertSQLiteNote({
      ...existing,
      ...input,
    });
  },

  async moveNoteRecord(id: string, input: MoveNoteRecordInput): Promise<void> {
    const existing = await window.graphnodeAPI.getSQLiteNoteById(id);
    if (!existing) return;

    await window.graphnodeAPI.upsertSQLiteNote({
      ...existing,
      folderId: input.folderId,
      updatedAt: input.updatedAt,
    });
  },

  async bulkPutNotes(notes: Note[]): Promise<void> {
    await window.graphnodeAPI.bulkUpsertSQLiteNotes(sortItemByDate(notes));
  },

  async bulkDeleteNotes(ids: string[]): Promise<void> {
    await window.graphnodeAPI.bulkDeleteSQLiteNotes(ids);
  },

  async clearNotes(): Promise<void> {
    await window.graphnodeAPI.clearSQLiteNotes();
  },

  async runNoteWriteTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  },
};
