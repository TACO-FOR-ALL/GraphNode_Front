import { Note } from "./Note";
import { ChatThread } from "./Chat";
import { Folder } from "./Folder";

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

export type TrashedFolder = {
  id: string;
  originalFolder: Folder;
  noteIds: string[]; // 폴더에 있던 노트 ID 목록 (롤백용)
  deletedAt: number;
  expiresAt: number; // deletedAt + 30일
};
