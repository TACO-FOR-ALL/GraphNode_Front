export type MessageStatus = "progress" | "completed";

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

export type SourceType = "chat" | "note";

export type SelectedSource = {
  type: SourceType;
  id: string;
  title: string;
};
