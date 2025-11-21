import { IoChevronForward } from "react-icons/io5";
import { MdDeleteOutline } from "react-icons/md";

export default function NewFolderField({
  newFolderName,
  setNewFolderName,
  handleCreateFolder,
  handleCancelCreateFolder,
  depth,
}: {
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  handleCreateFolder: () => void;
  handleCancelCreateFolder: () => void;
  depth: number | 0;
}) {
  return (
    <div
      className={`flex items-center gap-1 px-[6px] py-[5.5px] h-[32px] rounded-[6px] transition-colors duration-300 text-text-secondary hover:bg-sidebar-button-hover group mb-[6px] ${depth > 0 ? "ml-4" : ""}`}
    >
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <IoChevronForward className="text-[12px]" />
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              handleCreateFolder();
            } else if (e.key === "Escape") {
              e.stopPropagation();
              handleCancelCreateFolder();
            }
          }}
          onBlur={() => {
            // 포커스를 잃으면 취소
            handleCancelCreateFolder();
          }}
          className="flex-1 bg-transparent border-none outline-none text-[14px] font-normal font-noto-sans-kr placeholder:text-text-secondary placeholder:opacity-50"
          placeholder="Enter folder name"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <MdDeleteOutline
          className="text-[14px] cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            handleCancelCreateFolder();
          }}
        />
      </div>
    </div>
  );
}
