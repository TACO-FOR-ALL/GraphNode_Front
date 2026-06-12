import { Folder } from "@/types/Folder";
import { Note } from "@/types/Note";
import { UserFile } from "@/types/UserFile";

export type FolderTree = {
  rootFolders: Folder[];
  rootNotes: Note[];
  rootFiles: UserFile[];
  folderMap: Map<string, Folder>;
  folderChildren: Map<string, Folder[]>;
  folderNotes: Map<string, Note[]>;
  folderFiles: Map<string, UserFile[]>;
};

export function buildFolderTree(
  folders: Folder[],
  notes: Note[],
  files: UserFile[] = [],
): FolderTree | null {
  if (!folders || !notes) return null;

  const folderMap = new Map<string, Folder>();
  const rootFolders: Folder[] = [];
  const folderChildren = new Map<string, Folder[]>();
  const folderNotes = new Map<string, Note[]>();
  const folderFiles = new Map<string, UserFile[]>();
  const rootNotes: Note[] = [];
  const rootFiles: UserFile[] = [];

  folders.forEach((folder) => {
    // 모든 폴더를 Map에 저장 (ID로 빠른 조회를 위해서)
    folderMap.set(folder.id, folder);
    // 루트에 폴더 추가 (forder의 parentId가 nulld인 경우 루트에 존재)
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

  files.forEach((file) => {
    if (file.folderId === null) {
      rootFiles.push(file);
    } else {
      if (!folderFiles.has(file.folderId)) {
        folderFiles.set(file.folderId, []);
      }
      folderFiles.get(file.folderId)!.push(file);
    }
  });

  return {
    rootFolders,
    rootNotes,
    rootFiles,
    folderMap,
    folderChildren,
    folderNotes,
    folderFiles,
  };
}
