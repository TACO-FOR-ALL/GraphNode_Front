import { ChatThread } from "@/types/Chat";
import { FaPlus } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
export default function SideExpandBarChat({
  data,
  selectedId,
}: {
  data: ChatThread[];
  selectedId: string;
}) {
  const navigate = useNavigate();

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
                className={`text-[14px] font-normal font-noto-sans-kr py-[5.5px] h-[32px] px-[6px] rounded-[6px] transition-colors duration-300 ${
                  isSelected
                    ? "bg-sidebar-button-hover text-chatbox-active"
                    : "text-text-secondary hover:bg-sidebar-button-hover hover:text-chatbox-active"
                }`}
                key={item.id}
                onClick={() => navigate(`/chat/${item.id}`)}
              >
                <div className="w-[195px] truncate">{item.title}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
