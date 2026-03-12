import { db } from "@/db/graphnode.db";
import { Folder } from "@/types/Folder";
import uuid from "@/utils/uuid";
import { outboxRepo } from "./outboxRepo";
import { trashRepo } from "./trashRepo";

export const folderRepo = {
  async create(name: string, parentId: string | null = null): Promise<Folder> {
    const newFolder: Folder = {
      id: uuid(),
      name,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.transaction("rw", db.folders, db.outbox, async () => {
      await db.folders.put(newFolder);
      await outboxRepo.enqueueFolderCreate(newFolder.id, { name, parentId });
    });

    return newFolder;
  },

  async getFolderList(): Promise<Folder[]> {
    const rows = await db.folders.orderBy("updatedAt").reverse().toArray();
    return rows ?? [];
  },

  async getFolderById(id: string): Promise<Folder | null> {
    return (await db.folders.get(id)) ?? null;
  },

  async getFoldersByParentId(parentId: string | null): Promise<Folder[]> {
    if (parentId === null) {
      return await db.folders
        .filter((folder) => folder.parentId === null)
        .toArray();
    }
    return await db.folders.where("parentId").equals(parentId).toArray();
  },

  async updateFolderById(
    id: string,
    updates: { name?: string; parentId?: string | null },
  ): Promise<Folder | null> {
    const folder = await this.getFolderById(id);
    if (!folder) return null;

    await db.transaction("rw", db.folders, db.outbox, async () => {
      await db.folders.update(id, { ...updates, updatedAt: Date.now() });
      await outboxRepo.enqueueFolderUpdate(id, updates);
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

    // 휴지통으로 이동 (노트 루트 이동 + 서버 소프트 삭제 포함)
    const trashed = await trashRepo.moveFolderToTrash(id);
    if (!trashed) return null;

    return id;
  },
};
