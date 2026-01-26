import { folderRepo } from "../folderRepo";

// DB 모킹
const mockFolders = new Map<string, any>();
const mockNotes = new Map<string, any>();

jest.mock("@/db/graphnode.db", () => ({
  db: {
    folders: {
      put: jest.fn((folder: any) => {
        mockFolders.set(folder.id, folder);
        return Promise.resolve(folder.id);
      }),
      get: jest.fn((id: string) => Promise.resolve(mockFolders.get(id))),
      orderBy: jest.fn(() => ({
        reverse: jest.fn(() => ({
          toArray: jest.fn(() =>
            Promise.resolve(
              Array.from(mockFolders.values()).sort(
                (a, b) => b.updatedAt - a.updatedAt,
              ),
            ),
          ),
        })),
      })),
      filter: jest.fn((predicate: (folder: any) => boolean) => ({
        toArray: jest.fn(() =>
          Promise.resolve(
            Array.from(mockFolders.values()).filter(predicate),
          ),
        ),
      })),
      where: jest.fn((field: string) => ({
        equals: jest.fn((value: any) => ({
          toArray: jest.fn(() =>
            Promise.resolve(
              Array.from(mockFolders.values()).filter(
                (f) => f[field] === value,
              ),
            ),
          ),
        })),
      })),
      update: jest.fn((id: string, updates: any) => {
        const folder = mockFolders.get(id);
        if (folder) {
          mockFolders.set(id, { ...folder, ...updates });
          return Promise.resolve(1);
        }
        return Promise.resolve(0);
      }),
      delete: jest.fn((id: string) => {
        mockFolders.delete(id);
        return Promise.resolve();
      }),
    },
    notes: {
      where: jest.fn((field: string) => ({
        equals: jest.fn((value: any) => ({
          toArray: jest.fn(() =>
            Promise.resolve(
              Array.from(mockNotes.values()).filter(
                (n) => n[field] === value,
              ),
            ),
          ),
        })),
      })),
      update: jest.fn((id: string, updates: any) => {
        const note = mockNotes.get(id);
        if (note) {
          mockNotes.set(id, { ...note, ...updates });
          return Promise.resolve(1);
        }
        return Promise.resolve(0);
      }),
    },
  },
}));

// uuid 모킹
jest.mock("@/utils/uuid", () => ({
  __esModule: true,
  default: jest.fn(() => `mock-folder-${Date.now()}-${Math.random()}`),
}));

describe("folderRepo", () => {
  beforeEach(() => {
    mockFolders.clear();
    mockNotes.clear();
    jest.clearAllMocks();
  });

  describe("create", () => {
    test("새 폴더 생성", async () => {
      const folder = await folderRepo.create("My Folder");

      expect(folder).toBeDefined();
      expect(folder.name).toBe("My Folder");
      expect(folder.parentId).toBeNull();
      expect(folder.createdAt).toBeDefined();
      expect(folder.updatedAt).toBeDefined();
    });

    test("하위 폴더 생성", async () => {
      const parent = await folderRepo.create("Parent");
      const child = await folderRepo.create("Child", parent.id);

      expect(child.parentId).toBe(parent.id);
    });
  });

  describe("getFolderList", () => {
    test("모든 폴더 조회 (updatedAt 역순)", async () => {
      const baseTime = Date.now();

      const folder1 = {
        id: "f1",
        name: "Folder 1",
        parentId: null,
        createdAt: baseTime,
        updatedAt: baseTime,
      };
      const folder2 = {
        id: "f2",
        name: "Folder 2",
        parentId: null,
        createdAt: baseTime,
        updatedAt: baseTime + 1000,
      };

      mockFolders.set("f1", folder1);
      mockFolders.set("f2", folder2);

      const folders = await folderRepo.getFolderList();

      expect(folders).toHaveLength(2);
      expect(folders[0].id).toBe("f2"); // 최신이 먼저
    });

    test("빈 목록", async () => {
      const folders = await folderRepo.getFolderList();

      expect(folders).toEqual([]);
    });
  });

  describe("getFolderById", () => {
    test("존재하는 폴더 조회", async () => {
      const created = await folderRepo.create("Test Folder");
      mockFolders.set(created.id, created);

      const found = await folderRepo.getFolderById(created.id);

      expect(found).not.toBeNull();
      expect(found!.name).toBe("Test Folder");
    });

    test("존재하지 않는 폴더 → null", async () => {
      const found = await folderRepo.getFolderById("non-existent");

      expect(found).toBeNull();
    });
  });

  describe("getFoldersByParentId", () => {
    test("루트 폴더 조회 (parentId === null)", async () => {
      const root1 = {
        id: "r1",
        name: "Root 1",
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const root2 = {
        id: "r2",
        name: "Root 2",
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const child = {
        id: "c1",
        name: "Child",
        parentId: "r1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockFolders.set("r1", root1);
      mockFolders.set("r2", root2);
      mockFolders.set("c1", child);

      const rootFolders = await folderRepo.getFoldersByParentId(null);

      expect(rootFolders).toHaveLength(2);
    });

    test("자식 폴더 조회", async () => {
      const parent = {
        id: "p1",
        name: "Parent",
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const child1 = {
        id: "c1",
        name: "Child 1",
        parentId: "p1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const child2 = {
        id: "c2",
        name: "Child 2",
        parentId: "p1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockFolders.set("p1", parent);
      mockFolders.set("c1", child1);
      mockFolders.set("c2", child2);

      const children = await folderRepo.getFoldersByParentId("p1");

      expect(children).toHaveLength(2);
    });
  });

  describe("updateFolderById", () => {
    test("폴더 이름 변경", async () => {
      const folder = {
        id: "f1",
        name: "Original",
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockFolders.set("f1", folder);

      const updated = await folderRepo.updateFolderById("f1", {
        name: "Updated",
      });

      expect(updated).not.toBeNull();
      expect(mockFolders.get("f1").name).toBe("Updated");
    });

    test("폴더 이동 (parentId 변경)", async () => {
      const folder = {
        id: "f1",
        name: "Folder",
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockFolders.set("f1", folder);

      await folderRepo.updateFolderById("f1", { parentId: "new-parent" });

      expect(mockFolders.get("f1").parentId).toBe("new-parent");
    });

    test("존재하지 않는 폴더 업데이트 → null", async () => {
      const result = await folderRepo.updateFolderById("non-existent", {
        name: "Test",
      });

      expect(result).toBeNull();
    });

    test("업데이트 시 updatedAt 갱신", async () => {
      const baseTime = Date.now() - 10000;
      const folder = {
        id: "f1",
        name: "Folder",
        parentId: null,
        createdAt: baseTime,
        updatedAt: baseTime,
      };
      mockFolders.set("f1", folder);

      await folderRepo.updateFolderById("f1", { name: "Updated" });

      expect(mockFolders.get("f1").updatedAt).toBeGreaterThan(baseTime);
    });
  });

  describe("deleteFolderById", () => {
    test("빈 폴더 삭제", async () => {
      const folder = {
        id: "f1",
        name: "Empty Folder",
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockFolders.set("f1", folder);

      const deletedId = await folderRepo.deleteFolderById("f1");

      expect(deletedId).toBe("f1");
      expect(mockFolders.has("f1")).toBe(false);
    });

    test("존재하지 않는 폴더 삭제 → null", async () => {
      const result = await folderRepo.deleteFolderById("non-existent");

      expect(result).toBeNull();
    });

    test("폴더 삭제 시 하위 폴더도 재귀적으로 삭제", async () => {
      const parent = {
        id: "p1",
        name: "Parent",
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const child = {
        id: "c1",
        name: "Child",
        parentId: "p1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const grandchild = {
        id: "g1",
        name: "Grandchild",
        parentId: "c1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockFolders.set("p1", parent);
      mockFolders.set("c1", child);
      mockFolders.set("g1", grandchild);

      await folderRepo.deleteFolderById("p1");

      // 모든 하위 폴더가 삭제되어야 함
      expect(mockFolders.has("p1")).toBe(false);
      expect(mockFolders.has("c1")).toBe(false);
      expect(mockFolders.has("g1")).toBe(false);
    });

    test("폴더 삭제 시 내부 노트는 루트로 이동", async () => {
      const folder = {
        id: "f1",
        name: "Folder",
        parentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const note = {
        id: "n1",
        title: "Note",
        content: "Content",
        folderId: "f1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockFolders.set("f1", folder);
      mockNotes.set("n1", note);

      await folderRepo.deleteFolderById("f1");

      expect(mockNotes.get("n1").folderId).toBeNull();
    });
  });
});
