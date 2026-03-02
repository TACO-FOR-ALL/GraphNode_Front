import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { IoIosArrowDown } from "react-icons/io";
import { FaArrowRight } from "react-icons/fa6";
import { noteRepo } from "@/managers/noteRepo";
import { threadRepo } from "@/managers/threadRepo";
import type { Note } from "@/types/Note";
import type { ChatThread } from "@/types/Chat";
import AgentAutoResizeTextarea from "@/components/AgentAutoResizeTextArea";
import SourceSelectorDropdown from "./SourceSelectorDropdown";
import SelectedSourceChip from "./SelectedSourceChip";
import type { SelectedSource, SourceType } from "../types";

interface AgentInputAreaProps {
  selectedSources: SelectedSource[];
  onAddSource: (type: SourceType, id: string, title: string) => void;
  onRemoveSource: (id: string) => void;
  onSend: (message: string) => void;
  isProcessing: boolean;
}

export default function AgentInputArea({
  selectedSources,
  onAddSource,
  onRemoveSource,
  onSend,
  isProcessing,
}: AgentInputAreaProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: allNotes } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => noteRepo.getAllNotes(),
  });

  const { data: allThreads } = useQuery<ChatThread[]>({
    queryKey: ["chatThreads"],
    queryFn: () => threadRepo.getThreadList(),
  });

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSourceDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddSource = (type: SourceType, id: string, title: string) => {
    onAddSource(type, id, title);
    setShowSourceDropdown(false);
  };

  const handleSend = () => {
    if (input.trim() && !isProcessing) {
      onSend(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && input.trim()) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col border-solid border-[1px] border-text-placeholder rounded-[16px] py-2 px-[10px]">
      {/* Source selection */}
      <div className="flex items-center gap-[6px] mb-2 flex-wrap">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => !isProcessing && setShowSourceDropdown(!showSourceDropdown)}
            className={`flex items-center gap-1 text-[10px] px-2 py-[4px] pb-[5px] border-[1px] text-text-secondary border-text-placeholder rounded-full ${
              isProcessing
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-bg-tertiary cursor-pointer"
            }`}
            disabled={isProcessing}
          >
            @
          </button>
          {showSourceDropdown && (
            <SourceSelectorDropdown
              threads={allThreads}
              notes={allNotes}
              onAddSource={handleAddSource}
            />
          )}
        </div>
        {selectedSources.map((source) => (
          <SelectedSourceChip
            key={source.id}
            id={source.id}
            title={source.title}
            onRemove={onRemoveSource}
          />
        ))}
      </div>

      {/* Text input */}
      <AgentAutoResizeTextarea
        value={input}
        onChange={setInput}
        placeholder={t("aiAgentChatBox.placeholder")}
        onKeyDown={handleKeyDown}
        disabled={isProcessing}
      />

      {/* Instance selector and send button */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-1 items-center cursor-pointer">
          <p className="font-noto-sans-kr text-[12px] font-medium text-text-secondary">
            <span className="text-chatbox-active">ChatGPT</span> 5.1 Instant
          </p>
          <IoIosArrowDown className="text-[16px] text-chatbox-active" />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || isProcessing}
          className={`w-5 h-5 flex items-center justify-center rounded-full text-white cursor-pointer ${
            !input.trim() || isProcessing ? "bg-text-placeholder" : "bg-primary"
          }`}
        >
          {isProcessing ? (
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <FaArrowRight className="w-3 h-3" />
          )}
        </button>
      </div>
    </div>
  );
}
