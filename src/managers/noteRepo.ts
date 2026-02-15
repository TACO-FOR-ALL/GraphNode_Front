import { db } from "@/db/graphnode.db";
import { Note } from "@/types/Note";
import extractTitleFromMarkdown from "@/utils/extractTitleFromMarkdown";
import uuid from "@/utils/uuid";
import { outboxRepo } from "./outboxRepo";
import sortItemByDate from "@/utils/sortItemByDate";
import i18n from "@/i18n";
import { getDefaultNoteContent } from "@/constants/defaultNotes";

export const noteRepo = {
  async create(content: string, folderId: string | null = null): Promise<Note> {
    const newNote: Note = {
      id: uuid(),
      title: extractTitleFromMarkdown(content),
      content,
      folderId,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    };

    // transaction 안에서 실행되는 DB 작업은 전부 성공 또는 전부 실패 (rw = read write, 접근할 테이블 목록 전부 명시)
    await db.transaction("rw", db.notes, db.outbox, async () => {
      await db.notes.put(newNote);

      await outboxRepo.enqueueNoteCreate(newNote.id, {
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
        folderId: newNote.folderId,
      });
    });

    return newNote;
  },

  async getAllNotes(): Promise<Note[]> {
    return await db.notes.toArray();
  },

  async getNoteById(id: string): Promise<Note | null> {
    return (await db.notes.get(id)) ?? null;
  },

  async getNoteByQuery(query: string): Promise<Note[]> {
    return await db.notes
      .filter((note) =>
        note.content.toLowerCase().includes(query.toLowerCase()),
      )
      .toArray();
  },

  async updateNoteById(id: string, content: string) {
    const note = await this.getNoteById(id);
    if (!note) return null;

    const title = extractTitleFromMarkdown(content);
    const updatedAt = Date.now();

    await db.transaction("rw", db.notes, db.outbox, async () => {
      await db.notes.update(id, {
        title: title,
        content,
        updatedAt: updatedAt,
      });

      await outboxRepo.enqueueNoteUpdate(id, {
        title: title,
        content: content,
      });
    });

    return await this.getNoteById(id);
  },

  async moveNoteToFolder(
    noteId: string,
    folderId: string | null,
  ): Promise<Note | null> {
    const note = await this.getNoteById(noteId);
    if (!note) return null;

    await db.transaction("rw", db.notes, db.outbox, async () => {
      await db.notes.update(noteId, {
        folderId,
        updatedAt: Date.now(),
      });

      await outboxRepo.enqueueNoteMove(noteId, {
        folderId: folderId,
      });
    });

    return await this.getNoteById(noteId);
  },

  async deleteNoteById(id: string): Promise<string | null> {
    const note = await this.getNoteById(id);
    if (!note) return null;

    await db.transaction("rw", db.notes, db.outbox, async () => {
      await db.notes.delete(id);
      await outboxRepo.enqueueNoteDelete(id);
    });

    return id;
  },

  async initializeDefaultNote(): Promise<Note | null> {
    const notes = await this.getAllNotes();
    if (notes.length > 0) return null;

    // 현재 설정된 언어에 맞는 기본 노트 내용 가져오기
    const currentLanguage = i18n.language || "en";
    const defaultContent = getDefaultNoteContent(currentLanguage);

    return await this.create(defaultContent);
  },

  async upsertMany(newOnes: Note[]): Promise<void> {
    const sorted = sortItemByDate(newOnes);
    await db.notes.bulkPut(sorted);
  },

  async clearAll(): Promise<void> {
    await db.notes.clear();
  },
};
