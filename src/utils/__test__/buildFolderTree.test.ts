import { buildFolderTree } from "../buildFolderTree";
import { Folder } from "@/types/Folder";
import { Note } from "@/types/Note";

describe("buildFolderTree", () => {
  const baseTime = Date.now();

  const createFolder = (
    id: string,
    name: string,
    parentId: string | null = null,
  ): Folder => ({
    id,
    name,
    parentId,
    createdAt: baseTime,
    updatedAt: baseTime,
  });

  const createNote = (
    id: string,
    title: string,
    folderId: string | null = null,
  ): Note => ({
    id,
    title,
    content: `Content of ${title}`,
    folderId,
    createdAt: baseTime,
    updatedAt: baseTime,
  });

  describe("null 입력 처리", () => {
    test("folders가 null이면 null 반환", () => {
      const result = buildFolderTree(null as unknown as Folder[], []);
      expect(result).toBeNull();
    });

    test("notes가 null이면 null 반환", () => {
      const result = buildFolderTree([], null as unknown as Note[]);
      expect(result).toBeNull();
    });

    test("둘 다 null이면 null 반환", () => {
      const result = buildFolderTree(
        null as unknown as Folder[],
        null as unknown as Note[],
      );
      expect(result).toBeNull();
    });
  });

  describe("빈 배열 처리", () => {
    test("빈 폴더와 빈 노트", () => {
      const result = buildFolderTree([], []);
      expect(result).not.toBeNull();
      expect(result!.rootFolders).toEqual([]);
      expect(result!.rootNotes).toEqual([]);
      expect(result!.folderMap.size).toBe(0);
      expect(result!.folderChildren.size).toBe(0);
      expect(result!.folderNotes.size).toBe(0);
    });
  });

  describe("루트 폴더 처리", () => {
    test("루트 폴더 식별 (parentId === null)", () => {
      const folders = [
        createFolder("f1", "Root 1"),
        createFolder("f2", "Root 2"),
      ];

      const result = buildFolderTree(folders, []);
      expect(result!.rootFolders).toHaveLength(2);
      expect(result!.rootFolders.map((f) => f.id)).toContain("f1");
      expect(result!.rootFolders.map((f) => f.id)).toContain("f2");
    });

    test("루트가 아닌 폴더는 rootFolders에 포함되지 않음", () => {
      const folders = [
        createFolder("f1", "Root"),
        createFolder("f2", "Child", "f1"),
      ];

      const result = buildFolderTree(folders, []);
      expect(result!.rootFolders).toHaveLength(1);
      expect(result!.rootFolders[0].id).toBe("f1");
    });
  });

  describe("폴더 계층구조", () => {
    test("자식 폴더 맵핑", () => {
      const folders = [
        createFolder("f1", "Parent"),
        createFolder("f2", "Child 1", "f1"),
        createFolder("f3", "Child 2", "f1"),
      ];

      const result = buildFolderTree(folders, []);
      expect(result!.folderChildren.get("f1")).toHaveLength(2);
      expect(result!.folderChildren.get("f1")!.map((f) => f.id)).toContain(
        "f2",
      );
      expect(result!.folderChildren.get("f1")!.map((f) => f.id)).toContain(
        "f3",
      );
    });

    test("깊이 3 이상의 중첩 폴더", () => {
      const folders = [
        createFolder("f1", "Level 1"),
        createFolder("f2", "Level 2", "f1"),
        createFolder("f3", "Level 3", "f2"),
        createFolder("f4", "Level 4", "f3"),
      ];

      const result = buildFolderTree(folders, []);
      expect(result!.rootFolders).toHaveLength(1);
      expect(result!.folderChildren.get("f1")).toHaveLength(1);
      expect(result!.folderChildren.get("f2")).toHaveLength(1);
      expect(result!.folderChildren.get("f3")).toHaveLength(1);
      expect(result!.folderChildren.has("f4")).toBe(false); // 자식 없음
    });
  });

  describe("폴더맵 (folderMap)", () => {
    test("모든 폴더가 Map에 저장됨", () => {
      const folders = [
        createFolder("f1", "Folder 1"),
        createFolder("f2", "Folder 2"),
        createFolder("f3", "Folder 3", "f1"),
      ];

      const result = buildFolderTree(folders, []);
      expect(result!.folderMap.size).toBe(3);
      expect(result!.folderMap.get("f1")!.name).toBe("Folder 1");
      expect(result!.folderMap.get("f2")!.name).toBe("Folder 2");
      expect(result!.folderMap.get("f3")!.name).toBe("Folder 3");
    });
  });

  describe("루트 노트 처리", () => {
    test("루트 노트 식별 (folderId === null)", () => {
      const notes = [createNote("n1", "Note 1"), createNote("n2", "Note 2")];

      const result = buildFolderTree([], notes);
      expect(result!.rootNotes).toHaveLength(2);
    });

    test("폴더에 속한 노트는 rootNotes에 포함되지 않음", () => {
      const folders = [createFolder("f1", "Folder")];
      const notes = [
        createNote("n1", "Root Note"),
        createNote("n2", "Folder Note", "f1"),
      ];

      const result = buildFolderTree(folders, notes);
      expect(result!.rootNotes).toHaveLength(1);
      expect(result!.rootNotes[0].id).toBe("n1");
    });
  });

  describe("폴더별 노트 맵핑", () => {
    test("폴더에 노트 할당", () => {
      const folders = [createFolder("f1", "Folder 1")];
      const notes = [
        createNote("n1", "Note 1", "f1"),
        createNote("n2", "Note 2", "f1"),
      ];

      const result = buildFolderTree(folders, notes);
      expect(result!.folderNotes.get("f1")).toHaveLength(2);
    });

    test("여러 폴더에 노트 분배", () => {
      const folders = [
        createFolder("f1", "Folder 1"),
        createFolder("f2", "Folder 2"),
      ];
      const notes = [
        createNote("n1", "Note 1", "f1"),
        createNote("n2", "Note 2", "f2"),
        createNote("n3", "Note 3", "f2"),
      ];

      const result = buildFolderTree(folders, notes);
      expect(result!.folderNotes.get("f1")).toHaveLength(1);
      expect(result!.folderNotes.get("f2")).toHaveLength(2);
    });

    test("노트가 없는 폴더", () => {
      const folders = [createFolder("f1", "Empty Folder")];
      const notes: Note[] = [];

      const result = buildFolderTree(folders, notes);
      expect(result!.folderNotes.has("f1")).toBe(false);
    });
  });

  describe("고아 노트 처리", () => {
    test("존재하지 않는 폴더ID를 가진 노트", () => {
      const folders: Folder[] = [];
      const notes = [createNote("n1", "Orphan Note", "non-existent-folder")];

      const result = buildFolderTree(folders, notes);
      // folderId가 null이 아니므로 rootNotes에 들어가지 않음
      expect(result!.rootNotes).toHaveLength(0);
      // 존재하지 않는 폴더의 노트로 등록됨
      expect(result!.folderNotes.get("non-existent-folder")).toHaveLength(1);
    });
  });

  describe("복합 시나리오", () => {
    test("전체 트리 구조", () => {
      const folders = [
        createFolder("root1", "Documents"),
        createFolder("root2", "Projects"),
        createFolder("child1", "Work", "root1"),
        createFolder("child2", "Personal", "root1"),
        createFolder("grandchild", "Reports", "child1"),
      ];

      const notes = [
        createNote("n1", "Root Note 1"),
        createNote("n2", "Root Note 2"),
        createNote("n3", "Doc Note", "root1"),
        createNote("n4", "Work Note 1", "child1"),
        createNote("n5", "Work Note 2", "child1"),
        createNote("n6", "Report", "grandchild"),
      ];

      const result = buildFolderTree(folders, notes);

      // 루트 폴더 2개
      expect(result!.rootFolders).toHaveLength(2);

      // 루트 노트 2개
      expect(result!.rootNotes).toHaveLength(2);

      // 모든 폴더가 맵에 있음
      expect(result!.folderMap.size).toBe(5);

      // 자식 폴더 관계 확인
      expect(result!.folderChildren.get("root1")).toHaveLength(2);
      expect(result!.folderChildren.get("child1")).toHaveLength(1);

      // 폴더별 노트 확인
      expect(result!.folderNotes.get("root1")).toHaveLength(1);
      expect(result!.folderNotes.get("child1")).toHaveLength(2);
      expect(result!.folderNotes.get("grandchild")).toHaveLength(1);
    });
  });
});
