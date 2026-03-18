import type { Folder } from "@/types/Folder";
import sortItemByDate from "@/utils/sortItemByDate";
import type {
  CreateFolderRecordInput,
  FolderStorageAdapter,
  UpdateFolderRecordInput,
} from "../../contracts/folderStorage";

export const sqliteRendererFolderStorage: FolderStorageAdapter = {
  async createFolderRecord(input: CreateFolderRecordInput): Promise<Folder> {
    await window.graphnodeAPI.upsertSQLiteFolder(input);
    return input;
  },
  async listFolders(): Promise<Folder[]> {
    return window.graphnodeAPI.listSQLiteFolders();
  },
  async getFolder(id: string): Promise<Folder | null> {
    return window.graphnodeAPI.getSQLiteFolderById(id);
  },
  async getFoldersByParentId(parentId: string | null): Promise<Folder[]> {
    return window.graphnodeAPI.getSQLiteFoldersByParentId(parentId);
  },
  async updateFolderRecord(id: string, input: UpdateFolderRecordInput): Promise<void> {
    const existing = await window.graphnodeAPI.getSQLiteFolderById(id);
    if (!existing) return;
    await window.graphnodeAPI.upsertSQLiteFolder({ ...existing, ...input });
  },
  async bulkPutFolders(folders: Folder[]): Promise<void> {
    await window.graphnodeAPI.bulkUpsertSQLiteFolders(sortItemByDate(folders));
  },
  async bulkDeleteFolders(ids: string[]): Promise<void> {
    await window.graphnodeAPI.bulkDeleteSQLiteFolders(ids);
  },
  async clearFolders(): Promise<void> {
    await window.graphnodeAPI.clearSQLiteFolders();
  },
  async runFolderWriteTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  },
};
