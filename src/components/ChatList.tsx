import { useTranslation } from "react-i18next";
import threadRepo from "../managers/threadRepo";
import { FaTrash } from "react-icons/fa";
import { FaEdit } from "react-icons/fa";
import { useState } from "react";

export default function ChatList({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  const threads = threadRepo.list();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const { t } = useTranslation();

  const handleSaveTitle = () => {
    if (editingId) {
      threadRepo.rename(editingId, editingTitle);
      setEditingId(null);
    }
  };
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  return (
    <div className="w-70 border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-3 font-bold">{t("home.chatList.title")}</div>
      {threads.length === 0 && (
        <div className="p-3 text-gray-500">
          <p className="mb-3">{t("home.chatList.noChat")}</p>
          <button
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-150 font-medium"
            onClick={() => {}}
          >
            {t("home.chatList.startChat")}
          </button>
        </div>
      )}
      {threads.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`
            p-2.5 cursor-pointer transition-colors duration-500 flex items-center justify-between
            ${
              selectedId === t.id
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
              onClick={() => threadRepo.removeItem(t.id)}
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
