export type Note = {
  id: string;
  title: string;
  content: string;
  folderId: string | null; // null이면 루트에 있는 노트
  createdAt: Date;
  updatedAt: Date;
};
