import { useTranslation } from "react-i18next";
import type { Note } from "@/types/Note";
import type { ChatThread } from "@/types/Chat";
import type { SourceType } from "../types";

interface SourceSelectorDropdownProps {
  threads: ChatThread[] | undefined;
  notes: Note[] | undefined;
  onAddSource: (type: SourceType, id: string, title: string) => void;
}

export default function SourceSelectorDropdown({
  threads,
  notes,
  onAddSource,
}: SourceSelectorDropdownProps) {
  const { t } = useTranslation();

  return (
    <div className="absolute bottom-full left-0 mt-1 bg-bg-primary border border-base-border rounded shadow-lg z-10 w-48 max-h-64 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-2 border-b border-base-border">
          <p className="text-xs font-semibold text-text-secondary mb-1">Chat</p>
          <div className="space-y-1">
            {threads && threads.length > 0 ? (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => onAddSource("chat", thread.id, thread.title)}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-bg-tertiary rounded text-text-primary"
                >
                  {thread.title}
                </button>
              ))
            ) : (
              <p className="text-xs text-text-tertiary px-2">
                {t("aiAgentChatBox.noChats", "No chats")}
              </p>
            )}
          </div>
        </div>
        <div className="p-2">
          <p className="text-xs font-semibold text-text-secondary mb-1">Note</p>
          <div className="space-y-1">
            {notes && notes.length > 0 ? (
              notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => onAddSource("note", note.id, note.title)}
                  className="w-full text-left px-2 py-1 text-xs hover:bg-bg-tertiary rounded text-text-primary"
                >
                  {note.title}
                </button>
              ))
            ) : (
              <p className="text-xs text-text-tertiary px-2">
                {t("aiAgentChatBox.noNotes", "No notes")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
