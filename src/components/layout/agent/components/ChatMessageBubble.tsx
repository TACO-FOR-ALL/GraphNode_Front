import { forwardRef } from "react";
import type { ChatMessage } from "../types";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

const ChatMessageBubble = forwardRef<HTMLDivElement, ChatMessageBubbleProps>(
  ({ message }, ref) => {
    const isUser = message.role === "user";
    const isProgress = message.status === "progress";

    return (
      <div
        ref={ref}
        className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] ${
            isUser
              ? "bg-primary text-white rounded-br-none"
              : "bg-bg-tertiary text-text-primary rounded-bl-none"
          }`}
        >
          {!isUser && isProgress && (
            <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse mr-2" />
          )}
          {message.content}
        </div>
      </div>
    );
  }
);

ChatMessageBubble.displayName = "ChatMessageBubble";

export default ChatMessageBubble;
