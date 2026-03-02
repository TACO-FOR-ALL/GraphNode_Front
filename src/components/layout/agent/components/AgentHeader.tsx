import { useRef, useEffect, useState } from "react";
import { IoListOutline } from "react-icons/io5";
import { IoIosClose } from "react-icons/io";
import logo from "@/assets/icons/logo.svg";
import ChatHistoryDropdown from "./ChatHistoryDropdown";
import type { ChatSession } from "../types";

interface AgentHeaderProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onLoadSession: (session: ChatSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onStartNewChat: () => void;
  onClose: () => void;
}

export default function AgentHeader({
  sessions,
  currentSessionId,
  onLoadSession,
  onDeleteSession,
  onStartNewChat,
  onClose,
}: AgentHeaderProps) {
  const [showHistoryList, setShowHistoryList] = useState(false);
  const historyListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        historyListRef.current &&
        !historyListRef.current.contains(event.target as Node)
      ) {
        setShowHistoryList(false);
      }
    };

    if (showHistoryList) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHistoryList]);

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
  };

  const handleLoadSession = (session: ChatSession) => {
    onLoadSession(session);
    setShowHistoryList(false);
  };

  const handleStartNewChat = () => {
    onStartNewChat();
    setShowHistoryList(false);
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center justify-center gap-2">
        <img src={logo} alt="logo" className="w-3 h-3" />
        <span className="text-[12px] font-medium text-text-primary">
          GraphNode AI Agent
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative" ref={historyListRef}>
          <IoListOutline
            onClick={() => setShowHistoryList(!showHistoryList)}
            className="text-lg text-text-secondary hover:text-text-primary cursor-pointer"
          />
          {showHistoryList && (
            <ChatHistoryDropdown
              chatHistory={sessions}
              currentSessionId={currentSessionId}
              onLoadSession={handleLoadSession}
              onDeleteSession={handleDeleteSession}
              onStartNewChat={handleStartNewChat}
            />
          )}
        </div>
        <IoIosClose
          onClick={onClose}
          className="text-xl text-text-secondary hover:text-text-primary cursor-pointer"
        />
      </div>
    </div>
  );
}
