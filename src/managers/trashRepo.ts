import { api } from "@/apiClient";
import type { TrashedFolder, TrashedNote, TrashedThread } from "@/types/Trash";
import { unwrapResponse } from "@/utils/httpResponse";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function requireGraphNodeAPI() {
  if (!window.graphnodeAPI) {
    throw new Error("graphnodeAPI is not available");
  }

  return window.graphnodeAPI;
}

export const trashRepo = {
  async moveNoteToTrash(noteId: string): Promise<TrashedNote | null> {
    const note = await requireGraphNodeAPI().getSQLiteNoteById(noteId);
    if (!note) return null;

    const now = Date.now();
    const trashedNote: TrashedNote = {
      id: noteId,
      originalNote: note,
      deletedAt: now,
      expiresAt: now + THIRTY_DAYS_MS,
    };

    await requireGraphNodeAPI().bulkDeleteSQLiteNotes([noteId]);
    await requireGraphNodeAPI().upsertSQLiteTrashedNote(trashedNote);

    try {
      unwrapResponse(await api.note.softDeleteNote(noteId));
    } catch (error) {
      await requireGraphNodeAPI().deleteSQLiteTrashedNote(noteId);
      await requireGraphNodeAPI().upsertSQLiteNote(note);
      throw error;
    }

    return trashedNote;
  },

  async moveThreadToTrash(threadId: string): Promise<TrashedThread | null> {
    const thread = await requireGraphNodeAPI().getSQLiteThreadById(threadId);
    if (!thread) return null;

    const now = Date.now();
    const trashedThread: TrashedThread = {
      id: threadId,
      originalThread: thread,
      deletedAt: now,
      expiresAt: now + THIRTY_DAYS_MS,
    };

    await requireGraphNodeAPI().bulkDeleteSQLiteThreads([threadId]);
    await requireGraphNodeAPI().upsertSQLiteTrashedThread(trashedThread);

    try {
      unwrapResponse(await api.conversations.softDelete(threadId));
    } catch (error) {
      await requireGraphNodeAPI().deleteSQLiteTrashedThread(threadId);
      await requireGraphNodeAPI().upsertSQLiteThread(thread);
      throw error;
    }

    return trashedThread;
  },

  async restoreNote(trashedNoteId: string): Promise<boolean> {
    const trashedNote =
      await requireGraphNodeAPI().getSQLiteTrashedNoteById(trashedNoteId);
    if (!trashedNote) return false;

    await requireGraphNodeAPI().upsertSQLiteNote(trashedNote.originalNote);
    await requireGraphNodeAPI().deleteSQLiteTrashedNote(trashedNoteId);
    return true;
  },

  async restoreThread(trashedThreadId: string): Promise<boolean> {
    const trashedThread =
      await requireGraphNodeAPI().getSQLiteTrashedThreadById(trashedThreadId);
    if (!trashedThread) return false;

    await requireGraphNodeAPI().upsertSQLiteThread(trashedThread.originalThread);
    await requireGraphNodeAPI().deleteSQLiteTrashedThread(trashedThreadId);
    return true;
  },

  async permanentlyDeleteNote(trashedNoteId: string): Promise<boolean> {
    const trashedNote =
      await requireGraphNodeAPI().getSQLiteTrashedNoteById(trashedNoteId);
    if (!trashedNote) return false;

    unwrapResponse(await api.note.hardDeleteNote(trashedNoteId));
    await requireGraphNodeAPI().deleteSQLiteTrashedNote(trashedNoteId);
    return true;
  },

  async permanentlyDeleteThread(trashedThreadId: string): Promise<boolean> {
    const trashedThread =
      await requireGraphNodeAPI().getSQLiteTrashedThreadById(trashedThreadId);
    if (!trashedThread) return false;

    unwrapResponse(await api.conversations.hardDelete(trashedThreadId));
    await requireGraphNodeAPI().deleteSQLiteTrashedThread(trashedThreadId);
    return true;
  },

  async moveFolderToTrash(folderId: string): Promise<TrashedFolder | null> {
    const folder = await requireGraphNodeAPI().getSQLiteFolderById(folderId);
    if (!folder) return null;

    const now = Date.now();
    const notes = await requireGraphNodeAPI().listSQLiteNotes();
    const notesInFolder = notes.filter((note) => note.folderId === folderId);
    const noteIds = notesInFolder.map((note) => note.id);

    const trashedFolder: TrashedFolder = {
      id: folderId,
      originalFolder: folder,
      noteIds,
      deletedAt: now,
      expiresAt: now + THIRTY_DAYS_MS,
    };

    if (notesInFolder.length > 0) {
      await requireGraphNodeAPI().bulkUpsertSQLiteNotes(
        notesInFolder.map((note) => ({
          ...note,
          folderId: null,
        })),
      );
    }
    await requireGraphNodeAPI().bulkDeleteSQLiteFolders([folderId]);
    await requireGraphNodeAPI().upsertSQLiteTrashedFolder(trashedFolder);

    try {
      unwrapResponse(await api.note.softDeleteFolder(folderId));
    } catch (error) {
      await requireGraphNodeAPI().deleteSQLiteTrashedFolder(folderId);
      await requireGraphNodeAPI().upsertSQLiteFolder(folder);
      if (notesInFolder.length > 0) {
        await requireGraphNodeAPI().bulkUpsertSQLiteNotes(
          notesInFolder.map((note) => ({
            ...note,
            folderId,
          })),
        );
      }
      throw error;
    }

    return trashedFolder;
  },

  async restoreFolder(trashedFolderId: string): Promise<boolean> {
    const trashedFolder =
      await requireGraphNodeAPI().getSQLiteTrashedFolderById(trashedFolderId);
    if (!trashedFolder) return false;

    await requireGraphNodeAPI().upsertSQLiteFolder(trashedFolder.originalFolder);

    const notes = await requireGraphNodeAPI().listSQLiteNotes();
    const notesToRestore = notes.filter((note) =>
      trashedFolder.noteIds.includes(note.id),
    );
    if (notesToRestore.length > 0) {
      await requireGraphNodeAPI().bulkUpsertSQLiteNotes(
        notesToRestore.map((note) => ({
          ...note,
          folderId: trashedFolderId,
        })),
      );
    }

    await requireGraphNodeAPI().deleteSQLiteTrashedFolder(trashedFolderId);
    return true;
  },

  async permanentlyDeleteFolder(trashedFolderId: string): Promise<boolean> {
    const trashedFolder =
      await requireGraphNodeAPI().getSQLiteTrashedFolderById(trashedFolderId);
    if (!trashedFolder) return false;

    unwrapResponse(await api.note.hardDeleteFolder(trashedFolderId));
    await requireGraphNodeAPI().deleteSQLiteTrashedFolder(trashedFolderId);
    return true;
  },

  async getTrashedFolders(): Promise<TrashedFolder[]> {
    return requireGraphNodeAPI().listSQLiteTrashedFolders();
  },

  async getTrashedNotes(): Promise<TrashedNote[]> {
    return requireGraphNodeAPI().listSQLiteTrashedNotes();
  },

  async getTrashedThreads(): Promise<TrashedThread[]> {
    return requireGraphNodeAPI().listSQLiteTrashedThreads();
  },

  async emptyTrash(): Promise<void> {
    const [trashedNotes, trashedThreads, trashedFolders] = await Promise.all([
      requireGraphNodeAPI().listSQLiteTrashedNotes(),
      requireGraphNodeAPI().listSQLiteTrashedThreads(),
      requireGraphNodeAPI().listSQLiteTrashedFolders(),
    ]);

    await Promise.all([
      ...trashedNotes.map((note) =>
        api.note.hardDeleteNote(note.id).then(unwrapResponse),
      ),
      ...trashedThreads.map((thread) =>
        api.conversations.hardDelete(thread.id).then(unwrapResponse),
      ),
      ...trashedFolders.map((folder) =>
        api.note.hardDeleteFolder(folder.id).then(unwrapResponse),
      ),
    ]);

    await requireGraphNodeAPI().clearSQLiteTrash();
  },

  async clearNotesAndFoldersTrash(): Promise<void> {
    const [trashedNotes, trashedFolders] = await Promise.all([
      requireGraphNodeAPI().listSQLiteTrashedNotes(),
      requireGraphNodeAPI().listSQLiteTrashedFolders(),
    ]);

    await Promise.all([
      ...trashedNotes.map((note) =>
        requireGraphNodeAPI().deleteSQLiteTrashedNote(note.id),
      ),
      ...trashedFolders.map((folder) =>
        requireGraphNodeAPI().deleteSQLiteTrashedFolder(folder.id),
      ),
    ]);
  },

  async clearThreadsTrash(): Promise<void> {
    const trashedThreads = await requireGraphNodeAPI().listSQLiteTrashedThreads();

    await Promise.all(
      trashedThreads.map((thread) =>
        requireGraphNodeAPI().deleteSQLiteTrashedThread(thread.id),
      ),
    );
  },

  async cleanupExpiredItems(): Promise<void> {
    await requireGraphNodeAPI().bulkDeleteExpiredSQLiteTrash(Date.now());
  },
};
