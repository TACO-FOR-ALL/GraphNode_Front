import type { Folder } from "@/types/Folder";

export type CreateFolderRecordInput = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type UpdateFolderRecordInput = {
  name?: string;
  parentId?: string | null;
  updatedAt: number;
};

export interface FolderStorageAdapter {
  createFolderRecord(input: CreateFolderRecordInput): Promise<Folder>;
  listFolders(): Promise<Folder[]>;
  getFolder(id: string): Promise<Folder | null>;
  getFoldersByParentId(parentId: string | null): Promise<Folder[]>;
  updateFolderRecord(id: string, input: UpdateFolderRecordInput): Promise<void>;
  bulkPutFolders(folders: Folder[]): Promise<void>;
  bulkDeleteFolders(ids: string[]): Promise<void>;
  clearFolders(): Promise<void>;
  runFolderWriteTransaction<T>(callback: () => Promise<T>): Promise<T>;
}
