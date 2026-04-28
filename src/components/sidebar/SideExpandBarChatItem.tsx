import { NEW_CONVERSATION_PLACEHOLDER } from "@/constants/chat";
import { ChatThread } from "@/types/Chat";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FaTrash } from "react-icons/fa";
import type { RefObject } from "react";

type SideExpandBarChatItemProps = {
  item: ChatThread;
  isSelected: boolean;
  isEditing: boolean;
  isSaving: boolean;
  editingTitle: string;
  inputRef: RefObject<HTMLInputElement | null>;
  onClick: () => void;
  onDoubleClick: () => void;
  onTitleChange: (title: string) => void;
  onBlur: () => void;
  onEnter: () => void;
  onEscape: () => void;
  onDelete: () => void;
};

export default function SideExpandBarChatItem({
  item,
  isSelected,
  isEditing,
  isSaving,
  editingTitle,
  inputRef,
  onClick,
  onDoubleClick,
  onTitleChange,
  onBlur,
  onEnter,
  onEscape,
  onDelete,
}: SideExpandBarChatItemProps) {
  return (
    <div
      className={`text-[14px] mr-2 font-normal flex items-center justify-between font-noto-sans-kr py-2 h-[32px] px-[6px] rounded-[6px] transition-colors duration-300 group ${
        isSelected
          ? "bg-sidebar-button-hover text-chatbox-active"
          : " hover:bg-sidebar-button-hover text-text-secondary hover:text-chatbox-active"
      }`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <div className="w-[195px] h-[20px] flex items-center gap-1.5 overflow-hidden">
        {item.title === NEW_CONVERSATION_PLACEHOLDER ? (
          <AiOutlineLoading3Quarters className="animate-spin text-[14px] flex-shrink-0" />
        ) : isEditing ? (
          <input
            ref={inputRef}
            value={editingTitle}
            disabled={isSaving}
            className="w-full bg-transparent outline-none border-none p-0 text-[14px] leading-5"
            onChange={(e) => onTitleChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onBlur={onBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onEnter();
              }

              if (e.key === "Escape") {
                e.preventDefault();
                onEscape();
              }
            }}
          />
        ) : (
          <span className="truncate">{item.title}</span>
        )}
      </div>
      {!isEditing && (
        <FaTrash
          className="text-[10px] cursor-pointer hidden group-hover:block"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        />
      )}
    </div>
  );
}
