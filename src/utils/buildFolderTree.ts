import { Folder } from "@/types/Folder";
import { Note } from "@/types/Note";

export type FolderTree = {
  rootFolders: Folder[];
  rootNotes: Note[];
  folderMap: Map<string, Folder>;
  folderChildren: Map<string, Folder[]>;
  folderNotes: Map<string, Note[]>;
};

export function buildFolderTree(
  folders: Folder[],
  notes: Note[]
): FolderTree | null {
  if (!folders || !notes) return null;

  const folderMap = new Map<string, Folder>();
  const rootFolders: Folder[] = [];
  const folderChildren = new Map<string, Folder[]>();
  const folderNotes = new Map<string, Note[]>();
  const rootNotes: Note[] = [];

  folders.forEach((folder) => {
    // 모든 폴더를 Map에 저장 (ID로 빠른 조회를 위해서)
    folderMap.set(folder.id, folder);
    // 루트에 풀더 추가 (forder의 parentId가 nulld인 경우 루트에 존재)
    if (folder.parentId === null) {
      rootFolders.push(folder);
    }
    // 하위 폴더 추가
    else {
      // 하위 폴더가 없으면 생성
      if (!folderChildren.has(folder.parentId)) {
        folderChildren.set(folder.parentId, []);
      }
      folderChildren.get(folder.parentId)!.push(folder);
    }
  });

  notes.forEach((note) => {
    // 루트에 노트 추가 (note의 folderId가 null인 경우 루트에 존재)
    if (note.folderId === null) {
      rootNotes.push(note);
    } else {
      if (!folderNotes.has(note.folderId)) {
        folderNotes.set(note.folderId, []);
      }
      folderNotes.get(note.folderId)!.push(note);
    }
  });

  return {
    rootFolders,
    rootNotes,
    folderMap,
    folderChildren,
    folderNotes,
  };
}
