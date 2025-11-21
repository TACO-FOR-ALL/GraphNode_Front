// IndexedDb 저장소 위치
// Windows: C:\Users\<User>\AppData\Roaming\<appName>\IndexedDB
// macOS: ~/Library/Application Support/<appName>/IndexedDB
import Dexie, { Table } from "dexie";
import type { ChatThread } from "../types/Chat";
import { Note } from "@/types/Note";

export class ChatDB extends Dexie {
  // Table<T, K> T: 테이블 타입, K: 기본키 타입 (T.id의 타입)
  threads!: Table<ChatThread, string>;
  notes!: Table<Note, string>;

  constructor() {
    super("GraphNode_Front_ChatDB");
    this.version(1).stores({
      // 기본키: id (각 레코드를 고유하게 식별) / 인덱스: updatedAt, title... (인덱스: 특정 필드로 빠르게 검색 / 정렬)
      threads: "id, updatedAt, title, messages",
      notes: "id, title, content, createdAt, updatedAt",
    });

    // 인덱스 추가 시 version(n) 증가
    // this.version(n + 1).stores({
    //   threads: "id, updatedAt, title, messages, add here...",
    //   notes: "id, content, createdAt, updatedAt, add here...",
    // });
  }
}

export const db = new ChatDB();
