import { Note } from "./Note";
import { ChatThread } from "./Chat";

export type TrashedNote = {
  id: string;
  originalNote: Note;
  deletedAt: number;
  expiresAt: number; // deletedAt + 30일
};

export type TrashedThread = {
  id: string;
  originalThread: ChatThread;
  deletedAt: number;
  expiresAt: number; // deletedAt + 30일
};
