import threadRepo from "@/managers/threadRepo";
import { ChatThread } from "@/types/Chat";
import { useQueryClient } from "@tanstack/react-query";
import { NEW_CONVERSATION_PLACEHOLDER } from "@/constants/chat";
import { FaPlus } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SidebarSkeletonList from "./SidebarSkeletonList";
import { useState, useRef, useEffect } from "react";
import SideExpandBarChatItem from "./SideExpandBarChatItem";

type RenameState = {
  id: string | null;
  title: string;
  savingId: string | null;
};

export default function SideExpandBarChat({
  data,
  selectedId,
  isLoading,
}: {
  data: ChatThread[];
  selectedId: string;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [renameState, setRenameState] = useState<RenameState>({
    id: null,
    title: "",
    savingId: null,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const savingIdRef = useRef<string | null>(null);
  const skipBlurSaveRef = useRef(false);
  const { id: editingId, title: editingTitle, savingId } = renameState;

  useEffect(() => {
    if (!editingId) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editingId]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // 페이지 이동 방지 (클릭 한번 채팅방 이동, 더블 클릭 채팅 수정)
  const clearPendingNavigation = () => {
    if (clickTimeoutRef.current) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
  };

  const handleDeleteThread = async (chatId: string) => {
    clearPendingNavigation();
    navigate("/chat");
    await threadRepo.deleteThreadById(chatId);
    // 캐시 값을 직접 수정하여 낙관적 업데이트
    queryClient.setQueryData<ChatThread[]>(["chatThreads"], (old) =>
      (old ?? []).filter((thread) => thread.id !== chatId),
    );
    // 조건에 맞는 캐시 삭제
    queryClient.removeQueries({
      queryKey: ["chatThreads"],
      exact: false,
      predicate: (query) => query.queryKey.length > 1,
    });
    // 기존 케시를 만료시키고 서버 호출
    await queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
    await queryClient.invalidateQueries({ queryKey: ["graphData"] });
  };

  const startEditing = (thread: ChatThread) => {
    if (
      thread.title === NEW_CONVERSATION_PLACEHOLDER ||
      savingId === thread.id
    ) {
      return;
    }
    clearPendingNavigation();
    setRenameState({
      id: thread.id,
      title: thread.title,
      savingId: null,
    });
  };

  const cancelEditing = () => {
    setRenameState((prev) => ({
      ...prev,
      id: null,
      title: "",
    }));
  };

  const finishSaving = async () => {
    savingIdRef.current = null;
    setRenameState({
      id: null,
      title: "",
      savingId: null,
    });
    await queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
  };

  const updateListTitle = (threadId: string, title: string) => {
    queryClient.setQueryData<ChatThread[]>(["chatThreads"], (old) =>
      (old ?? []).map((item) =>
        item.id === threadId ? { ...item, title, updatedAt: Date.now() } : item,
      ),
    );
  };

  const saveTitle = async (thread: ChatThread) => {
    if (savingIdRef.current === thread.id || editingId !== thread.id) {
      return;
    }

    const nextTitle = editingTitle.trim();

    if (!nextTitle || nextTitle === thread.title) {
      cancelEditing();
      return;
    }

    savingIdRef.current = thread.id;
    setRenameState((prev) => ({
      ...prev,
      savingId: thread.id,
    }));
    updateListTitle(thread.id, nextTitle);

    try {
      await threadRepo.updateThreadTitleById(thread.id, nextTitle);
    } catch (error) {
      console.error("[SideExpandBarChat] Failed to rename chat:", error);
      await queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
    } finally {
      await finishSaving();
    }
  };

  const handleItemClick = (threadId: string) => {
    if (editingId === threadId) return;
    clearPendingNavigation();
    clickTimeoutRef.current = window.setTimeout(() => {
      navigate(`/chat/${threadId}`);
      clickTimeoutRef.current = null;
    }, 200);
  };

  return (
    <div className="flex flex-col h-full pl-3 pr-0.5 pb-13">
      <div
        className="cursor-pointer mb-2 flex items-center gap-x-1.5 px-[6px] py-2 text-text-secondary hover:text-primary rounded-[6px] hover:bg-sidebar-button-hover transition-colors duration-300"
        onClick={() => navigate("/chat")}
      >
        <FaPlus className="w-4 h-4" />
        <p className="text-[14px] font-normal font-noto-sans-kr">
          {t("chat.newChat")}
        </p>
      </div>

      {isLoading ? (
        <SidebarSkeletonList />
      ) : (
        <div className="flex flex-col gap-[6px] overflow-y-auto flex-1 min-h-0 pb-20">
          {data &&
            data.map((item) => {
              const isSelected = selectedId === item.id;
              const isEditing = editingId === item.id;
              const isSaving = savingId === item.id;
              return (
                <SideExpandBarChatItem
                  key={item.id}
                  item={item}
                  isSelected={isSelected}
                  isEditing={isEditing}
                  isSaving={isSaving}
                  editingTitle={editingTitle}
                  inputRef={inputRef}
                  onClick={() => handleItemClick(item.id)}
                  onDoubleClick={() => startEditing(item)}
                  onTitleChange={(title) =>
                    setRenameState((prev) => ({
                      ...prev,
                      title,
                    }))
                  }
                  onBlur={() => {
                    if (skipBlurSaveRef.current) {
                      skipBlurSaveRef.current = false;
                      return;
                    }
                    void saveTitle(item);
                  }}
                  onEnter={() => void saveTitle(item)}
                  onEscape={() => {
                    skipBlurSaveRef.current = true;
                    cancelEditing();
                  }}
                  onDelete={() => void handleDeleteThread(item.id)}
                />
              );
            })}
        </div>
      )}
    </div>
  );
}
