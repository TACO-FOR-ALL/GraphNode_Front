import { db } from "@/db/graphnode.db";
import { TrashedNote, TrashedThread, TrashedFolder } from "@/types/Trash";
import { api } from "@/apiClient";
import { unwrapResponse } from "@/utils/httpResponse";

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

    // 서버 소프트 삭제 - 실패 시 로컬 롤백
    try {
      unwrapResponse(await api.note.softDeleteNote(noteId));
    } catch (e) {
      await db.transaction("rw", db.notes, db.trashedNotes, async () => {
        await db.trashedNotes.delete(noteId);
        await db.notes.put(note);
      });
      throw e;
    }

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

    // 서버 소프트 삭제 - 실패 시 로컬 롤백
    try {
      unwrapResponse(await api.conversations.softDelete(threadId));
    } catch (e) {
      await db.transaction("rw", db.threads, db.trashedThreads, async () => {
        await db.trashedThreads.delete(threadId);
        await db.threads.put(thread);
      });
      throw e;
    }

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

    unwrapResponse(await api.note.hardDeleteNote(trashedNoteId));
    await db.trashedNotes.delete(trashedNoteId);

    return true;
  },

  async permanentlyDeleteThread(trashedThreadId: string): Promise<boolean> {
    const trashedThread = await db.trashedThreads.get(trashedThreadId);
    if (!trashedThread) return false;

    unwrapResponse(await api.conversations.hardDelete(trashedThreadId));
    await db.trashedThreads.delete(trashedThreadId);

    return true;
  },

  // ── Folder ─────────────────────────────────────────────────────────────

  async moveFolderToTrash(folderId: string): Promise<TrashedFolder | null> {
    const folder = await db.folders.get(folderId);
    if (!folder) return null;

    const now = Date.now();
    const notesInFolder = await db.notes.where("folderId").equals(folderId).toArray();
    const noteIds = notesInFolder.map((n) => n.id);

    const trashedFolder: TrashedFolder = {
      id: folderId,
      originalFolder: folder,
      noteIds,
      deletedAt: now,
      expiresAt: now + THIRTY_DAYS_MS,
    };

    await db.transaction("rw", db.folders, db.notes, db.trashedFolders, async () => {
      for (const noteId of noteIds) {
        await db.notes.update(noteId, { folderId: null });
      }
      await db.folders.delete(folderId);
      await db.trashedFolders.put(trashedFolder);
    });

    // 서버 소프트 삭제 - 실패 시 로컬 롤백
    try {
      unwrapResponse(await api.note.softDeleteFolder(folderId));
    } catch (e) {
      await db.transaction("rw", db.folders, db.notes, db.trashedFolders, async () => {
        await db.trashedFolders.delete(folderId);
        await db.folders.put(folder);
        for (const noteId of noteIds) {
          await db.notes.update(noteId, { folderId });
        }
      });
      throw e;
    }

    return trashedFolder;
  },

  async restoreFolder(trashedFolderId: string): Promise<boolean> {
    const trashedFolder = await db.trashedFolders.get(trashedFolderId);
    if (!trashedFolder) return false;

    await db.transaction("rw", db.folders, db.notes, db.trashedFolders, async () => {
      await db.folders.put(trashedFolder.originalFolder);
      for (const noteId of trashedFolder.noteIds) {
        await db.notes.update(noteId, { folderId: trashedFolderId });
      }
      await db.trashedFolders.delete(trashedFolderId);
    });

    return true;
  },

  async permanentlyDeleteFolder(trashedFolderId: string): Promise<boolean> {
    const trashedFolder = await db.trashedFolders.get(trashedFolderId);
    if (!trashedFolder) return false;

    unwrapResponse(await api.note.hardDeleteFolder(trashedFolderId));
    await db.trashedFolders.delete(trashedFolderId);

    return true;
  },

  async getTrashedFolders(): Promise<TrashedFolder[]> {
    return await db.trashedFolders.orderBy("deletedAt").reverse().toArray();
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
    const trashedFolders = await db.trashedFolders.toArray();

    await Promise.all([
      ...trashedNotes.map((n) =>
        api.note.hardDeleteNote(n.id).then(unwrapResponse),
      ),
      ...trashedThreads.map((t) =>
        api.conversations.hardDelete(t.id).then(unwrapResponse),
      ),
      ...trashedFolders.map((f) =>
        api.note.hardDeleteFolder(f.id).then(unwrapResponse),
      ),
    ]);

    await db.transaction(
      "rw",
      db.trashedNotes,
      db.trashedThreads,
      db.trashedFolders,
      async () => {
        await db.trashedNotes.clear();
        await db.trashedThreads.clear();
        await db.trashedFolders.clear();
      },
    );
  },

  // 백엔드에서는 서버 자체 cron 사용해서 정리 (프론트, 백엔드 분리)
  async cleanupExpiredItems(): Promise<void> {
    const now = Date.now();

    const expiredNotes = await db.trashedNotes.where("expiresAt").below(now).toArray();
    const expiredThreads = await db.trashedThreads.where("expiresAt").below(now).toArray();
    const expiredFolders = await db.trashedFolders.where("expiresAt").below(now).toArray();

    if (
      expiredNotes.length === 0 &&
      expiredThreads.length === 0 &&
      expiredFolders.length === 0
    ) {
      return;
    }

    await db.transaction(
      "rw",
      db.trashedNotes,
      db.trashedThreads,
      db.trashedFolders,
      async () => {
        await db.trashedNotes.bulkDelete(expiredNotes.map((n) => n.id));
        await db.trashedThreads.bulkDelete(expiredThreads.map((t) => t.id));
        await db.trashedFolders.bulkDelete(expiredFolders.map((f) => f.id));
      },
    );
  },
};
