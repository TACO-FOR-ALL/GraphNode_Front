import { useState, useRef, useEffect } from "react";
import { IoClose, IoSearch } from "react-icons/io5";
import LogoIcon from "@/assets/icons/logo.svg";
import { noteRepo } from "@/managers/noteRepo";
import { useQuery } from "@tanstack/react-query";
import { Note } from "@/types/Note";
import { threadRepo } from "@/managers/threadRepo";
import { ChatThread } from "@/types/Chat";
import DraggableModal from "../DraggableModal";
import SearchResult from "./SearchResult";
import useDebounce from "@/hooks/useDebounce";

export default function SearchModal({
  setOpenSearch,
}: {
  setOpenSearch: (open: boolean) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: notes } = useQuery<Note[]>({
    queryKey: ["notes", debouncedSearchQuery],
    queryFn: () => noteRepo.getNoteByQuery(debouncedSearchQuery),
    enabled: searchQuery.length > 1,
  });

  const { data: chatThreads } = useQuery<ChatThread[]>({
    queryKey: ["chatThreads", debouncedSearchQuery],
    queryFn: () => threadRepo.getThreadByQuery(debouncedSearchQuery),
    enabled: searchQuery.length > 1,
  });

  return (
    <DraggableModal setOpenModal={setOpenSearch}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b-[1.5px] border-solid border-[rgba(var(--color-border-quaternary),0.08)] cursor-move flex-shrink-0">
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
        <SearchResult
          type="chat"
          title="Chats"
          data={chatThreads}
          searchQuery={searchQuery}
          setOpenSearch={setOpenSearch}
        />
        <SearchResult
          type="note"
          title="Notes"
          data={notes}
          searchQuery={searchQuery}
          setOpenSearch={setOpenSearch}
        />
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
    </DraggableModal>
  );
}
