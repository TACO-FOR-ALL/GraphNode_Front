export type Folder = {
  id: string;
  name: string;
  parentId: string | null; // null이면 root 폴더
  createdAt: number;
  updatedAt: number;
};

export type FolderCreate = {
  name: string;
  parentId?: string | null;
};

export type FolderUpdate = {
  name?: string;
  parentId?: string | null;
};
