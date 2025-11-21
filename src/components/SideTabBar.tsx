import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { PiNotePencil } from "react-icons/pi";
import { IoSettingsOutline, IoShareSocialOutline } from "react-icons/io5";
import { FiSearch } from "react-icons/fi";
import {
  TbLayoutSidebarLeftExpand,
  TbLayoutSidebarRightExpand,
} from "react-icons/tb";
import { Note } from "@/types/Note";
import { ChatThread } from "@/types/Chat";
import { threadRepo } from "@/managers/threadRepo";
import { noteRepo } from "@/managers/noteRepo";
import { useQuery } from "@tanstack/react-query";

const NAVIGATION_ITEMS = [
  { id: "/", image: "/icons/logo.png", label: "/" },
  { id: "chat", icon: <FaPlus />, label: "chat" },
  { id: "notes", icon: <PiNotePencil />, label: "notes" },
  { id: "visualize", icon: <IoShareSocialOutline />, label: "visualize" },
  { id: "search", icon: <FiSearch />, label: "search" },
];

export default function SideTabBar() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const path = useLocation().pathname;

  const showSidebarExpanded = useMemo(
    () => path.includes("/chat") || path.includes("/notes"),
    [path]
  );

  // URL에서 현재 선택된 ID 추출
  const selectedId = useMemo(() => {
    const pathParts = path.split("/");
    if (pathParts.length >= 3) {
      return pathParts[2]; // /notes/:noteId 또는 /chat/:threadId
    }
    return null;
  }, [path]);

  const [isExpanded, setIsExpanded] = useState(true);

  // React Query를 사용하여 데이터 페칭 및 자동 업데이트
  const { data: chatThreads } = useQuery<ChatThread[]>({
    queryKey: ["chatThreads"],
    queryFn: () => threadRepo.getThreadList(),
    enabled: path.includes("/chat"),
  });

  const { data: notes } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => noteRepo.getNoteList(),
    enabled: path.includes("/notes"),
  });

  // 현재 경로에 따라 적절한 데이터 선택
  const data = path.includes("/chat")
    ? (chatThreads as Note[] | ChatThread[] | null)
    : path.includes("/notes")
      ? (notes as Note[] | ChatThread[] | null)
      : null;

  return (
    <div className="flex h-full">
      {/* Sidebar Collapsed - Navigation */}
      <div
        className={`bg-sidebar-background flex flex-col py-2.5 px-2.5 items-stretch justify-between`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          {NAVIGATION_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-center text-text-secondary text-[16px] p-[6px] rounded-[6px] ${item.id === path.split("/")[1] ? "bg-sidebar-tab-selected text-white" : ""} ${item.id === "home" ? "bg-transparent" : ""} hover:bg-sidebar-tab-selected hover:text-white transition-colors duration-300 w-[28px] h-[28px]`}
              onClick={() => navigate(`/${item.id}`)}
            >
              {item.image ? (
                <img src={item.image as string} alt={item.label} />
              ) : (
                item.icon
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-center gap-2">
          <div
            key="profile"
            className="flex items-center justify-center p-[6px]"
          >
            <img
              src="/icons/profile.jpeg"
              alt="profile"
              className="w-[28px] h-[28px] rounded-full hover:bg-sidebar-tab-selected transition-colors duration-300"
            />
          </div>
          <div
            key="settings"
            className="flex items-center justify-center p-[6px] hover:bg-sidebar-tab-selected transition-colors duration-300"
          >
            <IoSettingsOutline onClick={() => navigate("/settings")} />
          </div>
        </div>
      </div>
      {/* Sidebar Expanded - Chat or Note List */}
      {showSidebarExpanded && (
        <div
          className={`bg-sidebar-expanded-background duration-500 transition-all ${isExpanded ? "w-[259px]" : "w-[40px]"} flex flex-col gap-4.5`}
        >
          <div className="flex px-3 py-4">
            {isExpanded ? (
              <TbLayoutSidebarRightExpand
                onClick={() => setIsExpanded(false)}
                className="text-text-secondary text-[16px] ml-auto"
              />
            ) : (
              <TbLayoutSidebarLeftExpand
                onClick={() => setIsExpanded(true)}
                className="text-text-secondary text-[16px] ml-auto"
              />
            )}
          </div>

          {isExpanded && (
            <div className="px-3">
              <div
                className="cursor-pointer mb-2 flex items-center gap-1 px-[6px] py-2 text-text-secondary bg-white border-[0.6px] border-solid rounded-[6px] border-sidebar-button-border hover:bg-sidebar-button-hover transition-colors duration-300"
                onClick={() => navigate("/notes")}
              >
                <FaPlus className="text-[16px]" />
                <p className="text-[14px] font-normal font-noto-sans-kr">
                  {`New ${path.includes("/chat") ? "Chat" : "Note"}`}
                </p>
              </div>
              <div className="flex flex-col gap-[6px]">
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
                        onClick={() =>
                          path.includes("/chat")
                            ? navigate(`/chat/${item.id}`)
                            : navigate(`/notes/${item.id}`)
                        }
                      >
                        <div className="w-[195px] truncate">{item.title}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
