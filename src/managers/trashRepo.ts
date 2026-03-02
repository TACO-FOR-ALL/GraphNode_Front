import { db } from "@/db/graphnode.db";
import { TrashedNote, TrashedThread } from "@/types/Trash";
import { outboxRepo } from "./outboxRepo";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const trashRepo = {
  async moveNoteToTrash(noteId: string): Promise<TrashedNote | null> {
    const note = await db.notes.get(noteId);
    if (!note) return null;

    const now = Date.now();
    const trashedNote: TrashedNote = {
      id: noteId,
      originalNote: note,
      deletedAt: now,
      expiresAt: now + THIRTY_DAYS_MS,
    };

    await db.transaction("rw", db.notes, db.trashedNotes, async () => {
      await db.notes.delete(noteId);
      await db.trashedNotes.put(trashedNote);
    });

    return trashedNote;
  },

  async moveThreadToTrash(threadId: string): Promise<TrashedThread | null> {
    const thread = await db.threads.get(threadId);
    if (!thread) return null;

    const now = Date.now();
    const trashedThread: TrashedThread = {
      id: threadId,
      originalThread: thread,
      deletedAt: now,
      expiresAt: now + THIRTY_DAYS_MS,
    };

    await db.transaction("rw", db.threads, db.trashedThreads, async () => {
      await db.threads.delete(threadId);
      await db.trashedThreads.put(trashedThread);
    });

    return trashedThread;
  },

  async restoreNote(trashedNoteId: string): Promise<boolean> {
    const trashedNote = await db.trashedNotes.get(trashedNoteId);
    if (!trashedNote) return false;

    await db.transaction("rw", db.notes, db.trashedNotes, async () => {
      await db.notes.put(trashedNote.originalNote);
      await db.trashedNotes.delete(trashedNoteId);
    });

    return true;
  },

  async restoreThread(trashedThreadId: string): Promise<boolean> {
    const trashedThread = await db.trashedThreads.get(trashedThreadId);
    if (!trashedThread) return false;

    await db.transaction("rw", db.threads, db.trashedThreads, async () => {
      await db.threads.put(trashedThread.originalThread);
      await db.trashedThreads.delete(trashedThreadId);
    });

    return true;
  },

  async permanentlyDeleteNote(trashedNoteId: string): Promise<boolean> {
    const trashedNote = await db.trashedNotes.get(trashedNoteId);
    if (!trashedNote) return false;

    await db.transaction("rw", db.trashedNotes, db.outbox, async () => {
      await db.trashedNotes.delete(trashedNoteId);
      await outboxRepo.enqueueNoteDelete(trashedNoteId);
    });

    return true;
  },

  async permanentlyDeleteThread(trashedThreadId: string): Promise<boolean> {
    const trashedThread = await db.trashedThreads.get(trashedThreadId);
    if (!trashedThread) return false;

    await db.transaction("rw", db.trashedThreads, db.outbox, async () => {
      await db.trashedThreads.delete(trashedThreadId);
      await outboxRepo.enqueueThreadDelete(trashedThreadId);
    });

    return true;
  },

  async getTrashedNotes(): Promise<TrashedNote[]> {
    return await db.trashedNotes.orderBy("deletedAt").reverse().toArray();
  },

  async getTrashedThreads(): Promise<TrashedThread[]> {
    return await db.trashedThreads.orderBy("deletedAt").reverse().toArray();
  },

  async emptyTrash(): Promise<void> {
    const trashedNotes = await db.trashedNotes.toArray();
    const trashedThreads = await db.trashedThreads.toArray();

    await db.transaction(
      "rw",
      db.trashedNotes,
      db.trashedThreads,
      db.outbox,
      async () => {
        for (const note of trashedNotes) {
          await outboxRepo.enqueueNoteDelete(note.id);
        }
        await db.trashedNotes.clear();

        for (const thread of trashedThreads) {
          await outboxRepo.enqueueThreadDelete(thread.id);
        }
        await db.trashedThreads.clear();
      },
    );
  },

  async cleanupExpiredItems(): Promise<void> {
    const now = Date.now();

    const expiredNotes = await db.trashedNotes
      .where("expiresAt")
      .below(now)
      .toArray();

    const expiredThreads = await db.trashedThreads
      .where("expiresAt")
      .below(now)
      .toArray();

    if (expiredNotes.length === 0 && expiredThreads.length === 0) {
      return;
    }

    await db.transaction(
      "rw",
      db.trashedNotes,
      db.trashedThreads,
      db.outbox,
      async () => {
        for (const note of expiredNotes) {
          await outboxRepo.enqueueNoteDelete(note.id);
          await db.trashedNotes.delete(note.id);
        }

        for (const thread of expiredThreads) {
          await outboxRepo.enqueueThreadDelete(thread.id);
          await db.trashedThreads.delete(thread.id);
        }
      },
    );
  },
};
