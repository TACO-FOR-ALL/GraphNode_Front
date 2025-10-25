// IndexedDb 저장소 위치
// Windows: C:\Users\<User>\AppData\Roaming\<appName>\IndexedDB
// macOS: ~/Library/Application Support/<appName>/IndexedDB
import Dexie, { Table } from "dexie";
import type { ChatMessage, ChatThread, MessageVector } from "../types/Chat";

export class ChatDB extends Dexie {
  threads!: Table<ChatThread, string>;
  messages!: Table<ChatMessage>;
  vectors!: Table<MessageVector>;

  constructor() {
    super("GraphNode_Front_ChatDB");
    this.version(1).stores({
      // 기본키: id / 인덱스: updatedAt, title
      threads: "id, updatedAt, title, messages",
      messages: "id, threadId, ts",
      vectors: "id, threadId, ts,  model",
    });
  }
}

export const db = new ChatDB();
