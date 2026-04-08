import threadRepo from "@/managers/threadRepo";
import { ChatThread } from "@/types/Chat";
import { useQueryClient } from "@tanstack/react-query";
import { NEW_CONVERSATION_PLACEHOLDER } from "@/constants/chat";
import { FaPlus } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useTranslation } from "react-i18next";
import SidebarSkeletonList from "./SidebarSkeletonList";

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

  const handleDeleteThread = async (chatId: string) => {
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
  };

  return (
    <div className="px-3 flex flex-col h-full">
      <div
        className="cursor-pointer mb-2 flex items-center gap-1 px-[6px] py-2 text-text-secondary hover:text-primary rounded-[6px] hover:bg-sidebar-button-hover transition-colors duration-300"
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
        <div className="flex flex-col gap-[6px] overflow-y-auto flex-1 min-h-0 scroll-hidden pb-20">
          {data &&
            data.map((item) => {
              const isSelected = selectedId === item.id;
              return (
                <div
                  className={`text-[14px] font-normal flex items-center justify-between font-noto-sans-kr py-[5.5px] h-[32px] px-[6px] rounded-[6px] transition-colors duration-300 group ${
                    isSelected
                      ? "bg-sidebar-button-hover text-chatbox-active"
                      : " hover:bg-sidebar-button-hover text-text-secondary hover:text-chatbox-active"
                  }`}
                  key={item.id}
                  onClick={() => navigate(`/chat/${item.id}`)}
                >
                  <div className="w-[195px] h-[20px] flex items-center gap-1.5 overflow-hidden">
                    {item.title === NEW_CONVERSATION_PLACEHOLDER ? (
                      <AiOutlineLoading3Quarters className="animate-spin text-[14px] flex-shrink-0" />
                    ) : (
                      <span className="truncate">{item.title}</span>
                    )}
                  </div>
                  <FaTrash
                    className="text-[10px] cursor-pointer hidden group-hover:block"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteThread(item.id);
                    }}
                  />
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
