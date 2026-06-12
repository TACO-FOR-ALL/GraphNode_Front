export type UserFileCategory = "pdf" | "word" | "ppt" | "document" | "unknown";

export type UserFile = {
  id: string;
  folderId: string | null;
  displayName: string;
  mimeType: string;
  sizeBytes: number;
  category: UserFileCategory;
  summaryStatus: "pending" | "processing" | "completed" | "failed";
  createdAt: number;
  updatedAt: number;
};
