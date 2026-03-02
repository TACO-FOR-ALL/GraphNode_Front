import { useRef, useEffect } from "react";
import ChatMessageBubble from "./ChatMessageBubble";
import type { ChatMessage } from "../types";

interface MessageListProps {
  messages: ChatMessage[];
}

export default function MessageList({ messages }: MessageListProps) {
  const userMessageRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find last user message index
  const lastUserMsgIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") return i;
    }
    return -1;
  })();

  // Scroll handling
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];

    if (lastMsg?.role === "user") {
      setTimeout(() => {
        userMessageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    } else {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 50);
    }
  }, [messages]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {messages.map((msg, idx) => (
        <ChatMessageBubble
          key={idx}
          ref={idx === lastUserMsgIdx ? userMessageRef : null}
          message={msg}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
