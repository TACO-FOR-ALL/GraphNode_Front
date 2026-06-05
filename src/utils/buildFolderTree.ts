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
  files: UserFile[] = []
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
    folderMap.set(folder.id, folder);
    if (folder.parentId === null) {
      rootFolders.push(folder);
    } else {
      if (!folderChildren.has(folder.parentId)) {
        folderChildren.set(folder.parentId, []);
      }
      folderChildren.get(folder.parentId)!.push(folder);
    }
  });

  notes.forEach((note) => {
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
