import { useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { agentChatStream } from "@/managers/agentClient";
import { noteRepo } from "@/managers/noteRepo";
import { useNoteGenerationStore } from "@/store/useNoteGenerationStore";
import type { ChatMessage } from "../types";

interface UseAgentChatOptions {
  ensureSession: () => string;
  addMessage: (message: ChatMessage) => void;
  replaceLastSystemMessage: (content: string, status?: ChatMessage["status"]) => void;
  getSourceContent: () => Promise<string>;
}

export function useAgentChat({
  ensureSession,
  addMessage,
  replaceLastSystemMessage,
  getSourceContent,
}: UseAgentChatOptions) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { phase, setPhase, reset } = useNoteGenerationStore();
  const noteCreatedRef = useRef(false);

  const isProcessing = phase !== "idle" && phase !== "done" && phase !== "error";

  const sendMessage = useCallback(
    async (userMessage: string) => {
      const trimmed = userMessage.trim();
      if (!trimmed || isProcessing) return;

      ensureSession();
      noteCreatedRef.current = false;
      reset();

      // Add user message and loading indicator
      addMessage({ role: "user", content: trimmed });
      addMessage({
        role: "system",
        content: t("aiAgentChatBox.generatingResponse", "Generating response..."),
        status: "progress",
      });

      try {
        const contextText = await getSourceContent();
        setPhase("analyzing", t("aiAgentChatBox.analyzing", "Analyzing request..."));

        let fullAnswer = "";

        await agentChatStream({
          userMessage: trimmed,
          contextText: contextText || undefined,
          callbacks: {
            onStatus: (event) => {
              setPhase(event.phase as any, event.message);
            },
            onChunk: (event) => {
              fullAnswer += event.text;
              replaceLastSystemMessage(fullAnswer, "progress");
            },
            onResult: async (event) => {
              setPhase("done", t("aiAgentChatBox.done", "Done"));
              replaceLastSystemMessage(event.answer, "completed");

              // Handle note creation
              if (event.mode === "note" && event.noteContent) {
                if (noteCreatedRef.current) return;
                noteCreatedRef.current = true;

                const cleanedContent = event.noteContent
                  .trim()
                  .replace(/^```markdown\s*\n?/i, "")
                  .replace(/\n?```\s*$/, "")
                  .replace(/^```\s*\n?/, "")
                  .replace(/^```md\s*\n?/i, "")
                  .trim();

                await noteRepo.create(cleanedContent);
                queryClient.invalidateQueries({ queryKey: ["notes"] });

                addMessage({
                  role: "system",
                  content: t("aiAgentChatBox.noteCreated", "Note has been created!"),
                  status: "completed",
                });
              }
            },
            onError: (event) => {
              setPhase("error", event.message);
              addMessage({
                role: "system",
                content: `${t("aiAgentChatBox.error", "Error")}: ${event.message}`,
              });
            },
          },
        });
      } catch (error) {
        console.error("Failed to send message:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setPhase("error", errorMessage);
        addMessage({
          role: "system",
          content: `${t("aiAgentChatBox.errorOccurred", "Error occurred")}: ${errorMessage}`,
        });
      }
    },
    [
      isProcessing,
      ensureSession,
      reset,
      addMessage,
      replaceLastSystemMessage,
      getSourceContent,
      setPhase,
      queryClient,
      t,
    ]
  );

  return {
    isProcessing,
    sendMessage,
    reset,
  };
}
