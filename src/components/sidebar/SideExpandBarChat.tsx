import threadRepo from "@/managers/threadRepo";
import { ChatThread } from "@/types/Chat";
import { useQueryClient } from "@tanstack/react-query";
import { FaPlus } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { FaTrash } from "react-icons/fa";

export default function SideExpandBarChat({
  data,
  selectedId,
}: {
  data: ChatThread[];
  selectedId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleDeleteThread = async (chatId: string) => {
    await threadRepo.deleteThreadById(chatId);
    queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
  };

  return (
    <div className="px-3 flex flex-col h-full">
      <div
        className="cursor-pointer mb-2 flex items-center gap-1 px-[6px] py-2 text-text-secondary hover:text-primary rounded-[6px] hover:bg-sidebar-button-hover transition-colors duration-300"
        onClick={() => navigate("/chat")}
      >
        <FaPlus className="w-4 h-4" />
        <p className="text-[14px] font-normal font-noto-sans-kr">New Chat</p>
      </div>
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
                <div className="w-[195px] truncate">{item.title}</div>
                <FaTrash
                  className="text-[10px] cursor-pointer hidden group-hover:block"
                  onClick={() => handleDeleteThread(item.id)}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}
