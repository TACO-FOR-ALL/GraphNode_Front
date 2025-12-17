import { db } from "@/db/graphnode.db";
import { Folder } from "@/types/Folder";
import uuid from "@/utils/uuid";

export const folderRepo = {
  async create(name: string, parentId: string | null = null): Promise<Folder> {
    const newFolder: Folder = {
      id: uuid(),
      name,
      parentId,
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
    };

    await db.folders.put(newFolder);
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
    updates: { name?: string; parentId?: string | null }
  ): Promise<Folder | null> {
    const folder = await this.getFolderById(id);
    if (!folder) return null;

    await db.folders.update(id, {
      ...updates,
      updatedAt: new Date(Date.now()),
    });

    return await this.getFolderById(id);
  },

  async deleteFolderById(id: string): Promise<string | null> {
    const folder = await this.getFolderById(id);
    if (!folder) return null;

    // 하위 폴더들도 모두 삭제 (재귀적)
    const childFolders = await this.getFoldersByParentId(id);
    for (const childFolder of childFolders) {
      await this.deleteFolderById(childFolder.id);
    }

    // 폴더 내의 모든 노트를 루트로 이동
    const notes = await db.notes.where("folderId").equals(id).toArray();
    for (const note of notes) {
      await db.notes.update(note.id, { folderId: null });
    }

    await db.folders.delete(id);
    return id;
  },
};
