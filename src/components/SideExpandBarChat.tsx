import {
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
// FaPlus removed per UI spec (no icon next to New chat)
import { IoIosArrowDown } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import threadRepo from "@/managers/threadRepo";
import type { ChatThread } from "@/types/Chat";
import NoteIcon from "@/assets/icons/note.svg";
import NoteIconActive from "@/assets/icons/note_active.svg";
import ShareIcon from "@/assets/icons/share.svg";
import ShareIconActive from "@/assets/icons/share_active.svg";
import FolderIcon from "@/assets/icons/Vector.svg";
import FolderIconActive from "@/assets/icons/Vector+.svg";

type Props = {
  data?: ChatThread[];
  selectedId?: string;
};

// Toggle removed: reverting to single New chat button as requested

//컴포넌트 선언 + 상태들
export default function SideExpandBarChat({ data = [], selectedId }: Props) {
  const navigate = useNavigate();
  const [creatingChat, setCreatingChat] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isFoldersOpen, setIsFoldersOpen] = useState(true);
  const [isRecentOpen, setIsRecentOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCreateChat = async () => {
    if (creatingChat) return;
    setCreatingChat(true);
    try {
      const created = await threadRepo.create("New chat", []);
      navigate(`/chat/${created.id}`);
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setCreatingChat(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const names = Array.from(files).map((file) => file.name);
    setUploadedFiles(names);
  };

  const filteredThreads = data.filter(
    (thread) => (thread.messages?.length ?? 0) > 0
  );

  return (
    <div className="h-full flex flex-col bg-[#f7f7f9] text-gray-800">
  <div className="px-[12px] py-[8px] flex items-center gap-2">
        <button
          className="w-[259px] h-[32px] flex items-center pl-[12px] rounded-lg border border-gray-200 bg-white text-sm text-gray-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleCreateChat}
          disabled={creatingChat}
        >
          <span>{creatingChat ? "Creating..." : "New chat"}</span>
        </button>

        {/* no toggle — only New chat button per user request */}
      </div>

  {/* 전체 목록의 기본 폰트 크기를 12px로 설정 (New chat 버튼은 제외) */}
  <div className="px-[12px] flex-1 overflow-y-auto space-y-[6px] text-[12px]">
        <div className="space-y-[6px]">
          <div
            className="group flex items-center gap-[6px] px-[12px] py-1 rounded-lg cursor-pointer hover:bg-gray-100"
            onClick={() => navigate("/notes")}
          >
            <img
              src={NoteIcon}
              alt="Note"
              className="w-[16px] h-[16px] group-hover:hidden"
            />
            <img
              src={NoteIconActive}
              alt="Note active"
              className="w-[16px] h-[16px] hidden group-hover:inline"
            />
            <span className="text-[12px]">Note</span>
          </div>

          <div
            className="group flex items-center gap-[6px] px-[12px] py-1 rounded-lg cursor-pointer hover:bg-gray-100"
            onClick={() => navigate("/visualize")}
          >
            <img
              src={ShareIcon}
              alt="Graph view"
              className="w-[16px] h-[16px] group-hover:hidden"
            />
            <img
              src={ShareIconActive}
              alt="Graph view active"
              className="w-[16px] h-[16px] hidden group-hover:inline"
            />
            <span className="text-[12px]">Graph</span>
          </div>
        </div>

        <div className="space-y-[6px]">
          <button
            type="button"
            onClick={() => setIsFoldersOpen((prev) => !prev)}
            className="flex items-center gap-1 text-[12px] text-gray-500 font-12px px-[12px] w-full text-left hover:text-gray-700"
          >
            <span className="text-[12px]">폴더</span>
            <IoIosArrowDown
              className={`text-[12px] transition-transform duration-200 ${
                isFoldersOpen ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          {isFoldersOpen && (
            <>
              <div className="group flex items-center gap-[6px] px-[12px] py-1 rounded-lg cursor-pointer hover:bg-gray-100">
                <img
                  src={FolderIcon}
                  alt="Folder"
                  className="w-[16px] h-[16px] group-hover:hidden"
                />
                <img
                  src={FolderIconActive}
                  alt="Folder active"
                  className="w-[16px] h-[16px] hidden group-hover:inline"
                />
                <span className="text-[12px]">학교</span>
              </div>
              <div className="group flex items-center gap-[6px] px-[12px] py-1 rounded-lg cursor-pointer hover:bg-gray-100">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFilesSelected}
                />
                <img
                  src={FolderIcon}
                  alt="Folder"
                  className="w-[16px] h-[16px] group-hover:hidden"
                />
                <img
                  src={FolderIconActive}
                  alt="Folder active"
                  className="w-[16px] h-[16px] hidden group-hover:inline"
                />
                <span
                  className="text-[12px]"
                  role="button"
                  tabIndex={0}
                  onClick={handleUploadClick}
                  onKeyDown={(e: KeyboardEvent<HTMLSpanElement>) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleUploadClick();
                    }
                  }}
                >
                  새 폴더
                </span>
              </div>
            </>
          )}
        </div>

        <div className="space-y-[6px]">
          <button
            type="button"
            onClick={() => setIsRecentOpen((prev) => !prev)}
            className="flex items-center gap-1 text-[12px] text-gray-500 font-medium px-[12px] w-full text-left hover:text-gray-700"
          >
            <span className="text-[12px]">Recent</span>
            <IoIosArrowDown
              className={`text-[12px] transition-transform duration-200 ${
                isRecentOpen ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>
          {isRecentOpen && (
            <div className="flex flex-col gap-[6px]">
              {filteredThreads.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/chat/${item.id}`)}
                    className={`w-full text-left px-[12px] py-2 rounded-lg text-[12px] truncate transition border ${
                      isSelected
                        ? "bg-[#e8f0ff] text-[#3563e9] border-[#d4dffb]"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {item.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {uploadedFiles.length > 0 && (
          <div className="space-y-[6px] px-1">
            <div className="text-[12px] text-gray-500 font-medium">
              업로드됨
            </div>
            {uploadedFiles.map((name) => (
              <div
                key={name}
                className="text-[12px] text-gray-700 truncate px-2 py-1 bg-gray-50 rounded"
                title={name}
              >
                {name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
