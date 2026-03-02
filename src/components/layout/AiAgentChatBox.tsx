import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAgentToolBoxStore } from "@/store/useAgentToolBoxStore";

import {
  useChatHistory,
  useSourceSelection,
  useAgentChat,
} from "./agent/hooks";
import {
  AgentHeader,
  AgentInputArea,
  EmptyState,
  MessageList,
} from "./agent/components";

interface AiAgentChatBoxProps {
  setIsOpen: (isOpen: boolean) => void;
}

export default function AiAgentChatBox({ setIsOpen }: AiAgentChatBoxProps) {
  const { t } = useTranslation();
  const { response } = useAgentToolBoxStore();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Custom hooks
  const {
    sessions,
    currentSessionId,
    messages,
    setMessages,
    startNewSession,
    ensureSession,
    loadSession,
    deleteSession,
    addMessage,
    replaceLastSystemMessage,
  } = useChatHistory();

  const {
    selectedSources,
    addSource,
    removeSource,
    clearSources,
    getSourceContent,
  } = useSourceSelection();

  const { isProcessing, sendMessage, reset } = useAgentChat({
    ensureSession,
    addMessage,
    replaceLastSystemMessage,
    getSourceContent,
  });

  // Handle external response from store
  useEffect(() => {
    if (response) {
      setMessages([{ role: "system", content: response }]);
    }
  }, [response, setMessages]);

  // Handlers
  const handleClose = useCallback(() => {
    startNewSession();
    clearSources();
    reset();
    setIsOpen(false);
  }, [startNewSession, clearSources, reset, setIsOpen]);

  const handleStartNewChat = useCallback(() => {
    startNewSession();
    clearSources();
    reset();
  }, [startNewSession, clearSources, reset]);

  const handleQuickAction = useCallback(
    (action: "summary" | "note") => {
      if (selectedSources.length === 0) {
        setAlertMessage(t("aiAgentChatBox.selectSourceFirst"));
        setTimeout(() => setAlertMessage(null), 3000);
        return;
      }
      const sourceNames = selectedSources.map((s) => s.title).join(", ");
      const message =
        action === "summary"
          ? `Summarize this content: ${sourceNames}`
          : `Make a note of: ${sourceNames}`;
      sendMessage(message);
    },
    [selectedSources, sendMessage, t]
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="absolute bottom-9 right-9 z-50 w-96 h-[520px] bg-bg-primary rounded-xl shadow-[0_2px_20px_0_#badaff] border-[1px] border-[rgba(var(--color-chatbox-border-rgb),0.2)] flex flex-col overflow-hidden p-4">
      <AgentHeader
        sessions={sessions}
        currentSessionId={currentSessionId}
        onLoadSession={loadSession}
        onDeleteSession={deleteSession}
        onStartNewChat={handleStartNewChat}
        onClose={handleClose}
      />

      <section
        className={`flex flex-col h-full py-5 my-2 ${
          hasMessages
            ? "overflow-y-auto custom-scrollbar items-start justify-start"
            : "items-start justify-end"
        }`}
      >
        {hasMessages ? (
          <MessageList messages={messages} />
        ) : (
          <EmptyState
            onSummary={() => handleQuickAction("summary")}
            onNote={() => handleQuickAction("note")}
            alertMessage={alertMessage}
          />
        )}
      </section>

      <AgentInputArea
        selectedSources={selectedSources}
        onAddSource={addSource}
        onRemoveSource={removeSource}
        onSend={sendMessage}
        isProcessing={isProcessing}
      />
    </div>
  );
}
