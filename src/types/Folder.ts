export type Folder = {
  id: string;
  name: string;
  parentId: string | null; // null이면 root 폴더
  createdAt: Date;
  updatedAt: Date;
};
