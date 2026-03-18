import { db } from "@/legacy/indexeddb/graphnode.db";
import type { Note } from "@/types/Note";
import sortItemByDate from "@/utils/sortItemByDate";
import type {
  CreateNoteRecordInput,
  MoveNoteRecordInput,
  NoteStorageAdapter,
  UpdateNoteRecordInput,
} from "@/managers/storage/contracts/noteStorage";

export const dexieNoteStorage: NoteStorageAdapter = {
  async createNoteRecord(input: CreateNoteRecordInput): Promise<Note> {
    await db.notes.put(input);
    return input;
  },

  async listNotes(): Promise<Note[]> {
    return db.notes.toArray();
  },

  async getNote(id: string): Promise<Note | null> {
    return (await db.notes.get(id)) ?? null;
  },

  async searchNotes(query: string): Promise<Note[]> {
    return db.notes
      .filter((note) => note.content.toLowerCase().includes(query.toLowerCase()))
      .toArray();
  },

  async updateNoteRecord(id: string, input: UpdateNoteRecordInput): Promise<void> {
    await db.notes.update(id, input);
  },

  async moveNoteRecord(id: string, input: MoveNoteRecordInput): Promise<void> {
    await db.notes.update(id, input);
  },

  async bulkPutNotes(notes: Note[]): Promise<void> {
    await db.notes.bulkPut(sortItemByDate(notes));
  },

  async bulkDeleteNotes(ids: string[]): Promise<void> {
    await db.notes.bulkDelete(ids);
  },

  async clearNotes(): Promise<void> {
    await db.notes.clear();
  },

  async runNoteWriteTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return db.transaction("rw", db.notes, db.outbox, callback);
  },
};
