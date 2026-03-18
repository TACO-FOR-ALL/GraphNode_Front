import type { Note } from "@/types/Note";

export type CreateNoteRecordInput = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type UpdateNoteRecordInput = {
  title: string;
  content: string;
  updatedAt: number;
};

export type MoveNoteRecordInput = {
  folderId: string | null;
  updatedAt: number;
};

export interface NoteStorageAdapter {
  createNoteRecord(input: CreateNoteRecordInput): Promise<Note>;
  listNotes(): Promise<Note[]>;
  getNote(id: string): Promise<Note | null>;
  searchNotes(query: string): Promise<Note[]>;
  updateNoteRecord(id: string, input: UpdateNoteRecordInput): Promise<void>;
  moveNoteRecord(id: string, input: MoveNoteRecordInput): Promise<void>;
  bulkPutNotes(notes: Note[]): Promise<void>;
  bulkDeleteNotes(ids: string[]): Promise<void>;
  clearNotes(): Promise<void>;
  runNoteWriteTransaction<T>(callback: () => Promise<T>): Promise<T>;
}
