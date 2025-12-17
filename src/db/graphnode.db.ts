// IndexedDb 저장소 위치
// Windows: C:\Users\<User>\AppData\Roaming\<appName>\IndexedDB
// macOS: ~/Library/Application Support/<appName>/IndexedDB
import Dexie, { Table } from "dexie";
import type { ChatThread } from "../types/Chat";
import { Note } from "@/types/Note";
import { Folder } from "@/types/Folder";
import { OutboxOp } from "@/types/Outbox";

export class ChatDB extends Dexie {
  // Table<T, K> T: 테이블 타입, K: 기본키 타입 (T.id의 타입)
  threads!: Table<ChatThread, string>;
  notes!: Table<Note, string>;
  folders!: Table<Folder, string>;
  outbox!: Table<OutboxOp, string>;

  constructor() {
    super("GraphNode_Front_ChatDB");
    this.version(1).stores({
      // 기본키: id (각 레코드를 고유하게 식별) / 인덱스: updatedAt, title... (인덱스: 특정 필드로 빠르게 검색 / 정렬)
      threads: "id, updatedAt, title, messages",
      notes: "id, title, content, createdAt, updatedAt",
    });

    // 폴더 기능 추가를 위한 버전 업그레이드
    this.version(2).stores({
      threads: "id, updatedAt, title, messages",
      notes: "id, title, content, createdAt, updatedAt, folderId",
      folders: "id, name, parentId, createdAt, updatedAt",
    });

    // 아웃박스 패턴 추가를 위한 버전 업데이트
    this.version(3).stores({
      threads: "id, updatedAt, title, messages",
      notes: "id, title, content, createdAt, updatedAt, folderId",
      folders: "id, name, parentId, createdAt, updatedAt",
      outbox: "opId, entityId, type, status, createdAt, [status+nextRetryAt]",
    });
  }
}

export const db = new ChatDB();
