import { IoClose } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import type { ChatSession } from "../types";

interface ChatHistoryDropdownProps {
  chatHistory: ChatSession[];
  currentSessionId: string | null;
  onLoadSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onStartNewChat: () => void;
}

export default function ChatHistoryDropdown({
  chatHistory,
  currentSessionId,
  onLoadSession,
  onDeleteSession,
  onStartNewChat,
}: ChatHistoryDropdownProps) {
  const { t } = useTranslation();

  return (
    <div className="absolute top-full right-0 mt-2 w-64 max-h-80 bg-bg-primary border border-base-border rounded-lg shadow-lg z-50 overflow-hidden flex flex-col">
      <div className="p-2 border-b border-base-border flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary">
          {t("aiAgentChatBox.chatHistory", "Chat History")}
        </span>
        <button
          onClick={onStartNewChat}
          className="text-xs text-primary hover:underline"
        >
          {t("aiAgentChatBox.newChat", "+ New Chat")}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {chatHistory.length === 0 ? (
          <p className="text-xs text-text-tertiary p-3 text-center">
            {t("aiAgentChatBox.noChatHistory", "No chat history")}
          </p>
        ) : (
          chatHistory.map((session) => (
            <div
              key={session.id}
              onClick={() => onLoadSession(session)}
              className={`p-2 hover:bg-bg-tertiary cursor-pointer border-b border-base-border last:border-b-0 group ${
                currentSessionId === session.id ? "bg-bg-tertiary" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-text-primary truncate flex-1">
                  {session.title}
                </p>
                <IoClose
                  onClick={(e) => onDeleteSession(session.id, e)}
                  className="w-4 h-4 text-text-tertiary hover:text-frame-bar-red opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <p className="text-[10px] text-text-tertiary mt-1">
                {new Date(session.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
