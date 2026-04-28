import type { Folder } from "@/types/Folder";

const folderStore = new Map<string, Folder>();
const mockEnqueueFolderCreate = jest.fn();
const mockEnqueueFolderUpdate = jest.fn();
const mockMoveFolderToTrash = jest.fn();

jest.mock("@/utils/uuid", () => ({
  __esModule: true,
  default: jest.fn(() => "folder-1"),
}));

jest.mock("@/utils/platform", () => ({
  isElectron: jest.fn(() => true),
}));

jest.mock("../outboxRepo", () => ({
  outboxRepo: {
    enqueueFolderCreate: (...args: unknown[]) => mockEnqueueFolderCreate(...args),
    enqueueFolderUpdate: (...args: unknown[]) => mockEnqueueFolderUpdate(...args),
  },
}));

jest.mock("../trashRepo", () => ({
  trashRepo: {
    moveFolderToTrash: (...args: unknown[]) => mockMoveFolderToTrash(...args),
  },
}));

jest.mock("../storage/selectors/entityStorageSelector", () => {
  const adapter = {
    createFolderRecord: jest.fn(async (input: Folder) => {
      folderStore.set(input.id, input);
      return input;
    }),
    listFolders: jest.fn(async () =>
      Array.from(folderStore.values()).sort((a, b) => b.updatedAt - a.updatedAt),
    ),
    getFolder: jest.fn(async (id: string) => folderStore.get(id) ?? null),
    getFoldersByParentId: jest.fn(async (parentId: string | null) =>
      Array.from(folderStore.values()).filter(
        (folder) => folder.parentId === parentId,
      ),
    ),
    updateFolderRecord: jest.fn(
      async (
        id: string,
        input: { name?: string; parentId?: string | null; updatedAt: number },
      ) => {
        const current = folderStore.get(id);
        if (current) {
          folderStore.set(id, { ...current, ...input });
        }
      },
    ),
    bulkPutFolders: jest.fn(async (folders: Folder[]) => {
      folders.forEach((folder) => folderStore.set(folder.id, folder));
    }),
    bulkDeleteFolders: jest.fn(async (ids: string[]) => {
      ids.forEach((id) => folderStore.delete(id));
    }),
    clearFolders: jest.fn(async () => {
      folderStore.clear();
    }),
    runFolderWriteTransaction: jest.fn(async <T>(callback: () => Promise<T>) =>
      callback(),
    ),
  };

  return {
    getPreferredFolderReadStorage: jest.fn(async () => adapter),
    getPreferredFolderWriteStorage: jest.fn(async () => adapter),
    getPreferredThreadReadStorage: jest.fn(),
    getPreferredThreadWriteStorage: jest.fn(),
  };
});

import { folderRepo } from "../folderRepo";

describe("folderRepo", () => {
  beforeEach(() => {
    folderStore.clear();
    mockEnqueueFolderCreate.mockReset();
    mockEnqueueFolderUpdate.mockReset();
    mockMoveFolderToTrash.mockReset();
    mockMoveFolderToTrash.mockResolvedValue({ id: "folder-1" });
  });

  test("새 폴더를 만들고 outbox create를 적재한다", async () => {
    const folder = await folderRepo.create("Inbox", "parent-1");

    expect(folder).toMatchObject({
      id: "folder-1",
      name: "Inbox",
      parentId: "parent-1",
    });
    expect(mockEnqueueFolderCreate).toHaveBeenCalledWith("folder-1", {
      id: "folder-1",
      name: "Inbox",
      parentId: "parent-1",
    });
  });

  test("parentId 기준으로 하위 폴더를 조회한다", async () => {
    folderStore.set("folder-1", {
      id: "folder-1",
      name: "Parent",
      parentId: null,
      createdAt: 1,
      updatedAt: 1,
    });
    folderStore.set("folder-2", {
      id: "folder-2",
      name: "Child",
      parentId: "folder-1",
      createdAt: 2,
      updatedAt: 2,
    });

    const children = await folderRepo.getFoldersByParentId("folder-1");

    expect(children).toHaveLength(1);
    expect(children[0]?.id).toBe("folder-2");
  });

  test("폴더 업데이트는 storage와 outbox를 함께 갱신한다", async () => {
    folderStore.set("folder-1", {
      id: "folder-1",
      name: "Old",
      parentId: null,
      createdAt: 1,
      updatedAt: 1,
    });

    const updated = await folderRepo.updateFolderById("folder-1", {
      name: "Renamed",
      parentId: "root-2",
    });

    expect(updated).toMatchObject({
      id: "folder-1",
      name: "Renamed",
      parentId: "root-2",
    });
    expect(mockEnqueueFolderUpdate).toHaveBeenCalledWith("folder-1", {
      name: "Renamed",
      parentId: "root-2",
    });
  });

  test("삭제는 trashRepo로 위임한다", async () => {
    folderStore.set("folder-1", {
      id: "folder-1",
      name: "Inbox",
      parentId: null,
      createdAt: 1,
      updatedAt: 1,
    });

    const deletedId = await folderRepo.deleteFolderById("folder-1");

    expect(deletedId).toBe("folder-1");
    expect(mockMoveFolderToTrash).toHaveBeenCalledWith("folder-1");
  });
});
