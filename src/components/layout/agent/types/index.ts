export type MessageStatus = "progress" | "completed" | "error";

export type ChatMessage = {
  role: "system" | "user";
  content: string;
  status?: MessageStatus;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

export type SourceType = "chat" | "note" | "node";

export type SelectedSource = {
  type: SourceType;
  id: string;
  title: string;
};
