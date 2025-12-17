import { api } from "@/apiClient";

const API_BASE = "https://taco4graphnode.online";

export type Mode = "chat" | "summary" | "note";

export type StreamEventType = "status" | "chunk" | "result" | "error";

export type StreamStatusEvent = {
  phase: "analyzing" | "summarizing" | "writing" | "done" | "error";
  message: string;
};

export type StreamChunkEvent = {
  text: string;
};

export type StreamResultEvent = {
  mode: Mode;
  answer: string;
  noteContent: string | null;
};

export type StreamErrorEvent = {
  message: string;
};

export type StreamEventCallbacks = {
  onStatus?: (event: StreamStatusEvent) => void;
  onChunk?: (event: StreamChunkEvent) => void;
  onResult?: (event: StreamResultEvent) => void;
  onError?: (event: StreamErrorEvent) => void;
};

type AgentChatStreamParams = {
  userMessage: string;
  contextText?: string;
  modeHint?: "summary" | "note" | "auto";
};

export async function agentChatStream({
  userMessage,
  contextText,
  modeHint,
  callbacks,
}: AgentChatStreamParams & {
  callbacks: StreamEventCallbacks;
}): Promise<StreamResultEvent | null> {
  const res = await fetch(`${API_BASE}/v1/agent/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      userMessage,
      contextText,
      modeHint,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`agent-chat-stream failed: ${res.status} ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get response stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: StreamResultEvent | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType: StreamEventType | null = null;
      let eventData: string | null = null;

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim() as StreamEventType;
        } else if (line.startsWith("data: ")) {
          eventData = line.slice(6).trim();
        } else if (line === "" && eventType && eventData) {
          try {
            const data = JSON.parse(eventData);

            switch (eventType) {
              case "status":
                callbacks.onStatus?.(data as StreamStatusEvent);
                break;
              case "chunk":
                callbacks.onChunk?.(data as StreamChunkEvent);
                break;
              case "result":
                finalResult = data as StreamResultEvent;
                callbacks.onResult?.(finalResult);
                break;
              case "error":
                callbacks.onError?.(data as StreamErrorEvent);
                throw new Error((data as StreamErrorEvent).message);
            }
          } catch (e) {
            if (e instanceof Error && e.message.includes("agent-chat")) {
              throw e;
            }
            console.error("Failed to parse SSE event:", e);
          }

          eventType = null;
          eventData = null;
        }
      }
    }

    return finalResult;
  } finally {
    reader.releaseLock();
  }
}

// Legacy wrapper for backward compatibility
export async function agentChatToNoteStream({
  chatText,
  instruction,
  callbacks,
}: {
  chatText: string;
  instruction?: string;
  callbacks: StreamEventCallbacks;
}): Promise<string> {
  const result = await agentChatStream({
    userMessage: instruction || "이 내용을 노트로 정리해줘",
    contextText: chatText,
    modeHint: "note",
    callbacks: {
      onStatus: callbacks.onStatus,
      onChunk: callbacks.onChunk,
      onResult: (event) => {
        // Convert to old format
        callbacks.onResult?.({
          mode: event.mode,
          answer: event.answer,
          noteContent: event.noteContent,
        });
      },
      onError: callbacks.onError,
    },
  });

  return result?.noteContent || result?.answer || "";
}

// Legacy wrapper for backward compatibility
export async function agentAnswerNoteStream({
  instruction,
  currentContent,
  chatContext,
  callbacks,
}: {
  instruction: string;
  currentContent: string;
  chatContext?: string;
  callbacks: StreamEventCallbacks;
}): Promise<string> {
  const contextText = chatContext
    ? `[Current Note]\n${currentContent}\n\n[Chat Context]\n${chatContext}`
    : currentContent;

  const result = await agentChatStream({
    userMessage: instruction,
    contextText,
    modeHint: "auto",
    callbacks: {
      onStatus: callbacks.onStatus,
      onChunk: callbacks.onChunk,
      onResult: (event) => {
        callbacks.onResult?.({
          mode: event.mode,
          answer: event.answer,
          noteContent: event.noteContent,
        });
      },
      onError: callbacks.onError,
    },
  });

  return result?.answer || "";
}
