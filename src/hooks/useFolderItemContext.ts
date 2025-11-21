import { Folder } from "@/types/Folder";
import { FolderTree } from "@/utils/buildFolderTree";

export type FolderItemContextValue = {
  // 상태
  expandedFolders: Set<string>;
  editingFolderId: string | null;
  editingFolderName: string;
  newFolderName: string;
  creatingFolderParentId: string | null | "ROOT";
  draggedNoteId: string | null;
  dragOverFolderId: string | null;
  selectedId: string;
  buildTree: FolderTree | null;

  // 핸들러
  onToggle: (folderId: string) => void;
  onStartEdit: (folder: Folder, e: React.MouseEvent) => void;
  onSaveName: (folderId: string) => void;
  onDelete: (folderId: string, e: React.MouseEvent) => void;
  onStartCreate: (parentId: string) => void;
  onCreate: () => void;
  onCancelCreate: () => void;
  onNoteDragStart: (noteId: string, e: React.DragEvent) => void;
  onNoteDragEnd: () => void;
  onFolderDragOver: (folderId: string, e: React.DragEvent) => void;
  onFolderDrop: (folderId: string, e: React.DragEvent) => void;
  onDragLeave: () => void;
  onNoteClick: (noteId: string) => void;

  // Setter
  setEditingFolderName: (name: string) => void;
  setEditingFolderId: (id: string | null) => void;
  setNewFolderName: (name: string) => void;
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export function useFolderItemContext(
  context: FolderItemContextValue
): FolderItemContextValue {
  return context;
}
