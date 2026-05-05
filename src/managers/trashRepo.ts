import { api } from "@/apiClient";
import type { TrashedFolder, TrashedNote, TrashedThread } from "@/types/Trash";
import { unwrapResponse } from "@/utils/httpResponse";
import { isElectron } from "@/utils/platform";
import { mapNote, mapFolder, mapConversation } from "@/utils/dtoMappers";
import { outboxRepo } from "./outboxRepo";
import type {
  NoteDto,
  FolderDto,
  ConversationDto,
} from "@taco_tsinghua/graphnode-sdk";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function requireGraphNodeAPI() {
  if (!window.graphnodeAPI) {
    throw new Error("graphnodeAPI is not available");
  }

  return window.graphnodeAPI;
}

// ── API response → Trash 래퍼 변환 (내부 객체 매핑은 dtoMappers 위임) ────────

function toTrashedThread(dto: ConversationDto & { deletedAt?: string | null }): TrashedThread {
  const deletedAt = dto.deletedAt ? new Date(dto.deletedAt).getTime() : Date.now();
  return {
    id: dto.id,
    originalThread: mapConversation(dto),
    deletedAt,
    expiresAt: deletedAt + THIRTY_DAYS_MS,
  };
}

function toTrashedNote(dto: NoteDto & { deletedAt?: string | null }): TrashedNote {
  const deletedAt = dto.deletedAt ? new Date(dto.deletedAt).getTime() : Date.now();
  return {
    id: dto.id,
    originalNote: mapNote(dto),
    deletedAt,
    expiresAt: deletedAt + THIRTY_DAYS_MS,
  };
}

function toTrashedFolder(dto: FolderDto & { deletedAt?: string | null }): TrashedFolder {
  const deletedAt = dto.deletedAt ? new Date(dto.deletedAt).getTime() : Date.now();
  return {
    id: dto.id,
    originalFolder: mapFolder(dto),
    noteIds: [],
    deletedAt,
    expiresAt: deletedAt + THIRTY_DAYS_MS,
  };
}

// ── Repo ──────────────────────────────────────────────────────────────────────

export const trashRepo = {
  async moveNoteToTrash(noteId: string): Promise<TrashedNote | null> {
    if (!isElectron()) {
      const result = await api.note.getNote(noteId);
      if (!result.isSuccess) return null;

      const trashedNote = toTrashedNote(result.data);
      unwrapResponse(await api.note.softDeleteNote(noteId));
      return trashedNote;
    }

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

    const deleteResult = await api.note.softDeleteNote(noteId);
    if (!deleteResult.isSuccess) {
      if (deleteResult.error?.statusCode === 404) {
        // 노트가 서버에 없음 (note.create가 아직 sync 안 됨) → 로컬 삭제 유지, pending outbox 취소
        await outboxRepo.cancelEntityOps(noteId);
        return trashedNote;
      }
      await requireGraphNodeAPI().deleteSQLiteTrashedNote(noteId);
      await requireGraphNodeAPI().upsertSQLiteNote(note);
      throw new Error(deleteResult.error?.message ?? "softDeleteNote failed");
    }

    return trashedNote;
  },

  async moveThreadToTrash(threadId: string): Promise<TrashedThread | null> {
    if (!isElectron()) {
      const result = await api.conversations.get(threadId);
      if (!result.isSuccess) return null;

      const trashedThread = toTrashedThread(result.data);
      unwrapResponse(await api.conversations.softDelete(threadId));
      return trashedThread;
    }

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
    if (isElectron()) {
      const trashedNote =
        await requireGraphNodeAPI().getSQLiteTrashedNoteById(trashedNoteId);
      if (!trashedNote) return false;

      await requireGraphNodeAPI().upsertSQLiteNote(trashedNote.originalNote);
      await requireGraphNodeAPI().deleteSQLiteTrashedNote(trashedNoteId);
      return true;
    }

    const result = await api.note.restoreNote(trashedNoteId);
    return result.isSuccess;
  },

  async restoreThread(trashedThreadId: string): Promise<boolean> {
    if (isElectron()) {
      const trashedThread =
        await requireGraphNodeAPI().getSQLiteTrashedThreadById(trashedThreadId);
      if (!trashedThread) return false;

      await requireGraphNodeAPI().upsertSQLiteThread(
        trashedThread.originalThread,
      );
      await requireGraphNodeAPI().deleteSQLiteTrashedThread(trashedThreadId);
      return true;
    }

    const result = await api.conversations.restore(trashedThreadId);
    return result.isSuccess;
  },

  async permanentlyDeleteNote(trashedNoteId: string): Promise<boolean> {
    if (isElectron()) {
      const trashedNote =
        await requireGraphNodeAPI().getSQLiteTrashedNoteById(trashedNoteId);
      if (!trashedNote) return false;

      unwrapResponse(await api.note.hardDeleteNote(trashedNoteId));
      await requireGraphNodeAPI().deleteSQLiteTrashedNote(trashedNoteId);
      return true;
    }

    const result = await api.note.hardDeleteNote(trashedNoteId);
    return result.isSuccess;
  },

  async permanentlyDeleteThread(trashedThreadId: string): Promise<boolean> {
    if (isElectron()) {
      const trashedThread =
        await requireGraphNodeAPI().getSQLiteTrashedThreadById(trashedThreadId);
      if (!trashedThread) return false;

      unwrapResponse(await api.conversations.hardDelete(trashedThreadId));
      await requireGraphNodeAPI().deleteSQLiteTrashedThread(trashedThreadId);
      return true;
    }

    const result = await api.conversations.hardDelete(trashedThreadId);
    return result.isSuccess;
  },

  async moveFolderToTrash(folderId: string): Promise<TrashedFolder | null> {
    if (!isElectron()) {
      const [folderResult, notesResult] = await Promise.all([
        api.note.getFolder(folderId),
        api.note.listNotes(),
      ]);
      if (!folderResult.isSuccess) return null;

      const trashedFolder = {
        ...toTrashedFolder(folderResult.data),
        noteIds: notesResult.isSuccess
          ? notesResult.data
              .filter((note) => note.folderId === folderId)
              .map((note) => note.id)
          : [],
      };

      unwrapResponse(await api.note.softDeleteFolder(folderId));
      return trashedFolder;
    }

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

    // 노트를 루트로 이동하는 대신 휴지통으로 이동
    if (notesInFolder.length > 0) {
      await requireGraphNodeAPI().bulkDeleteSQLiteNotes(noteIds);
      for (const note of notesInFolder) {
        await requireGraphNodeAPI().upsertSQLiteTrashedNote({
          id: note.id,
          originalNote: note,
          deletedAt: now,
          expiresAt: now + THIRTY_DAYS_MS,
        });
      }
    }
    await requireGraphNodeAPI().bulkDeleteSQLiteFolders([folderId]);
    await requireGraphNodeAPI().upsertSQLiteTrashedFolder(trashedFolder);

    const deleteFolderResult = await api.note.softDeleteFolder(folderId);
    if (!deleteFolderResult.isSuccess) {
      // 롤백: 폴더와 노트 복원
      await requireGraphNodeAPI().deleteSQLiteTrashedFolder(folderId);
      await requireGraphNodeAPI().upsertSQLiteFolder(folder);
      if (notesInFolder.length > 0) {
        await requireGraphNodeAPI().bulkUpsertSQLiteNotes(notesInFolder);
        for (const noteId of noteIds) {
          await requireGraphNodeAPI().deleteSQLiteTrashedNote(noteId);
        }
      }
      throw new Error(deleteFolderResult.error?.message ?? "softDeleteFolder failed");
    }

    // 노트 서버 소프트 딜리트 (폴더 삭제 확정 후, 개별 처리)
    for (const note of notesInFolder) {
      const noteResult = await api.note.softDeleteNote(note.id);
      if (!noteResult.isSuccess) {
        if (noteResult.error?.statusCode === 404) {
          // 서버에 없는 노트 — pending outbox ops 취소
          await outboxRepo.cancelEntityOps(note.id);
        }
        // 다른 오류는 로컬 상태가 정확하므로 계속 진행
      }
    }

    return trashedFolder;
  },

  async restoreFolder(trashedFolderId: string): Promise<boolean> {
    if (isElectron()) {
      const trashedFolder =
        await requireGraphNodeAPI().getSQLiteTrashedFolderById(trashedFolderId);
      if (!trashedFolder) return false;

      await requireGraphNodeAPI().upsertSQLiteFolder(
        trashedFolder.originalFolder,
      );

      // 노트들을 활성 목록이 아닌 휴지통에서 복원
      if (trashedFolder.noteIds.length > 0) {
        const allTrashedNotes = await requireGraphNodeAPI().listSQLiteTrashedNotes();
        const notesToRestore = allTrashedNotes.filter((tn) =>
          trashedFolder.noteIds.includes(tn.id),
        );
        if (notesToRestore.length > 0) {
          await requireGraphNodeAPI().bulkUpsertSQLiteNotes(
            notesToRestore.map((tn) => ({
              ...tn.originalNote,
              folderId: trashedFolderId,
            })),
          );
          for (const tn of notesToRestore) {
            await requireGraphNodeAPI().deleteSQLiteTrashedNote(tn.id);
          }
        }
      }

      await requireGraphNodeAPI().deleteSQLiteTrashedFolder(trashedFolderId);

      // 서버에도 폴더(+노트) 복원
      await api.note.restoreFolder(trashedFolderId);

      return true;
    }

    const result = await api.note.restoreFolder(trashedFolderId);
    return result.isSuccess;
  },

  async permanentlyDeleteFolder(trashedFolderId: string): Promise<boolean> {
    if (isElectron()) {
      const trashedFolder =
        await requireGraphNodeAPI().getSQLiteTrashedFolderById(trashedFolderId);
      if (!trashedFolder) return false;

      unwrapResponse(await api.note.hardDeleteFolder(trashedFolderId));
      await requireGraphNodeAPI().deleteSQLiteTrashedFolder(trashedFolderId);
      return true;
    }

    const result = await api.note.hardDeleteFolder(trashedFolderId);
    return result.isSuccess;
  },

  async getTrashedFolders(): Promise<TrashedFolder[]> {
    if (isElectron()) {
      return requireGraphNodeAPI().listSQLiteTrashedFolders();
    }

    const result = await api.note.listTrash();
    if (!result.isSuccess) return [];
    return result.data.folders.map(toTrashedFolder);
  },

  async getTrashedNotes(): Promise<TrashedNote[]> {
    if (isElectron()) {
      return requireGraphNodeAPI().listSQLiteTrashedNotes();
    }

    const result = await api.note.listTrash();
    if (!result.isSuccess) return [];
    return result.data.notes.map(toTrashedNote);
  },

  async getTrashedThreads(): Promise<TrashedThread[]> {
    if (isElectron()) {
      return requireGraphNodeAPI().listSQLiteTrashedThreads();
    }

    const result = await api.conversations.listTrash();
    if (!result.isSuccess) return [];
    return result.data.map(toTrashedThread);
  },

  async emptyTrash(): Promise<void> {
    if (isElectron()) {
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
      return;
    }

    // Web: fetch all trash items, then hard delete each
    const [noteTrash, threadTrash] = await Promise.all([
      api.note.listTrash(),
      api.conversations.listTrash(),
    ]);

    const deleteOps: Promise<unknown>[] = [];

    if (noteTrash.isSuccess) {
      for (const note of noteTrash.data.notes) {
        deleteOps.push(api.note.hardDeleteNote(note.id));
      }
      for (const folder of noteTrash.data.folders) {
        deleteOps.push(api.note.hardDeleteFolder(folder.id));
      }
    }

    if (threadTrash.isSuccess) {
      for (const thread of threadTrash.data) {
        deleteOps.push(api.conversations.hardDelete(thread.id));
      }
    }

    await Promise.all(deleteOps);
  },

  async clearNotesAndFoldersTrash(): Promise<void> {
    if (!isElectron()) return;

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
    if (!isElectron()) return;

    const trashedThreads =
      await requireGraphNodeAPI().listSQLiteTrashedThreads();

    await Promise.all(
      trashedThreads.map((thread) =>
        requireGraphNodeAPI().deleteSQLiteTrashedThread(thread.id),
      ),
    );
  },

  async cleanupExpiredItems(): Promise<void> {
    if (!isElectron()) return;
    await requireGraphNodeAPI().bulkDeleteExpiredSQLiteTrash(Date.now());
  },
};
