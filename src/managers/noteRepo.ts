import { Note } from "@/types/Note";
import extractTitleFromMarkdown from "@/utils/extractTitleFromMarkdown";
import uuid from "@/utils/uuid";
import { outboxRepo } from "./outboxRepo";
import { trashRepo } from "./trashRepo";
import { isElectron } from "@/utils/platform";
import {
  getPreferredNoteReadStorage,
  getPreferredNoteWriteStorage,
} from "./storage/selectors/noteStorageSelector";
import { api } from "@/apiClient";
import { mapFolder } from "@/utils/dtoMappers";

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

    const primaryWriteStorage = await getPreferredNoteWriteStorage();

    await primaryWriteStorage.runNoteWriteTransaction(async () => {
      await primaryWriteStorage.createNoteRecord(newNote);
      if (isElectron()) {
        await outboxRepo.enqueueNoteCreate(newNote.id, {
          id: newNote.id,
          title: newNote.title,
          content: newNote.content,
          folderId: newNote.folderId,
        });
      }
    });

    return newNote;
  },

  async getAllNotes(): Promise<Note[]> {
    return (await getPreferredNoteReadStorage()).listNotes();
  },

  async getNoteById(id: string): Promise<Note | null> {
    return (await getPreferredNoteReadStorage()).getNote(id);
  },

  async getNoteByQuery(query: string): Promise<Note[]> {
    return (await getPreferredNoteReadStorage()).searchNotes(query);
  },

  async updateNoteById(id: string, content: string) {
    const note = await this.getNoteById(id);
    if (!note) return null;

    const title = extractTitleFromMarkdown(content);
    const updatedAt = Date.now();
    const primaryWriteStorage = await getPreferredNoteWriteStorage();

    await primaryWriteStorage.runNoteWriteTransaction(async () => {
      await primaryWriteStorage.updateNoteRecord(id, {
        title,
        content,
        updatedAt,
      });
      if (isElectron()) {
        await outboxRepo.enqueueNoteUpdate(id, { title, content });
      }
    });

    return await this.getNoteById(id);
  },

  async moveNoteToFolder(
    noteId: string,
    folderId: string | null,
  ): Promise<Note | null> {
    const note = await this.getNoteById(noteId);
    if (!note) return null;

    // Electron: folderId가 SQLite에 없으면 서버에서 가져와 저장 (FOREIGN KEY 방지)
    if (folderId && isElectron()) {
      const exists = await window.graphnodeAPI.getSQLiteFolderById(folderId);
      if (!exists) {
        const result = await api.note.getFolder(folderId);
        if (result.isSuccess) {
          await window.graphnodeAPI.upsertSQLiteFolder(mapFolder(result.data));
        }
        // Server 404: folder may be pending outbox sync (just created locally).
        // Proceed — if folder truly missing from SQLite, moveNoteRecord will fail naturally.
      }
    }

    const primaryWriteStorage = await getPreferredNoteWriteStorage();

    await primaryWriteStorage.runNoteWriteTransaction(async () => {
      await primaryWriteStorage.moveNoteRecord(noteId, {
        folderId,
        updatedAt: Date.now(),
      });
      if (isElectron()) {
        await outboxRepo.enqueueNoteMove(noteId, { folderId });
      }
    });

    return await this.getNoteById(noteId);
  },

  async deleteNoteById(id: string): Promise<string | null> {
    const note = await this.getNoteById(id);
    if (!note) return null;

    if (isElectron()) {
      // 휴지통으로 이동 (서버 삭제는 영구 삭제 시에만)
      const trashedNote = await trashRepo.moveNoteToTrash(id);
      if (!trashedNote) return null;
    } else {
      const writeStorage = await getPreferredNoteWriteStorage();
      await writeStorage.bulkDeleteNotes([id]);
    }

    return id;
  },

  async upsertMany(newOnes: Note[]): Promise<void> {
    if (!isElectron()) return;
    await (await getPreferredNoteWriteStorage()).bulkPutNotes(newOnes);
  },

  async deleteMany(ids: string[]): Promise<void> {
    await (await getPreferredNoteWriteStorage()).bulkDeleteNotes(ids);
  },

  async clearAll(): Promise<void> {
    await (await getPreferredNoteWriteStorage()).clearNotes();
  },
};
