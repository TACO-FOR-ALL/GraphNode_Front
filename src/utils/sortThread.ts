import { ChatThread } from "@/types/Chat";

export default function sortThread(arr: ChatThread[]) {
  return [...arr].sort((a, b) => b.updatedAt - a.updatedAt);
}
