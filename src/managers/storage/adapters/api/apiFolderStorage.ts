import { api } from "@/apiClient";
import type { Folder, FolderCreate } from "@/types/Folder";
import type {
  FolderStorageAdapter,
  CreateFolderRecordInput,
  UpdateFolderRecordInput,
} from "../../contracts/folderStorage";

function toFolder(dto: {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}): Folder {
  return {
    ...dto,
    createdAt: new Date(dto.createdAt).getTime(),
    updatedAt: new Date(dto.updatedAt).getTime(),
  };
}

export const apiFolderStorage: FolderStorageAdapter = {
  async listFolders(): Promise<Folder[]> {
    const result = await api.note.listFolders();
    if (!result.isSuccess) return [];
    return result.data.map(toFolder);
  },

  async getFolder(id: string): Promise<Folder | null> {
    const result = await api.note.getFolder(id);
    if (!result.isSuccess) return null;
    return toFolder(result.data);
  },

  async getFoldersByParentId(parentId: string | null): Promise<Folder[]> {
    const result = await api.note.listFolders(parentId ?? undefined);
    if (!result.isSuccess) return [];
    return result.data.map(toFolder);
  },

  async createFolderRecord(input: CreateFolderRecordInput): Promise<Folder> {
    const payload: FolderCreate = {
      id: input.id,
      name: input.name,
      parentId: input.parentId,
    };
    const result = await api.note.createFolder(payload);
    if (!result.isSuccess) throw new Error("Failed to create folder");
    return toFolder(result.data);
  },

  async updateFolderRecord(
    id: string,
    input: UpdateFolderRecordInput,
  ): Promise<void> {
    await api.note.updateFolder(id, {
      name: input.name,
      parentId: input.parentId,
    });
  },

  async bulkPutFolders(_folders: Folder[]): Promise<void> {
    // 웹에서는 서버가 source of truth — 클라이언트 bulk put 불필요
  },

  async bulkDeleteFolders(ids: string[]): Promise<void> {
    await Promise.all(ids.map((id) => api.note.softDeleteFolder(id)));
  },

  async clearFolders(): Promise<void> {
    await api.note.deleteAllFolders();
  },

  async runFolderWriteTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return callback();
  },
};
