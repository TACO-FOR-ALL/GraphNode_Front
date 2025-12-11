import { useState, useRef, useEffect } from "react";
import { IoClose, IoSearch } from "react-icons/io5";
import LogoIcon from "@/assets/icons/logo.svg";
import { noteRepo } from "@/managers/noteRepo";
import { useQuery } from "@tanstack/react-query";
import { Note } from "@/types/Note";
import { threadRepo } from "@/managers/threadRepo";
import { ChatThread } from "@/types/Chat";
import { useNavigate } from "react-router-dom";

export default function SearchModal({
  setOpenSearch,
}: {
  setOpenSearch: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: notes } = useQuery<Note[]>({
    queryKey: ["notes", searchQuery],
    queryFn: () => noteRepo.getNoteByQuery(searchQuery),
    enabled: searchQuery.length > 1,
  });

  const { data: chatThreads } = useQuery<ChatThread[]>({
    queryKey: ["chatThreads", searchQuery],
    queryFn: () => threadRepo.getThreadByQuery(searchQuery),
    enabled: searchQuery.length > 1,
  });

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Search Modal 드래그
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;
      setPosition((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      dragStartPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (modalRef.current) {
      dragStartPos.current = {
        x: e.clientX,
        y: e.clientY,
      };
      setIsDragging(true);
    }
  };

  // 검색어 하이라이트 함수
  const highlightText = (text: string, query: string) => {
    if (!query || query.length === 0) return text;

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="text-primary">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={() => setOpenSearch(false)}
    >
      <div
        ref={modalRef}
        className="flex flex-col w-[750px] h-[480px] shadow-[0_2px_20px_0_#badaff] rounded-2xl border-[1px] border-solid border-[rgba(var(--color-border-quaternary),0.08)] bg-[rgba(255,255,255,0.2)] backdrop-blur-[12px] overflow-hidden"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b-[1.5px] border-solid border-[rgba(var(--color-border-quaternary),0.08)] cursor-move flex-shrink-0"
          onMouseDown={handleHeaderMouseDown}
        >
          <div className="flex items-center gap-3 w-full">
            <IoSearch className="text-[16px] text-primary" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent outline-none border-none text-[14px] placeholder:text-text-secondary"
              type="text"
              placeholder="Search for chats and notes..."
            />
          </div>
          <div
            className="cursor-pointer ml-2 w-4 h-4 flex items-center justify-center hover:bg-sidebar-button-hover rounded-full bg-text-placeholder"
            onClick={(e) => {
              e.stopPropagation();
              setOpenSearch(false);
            }}
          >
            <IoClose className="text-[12px] text-white" />
          </div>
        </div>
        {/* content */}
        <section className="flex flex-col w-full flex-1 overflow-y-scroll custom-scrollbar px-4 py-3 gap-3">
          <div>
            <p className="font-noto-sans-kr font-medium text-[12px] text-text-secondary mb-2">
              Chats
            </p>
            {chatThreads && chatThreads.length > 0 ? (
              chatThreads.map((chatThread) => (
                <div
                  onClick={() => {
                    navigate(`/chat/${chatThread.id}`);
                    setOpenSearch(false);
                  }}
                  key={chatThread.id}
                  className="w-full group cursor-pointer flex flex-col items-start gap-2.5 hover:bg-search-item-hover rounded-[10px] p-3"
                >
                  <p className="font-noto-sans-kr font-medium text-[14px]">
                    {highlightText(chatThread.title, searchQuery)}
                  </p>
                  <p className="text-[12px] text-text-secondary line-clamp-1 group-hover:line-clamp-2">
                    {highlightText(chatThread.messages[0].content, searchQuery)}
                  </p>
                </div>
              ))
            ) : (
              <div className="w-full flex items-center justify-center py-1">
                <p className="text-[14px] font-medium">No chats found</p>
              </div>
            )}
          </div>
          <div>
            <p className="font-noto-sans-kr font-medium text-[12px] text-text-secondary mb-2">
              Notes
            </p>
            <div className="flex flex-col gap-2 items-start w-full">
              {notes && notes.length > 0 ? (
                notes.map((note) => (
                  <div
                    onClick={() => {
                      navigate(`/notes/${note.id}`);
                      setOpenSearch(false);
                    }}
                    key={note.id}
                    className="w-full group cursor-pointer flex flex-col items-start gap-2.5 hover:bg-search-item-hover rounded-[10px] p-3"
                  >
                    <p className="font-noto-sans-kr font-medium text-[14px]">
                      {highlightText(note.title, searchQuery)}
                    </p>
                    <p className="text-[12px] text-text-secondary line-clamp-1 group-hover:line-clamp-2">
                      {highlightText(note.content, searchQuery)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="w-full flex items-center justify-center py-1">
                  <p className="text-[14px] font-medium">No notes found</p>
                </div>
              )}
            </div>
          </div>
        </section>
        {/* footer */}
        <div className="px-4 py-[10px] border-t-[1.5px] border-solid border-[rgba(var(--color-border-quaternary),0.08)] flex items-center justify-between flex-shrink-0">
          <img src={LogoIcon} alt="logo" className="w-[16px] h-[16px]" />
          <div className="flex items-center gap-1 justify-center">
            <p className="text-[12px] mr-1 text-text-secondary">shortcut</p>
            <div className="flex items-center justify-center rounded-[6px] bg-text-placeholder w-[24px] h-[20px]">
              <span className="text-[12px] text-text-secondary">⌘</span>
            </div>
            <div className="flex items-center justify-center rounded-[6px] bg-text-placeholder w-[24px] h-[20px]">
              <span className="text-[12px] text-text-secondary">F</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
