const API_BASE = "http://localhost:3000";

type ChatToNoteStreamParams = {
  chatText: string;
  instruction?: string;
};

export type StreamEventType =
  | "status"
  | "partial"
  | "chunk"
  | "result"
  | "error";

export type StreamStatusEvent = {
  phase: "analyzing" | "summarizing" | "writing" | "done" | "error";
  message: string;
};

export type StreamPartialEvent = {
  kind: "analysis" | "outline";
  content: string;
};

export type StreamChunkEvent = {
  text: string;
};

export type StreamResultEvent = {
  noteContent: string;
};

export type StreamErrorEvent = {
  message: string;
};

export type StreamEventCallbacks = {
  onStatus?: (event: StreamStatusEvent) => void;
  onPartial?: (event: StreamPartialEvent) => void;
  onChunk?: (event: StreamChunkEvent) => void;
  onResult?: (event: StreamResultEvent) => void;
  onError?: (event: StreamErrorEvent) => void;
};

export async function agentChatToNoteStream({
  chatText,
  instruction,
  callbacks,
}: ChatToNoteStreamParams & {
  callbacks: StreamEventCallbacks;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/agent/chat-to-note/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatText,
      instruction,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`chat-to-note-stream failed: ${res.status} ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get response stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let noteContent = "";

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
              case "partial":
                callbacks.onPartial?.(data as StreamPartialEvent);
                break;
              case "chunk":
                const chunkData = data as StreamChunkEvent;
                noteContent += chunkData.text;
                callbacks.onChunk?.(chunkData);
                break;
              case "result":
                const resultData = data as StreamResultEvent;
                noteContent = resultData.noteContent;
                callbacks.onResult?.(resultData);
                break;
              case "error":
                callbacks.onError?.(data as StreamErrorEvent);
                throw new Error((data as StreamErrorEvent).message);
            }
          } catch (e) {
            if (e instanceof Error && e.message.startsWith("chat-to-note")) {
              throw e;
            }
            console.error("Failed to parse SSE event:", e);
          }

          eventType = null;
          eventData = null;
        }
      }
    }

    return noteContent;
  } finally {
    reader.releaseLock();
  }
}

type AnswerNoteStreamParams = {
  instruction: string;
  currentContent: string;
  chatContext?: string;
};

export async function agentAnswerNoteStream({
  instruction,
  currentContent,
  chatContext,
  callbacks,
}: AnswerNoteStreamParams & {
  callbacks: StreamEventCallbacks;
}): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/agent/answer-note/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instruction,
      currentContent,
      chatContext: chatContext ?? null,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`answer-note-stream failed: ${res.status} ${text}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Failed to get response stream");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullAnswer = "";

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
              case "chunk": {
                const chunkData = data as StreamChunkEvent;
                fullAnswer += chunkData.text;
                callbacks.onChunk?.(chunkData);
                break;
              }
              case "result": {
                const resultData = data as { answer: string };
                fullAnswer = resultData.answer;
                callbacks.onResult?.({
                  noteContent: resultData.answer,
                });
                break;
              }
              case "error":
                callbacks.onError?.(data as StreamErrorEvent);
                throw new Error((data as StreamErrorEvent).message);
            }
          } catch (e) {
            console.error("Failed to parse SSE event (answer-note):", e);
          }

          eventType = null;
          eventData = null;
        }
      }
    }

    return fullAnswer;
  } finally {
    reader.releaseLock();
  }
}
