import { Folder } from "@/types/Folder";
import uuid from "@/utils/uuid";
import { outboxRepo } from "./outboxRepo";
import { trashRepo } from "./trashRepo";
import { isElectron } from "@/utils/platform";
import {
  getPreferredFolderReadStorage,
  getPreferredFolderWriteStorage,
} from "./storage/selectors/entityStorageSelector";

export const folderRepo = {
  async create(name: string, parentId: string | null = null): Promise<Folder> {
    const newFolder: Folder = {
      id: uuid(),
      name,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const writeStorage = await getPreferredFolderWriteStorage();
    await writeStorage.runFolderWriteTransaction(async () => {
      await writeStorage.createFolderRecord(newFolder);
      if (isElectron()) {
        await outboxRepo.enqueueFolderCreate(newFolder.id, {
          id: newFolder.id,
          name,
          parentId,
        });
      }
    });

    return newFolder;
  },

  async getFolderList(): Promise<Folder[]> {
    const rows = await (await getPreferredFolderReadStorage()).listFolders();
    return rows ?? [];
  },

  async getFolderById(id: string): Promise<Folder | null> {
    return (await getPreferredFolderReadStorage()).getFolder(id);
  },

  async getFoldersByParentId(parentId: string | null): Promise<Folder[]> {
    if (parentId === null) {
      return (await getPreferredFolderReadStorage()).getFoldersByParentId(null);
    }
    return (await getPreferredFolderReadStorage()).getFoldersByParentId(parentId);
  },

  async updateFolderById(
    id: string,
    updates: { name?: string; parentId?: string | null },
  ): Promise<Folder | null> {
    const folder = await this.getFolderById(id);
    if (!folder) return null;

    const updatedAt = Date.now();
    const writeStorage = await getPreferredFolderWriteStorage();
    await writeStorage.runFolderWriteTransaction(async () => {
      await writeStorage.updateFolderRecord(id, { ...updates, updatedAt });
      if (isElectron()) {
        await outboxRepo.enqueueFolderUpdate(id, updates);
      }
    });

    return await this.getFolderById(id);
  },

  async deleteFolderById(id: string): Promise<string | null> {
    const folder = await this.getFolderById(id);
    if (!folder) return null;

    // 하위 폴더들도 모두 재귀적으로 휴지통으로 이동
    const childFolders = await this.getFoldersByParentId(id);
    for (const childFolder of childFolders) {
      await this.deleteFolderById(childFolder.id);
    }

    if (isElectron()) {
      // 휴지통으로 이동 (노트 루트 이동 + 서버 소프트 삭제 포함)
      const trashed = await trashRepo.moveFolderToTrash(id);
      if (!trashed) return null;
    } else {
      const writeStorage = await getPreferredFolderWriteStorage();
      await writeStorage.bulkDeleteFolders([id]);
    }

    return id;
  },

  async upsertMany(folders: Folder[]): Promise<void> {
    await (await getPreferredFolderWriteStorage()).bulkPutFolders(folders);
  },

  async deleteMany(ids: string[]): Promise<void> {
    await (await getPreferredFolderWriteStorage()).bulkDeleteFolders(ids);
  },

  async clearAll(): Promise<void> {
    await (await getPreferredFolderWriteStorage()).clearFolders();
  },
};
