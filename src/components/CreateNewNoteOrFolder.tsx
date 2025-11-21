import { FaPlus } from "react-icons/fa6";
import { IoFolder } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

export default function CreateNewNoteOrFolder({
  handleStartCreateFolder,
}: {
  handleStartCreateFolder: (parentId: string | null) => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex gap-1 mb-2">
      <div
        className="cursor-pointer w-full flex items-center gap-1 px-[6px] py-2 text-text-secondary bg-white border-[0.6px] border-solid rounded-[6px] border-sidebar-button-border hover:bg-sidebar-button-hover transition-colors duration-300"
        onClick={() => navigate("/notes")}
      >
        <FaPlus className="text-[14px]" />
        <p className="text-[14px] font-light font-noto-sans-kr">New Note</p>
      </div>
      <div
        className="cursor-pointer w-full flex items-center justify-center gap-1 px-[6px] py-2 text-text-secondary bg-white border-[0.6px] border-solid rounded-[6px] border-sidebar-button-border hover:bg-sidebar-button-hover transition-colors duration-300"
        onClick={() => handleStartCreateFolder(null)} // 여기서는 무조건 ROOT에 생성
      >
        <IoFolder className="text-[14px]" />
        <p className="text-[14px] font-light font-noto-sans-kr">New Folder</p>
      </div>
    </div>
  );
}
