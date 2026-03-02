import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import { noteRepo } from "@/managers/noteRepo";
import { threadRepo } from "@/managers/threadRepo";
import type { SelectedSource, SourceType } from "../types";

export function useSourceSelection() {
  const location = useLocation();
  const params = useParams<{ noteId?: string; threadId?: string }>();
  const [selectedSources, setSelectedSources] = useState<SelectedSource[]>([]);

  // Auto-select source from current URL path
  useEffect(() => {
    const path = location.pathname;
    const pathParts = path.split("/").filter(Boolean);

    const currentNoteId =
      pathParts[0] === "notes" && pathParts[1] ? pathParts[1] : null;
    const currentThreadId =
      pathParts[0] === "chat" && pathParts[1] ? pathParts[1] : null;

    // Load note if on notes page
    const noteId = params.noteId || currentNoteId;
    if (noteId) {
      noteRepo
        .getNoteById(noteId)
        .then((note) => {
          if (note) {
            addSource("note", note.id, note.title);
          }
        })
        .catch((err) => console.error("Failed to load note:", err));
    }

    // Load thread if on chat page
    const threadId = params.threadId || currentThreadId;
    if (threadId) {
      threadRepo
        .getThreadById(threadId)
        .then((thread) => {
          if (thread) {
            addSource("chat", thread.id, thread.title);
          }
        })
        .catch((err) => console.error("Failed to load thread:", err));
    }
  }, [location.pathname, params.noteId, params.threadId]);

  const addSource = useCallback(
    (type: SourceType, id: string, title: string) => {
      setSelectedSources((prev) => {
        const exists = prev.some((s) => s.type === type && s.id === id);
        if (exists) return prev;
        return [...prev, { type, id, title }];
      });
    },
    []
  );

  const removeSource = useCallback((id: string) => {
    setSelectedSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSources = useCallback(() => {
    setSelectedSources([]);
  }, []);

  const getSourceContent = useCallback(async (): Promise<string> => {
    if (selectedSources.length === 0) return "";

    const allContent: string[] = [];

    for (const source of selectedSources) {
      if (source.type === "chat") {
        const thread = await threadRepo.getThreadById(source.id);
        if (thread) {
          const chatText = thread.messages
            .map((msg) => {
              const role = msg.role === "user" ? "User" : "AI";
              return `**${role}**:\n${msg.content}`;
            })
            .join("\n\n---\n\n");
          allContent.push(`[${source.title}]\n${chatText}`);
        }
      } else if (source.type === "note") {
        const note = await noteRepo.getNoteById(source.id);
        if (note) {
          allContent.push(`[${source.title}]\n${note.content}`);
        }
      }
    }

    return allContent.join("\n\n===\n\n");
  }, [selectedSources]);

  return {
    selectedSources,
    addSource,
    removeSource,
    clearSources,
    getSourceContent,
  };
}
