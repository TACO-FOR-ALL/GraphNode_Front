import { forwardRef } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import type { ChatMessage } from "../types";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onRetry?: () => void;
}

const ChatMessageBubble = forwardRef<HTMLDivElement, ChatMessageBubbleProps>(
  ({ message, onRetry }, ref) => {
    const { t } = useTranslation();
    const isUser = message.role === "user";
    const isProgress = message.status === "progress";
    const isError = message.status === "error";

    return (
      <div
        ref={ref}
        className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] ${
            isUser
              ? "bg-primary text-white rounded-br-none"
              : isError
                ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-bl-none border border-red-200 dark:border-red-800"
                : "bg-bg-tertiary text-text-primary rounded-bl-none"
          }`}
        >
          {!isUser && isProgress && (
            <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse mr-2" />
          )}
          {message.content}
        </div>
        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 mt-1 px-2 py-0.5 text-[11px] text-text-secondary hover:text-text-primary transition-colors rounded"
          >
            <FiRefreshCw size={10} />
            {t("aiAgentChatBox.retry", "Retry")}
          </button>
        )}
      </div>
    );
  }
);

ChatMessageBubble.displayName = "ChatMessageBubble";

export default ChatMessageBubble;
