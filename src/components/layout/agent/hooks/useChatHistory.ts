import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ChatSession, ChatMessage } from "../types";

const CHAT_HISTORY_KEY = "agent_chat_history";
const MAX_SESSIONS = 50;

const getStoredHistory = (): ChatSession[] => {
  try {
    const data = localStorage.getItem(CHAT_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveHistory = (sessions: ChatSession[]) => {
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(sessions));
};

const generateSessionId = () =>
  `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function useChatHistory() {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load history on mount
  useEffect(() => {
    setSessions(getStoredHistory());
  }, []);

  // Save session when messages change
  useEffect(() => {
    if (messages.length === 0 || !currentSessionId) return;

    const firstUserMsg = messages.find((m) => m.role === "user");
    const title =
      firstUserMsg?.content.slice(0, 30) ||
      t("aiAgentChatBox.newConversation", "New Conversation");

    setSessions((prev) => {
      const history = [...prev];
      const sessionIndex = history.findIndex((s) => s.id === currentSessionId);

      const updatedSession: ChatSession = {
        id: currentSessionId,
        title,
        messages,
        createdAt: sessionIndex >= 0 ? history[sessionIndex].createdAt : Date.now(),
        updatedAt: Date.now(),
      };

      if (sessionIndex >= 0) {
        history[sessionIndex] = updatedSession;
      } else {
        history.unshift(updatedSession);
      }

      const trimmed = history.slice(0, MAX_SESSIONS);
      saveHistory(trimmed);
      return trimmed;
    });
  }, [messages, currentSessionId, t]);

  const startNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
  }, []);

  const ensureSession = useCallback(() => {
    if (!currentSessionId) {
      const newId = generateSessionId();
      setCurrentSessionId(newId);
      return newId;
    }
    return currentSessionId;
  }, [currentSessionId]);

  const loadSession = useCallback((session: ChatSession) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages);
  }, []);

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== sessionId);
        saveHistory(updated);
        return updated;
      });

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    },
    [currentSessionId]
  );

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateLastMessage = useCallback(
    (updater: (msg: ChatMessage) => ChatMessage) => {
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), updater(last)];
      });
    },
    []
  );

  const replaceLastSystemMessage = useCallback(
    (content: string, status?: ChatMessage["status"]) => {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === "system") {
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, content, status: status ?? lastMsg.status },
          ];
        }
        return [...prev, { role: "system", content, status }];
      });
    },
    []
  );

  return {
    sessions,
    currentSessionId,
    messages,
    setMessages,
    startNewSession,
    ensureSession,
    loadSession,
    deleteSession,
    addMessage,
    updateLastMessage,
    replaceLastSystemMessage,
  };
}
