import { Note } from "@/types/Note";

export default function sortChat(arr: Note[]) {
  return [...arr].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
