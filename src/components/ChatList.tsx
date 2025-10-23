import { useTranslation } from "react-i18next";
import threadRepo from "../managers/threadRepo";
import { FaTrash } from "react-icons/fa";
import { FaEdit } from "react-icons/fa";
import { useEffect, useState } from "react";
import { ChatThread } from "@/types/Chat";
import { IoMdAdd } from "react-icons/io";
import { useSelectedThreadStore } from "@/store/useSelectedThreadStore";
import { useThreadTitleStore } from "@/store/useThreadTitleStore";

export default function ChatList() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const { t } = useTranslation();
  const { selectedThreadId, setSelectedThreadId } = useSelectedThreadStore();
  const { threadTitleChanged, setThreadTitleChanged } = useThreadTitleStore();

  useEffect(() => {
    const fetchThreads = async () => {
      const threads = await threadRepo.getThreadList();
      setThreads(threads);
      setThreadTitleChanged(false);
    };
    fetchThreads();
  }, [selectedThreadId, threadTitleChanged]);

  const handleSaveTitle = async () => {
    if (editingId) {
      const updatedId = await threadRepo.updateThreadTitleById(
        editingId,
        editingTitle
      );
      if (updatedId) {
        setThreads(
          threads.map((t) =>
            t.id === updatedId ? { ...t, title: editingTitle } : t
          )
        );
      }
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
      {threads.map((t) => (
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
            <button className="w-6 h-6 text-gray-500 hover:text-yellow-500">
              <FaEdit
                onClick={() => {
                  setEditingId(t.id);
                  setEditingTitle(t.title);
                }}
                className="w-4 h-4"
              />
            </button>
            <button
              onClick={async () => {
                await threadRepo.deleteThreadById(t.id);
                setThreads(threads.filter((t) => t.id !== t.id));
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
