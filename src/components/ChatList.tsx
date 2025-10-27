import { useTranslation } from "react-i18next";
import threadRepo from "../managers/threadRepo";
import { FaTrash } from "react-icons/fa";
import { FaEdit } from "react-icons/fa";
import { useEffect, useRef, useState } from "react";
import { ChatThread } from "@/types/Chat";
import { IoMdAdd } from "react-icons/io";
import { useSelectedThreadStore } from "@/store/useSelectedThreadIdStore";
import { useQuery } from "@tanstack/react-query";

export default function ChatList() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const { t } = useTranslation();
  const { selectedThreadId, setSelectedThreadId } = useSelectedThreadStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const {
    isLoading,
    error,
    data: threads,
  } = useQuery<ChatThread[]>({
    queryKey: ["chatThreads", selectedThreadId, editingId],
    queryFn: () => threadRepo.getThreadList(),
  });

  const handleSaveTitle = async () => {
    if (editingId && editingTitle.trim().length > 0) {
      await threadRepo.updateThreadTitleById(editingId, editingTitle);
      setEditingId(null);
      setEditingTitle("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  return (
    <div className="w-70 border-r border-gray-200 h-screen overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="p-3 font-bold">{t("home.chatList.title")}</div>
        <button
          className="w-8 h-8 text-gray-500 hover:text-blue-500"
          onClick={() => {
            setSelectedThreadId("");
          }}
        >
          <IoMdAdd />
        </button>
      </div>
      {threads?.map((t: ChatThread) => (
        <div
          key={t.id}
          onClick={() => setSelectedThreadId(t.id)}
          className={`
            p-2.5 cursor-pointer transition-colors duration-500 flex items-center justify-between
            ${
              selectedThreadId === t.id
                ? "bg-blue-50 border-r-2 border-blue-500"
                : "hover:bg-gray-50"
            }
          `}
        >
          <div>
            <div className="font-semibold text-sm mb-1 truncate">
              {editingId === t.id ? (
                <input
                  type="text"
                  ref={inputRef}
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      // 엔터키가 눌렸을 때 실행할 함수
                      handleSaveTitle();
                    }
                    if (e.key === "Escape") {
                      // ESC키로 취소
                      handleCancelEdit();
                    }
                  }}
                  onBlur={() => {
                    // 포커스가 해제될 때 실행할 함수
                    handleSaveTitle();
                  }}
                />
              ) : (
                t.title
              )}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(t.updatedAt).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(t.id);
                setEditingTitle(t.title);
              }}
              className="w-6 h-6 text-gray-500 hover:text-yellow-500"
            >
              <FaEdit className="w-4 h-4" />
            </button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                await threadRepo.deleteThreadById(t.id);
                setSelectedThreadId("");
              }}
              className="w-6 h-6 text-gray-500 hover:text-red-500"
            >
              <FaTrash className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
