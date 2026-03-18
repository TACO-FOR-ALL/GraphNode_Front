import { db } from "@/legacy/indexeddb/graphnode.db";
import type { Folder } from "@/types/Folder";
import sortItemByDate from "@/utils/sortItemByDate";
import type {
  CreateFolderRecordInput,
  FolderStorageAdapter,
  UpdateFolderRecordInput,
} from "@/managers/storage/contracts/folderStorage";

export const dexieFolderStorage: FolderStorageAdapter = {
  async createFolderRecord(input: CreateFolderRecordInput): Promise<Folder> {
    await db.folders.put(input);
    return input;
  },
  async listFolders(): Promise<Folder[]> {
    return db.folders.orderBy("updatedAt").reverse().toArray();
  },
  async getFolder(id: string): Promise<Folder | null> {
    return (await db.folders.get(id)) ?? null;
  },
  async getFoldersByParentId(parentId: string | null): Promise<Folder[]> {
    if (parentId === null) {
      return db.folders.filter((folder) => folder.parentId === null).toArray();
    }
    return db.folders.where("parentId").equals(parentId).toArray();
  },
  async updateFolderRecord(id: string, input: UpdateFolderRecordInput): Promise<void> {
    await db.folders.update(id, input);
  },
  async bulkPutFolders(folders: Folder[]): Promise<void> {
    await db.folders.bulkPut(sortItemByDate(folders));
  },
  async bulkDeleteFolders(ids: string[]): Promise<void> {
    await db.folders.bulkDelete(ids);
  },
  async clearFolders(): Promise<void> {
    await db.folders.clear();
  },
  async runFolderWriteTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return db.transaction("rw", db.folders, db.outbox, callback);
  },
};
