import { FaPlus } from "react-icons/fa6";
import { IoIosMore } from "react-icons/io";
import { noteRepo } from "@/managers/noteRepo";
import { useQuery } from "@tanstack/react-query";

import { Note } from "@/types/Note";
import { useNavigate } from "react-router-dom";
import { seperateTitleAndContentFromMarkdown } from "@/utils/extractTitleFromMarkdown";

export default function RecentNotes() {
  const navigate = useNavigate();

  const { data: notes } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => noteRepo.getAllNotes(),
  });

  return (
    <div className="mt-[150px] w-[744px] flex flex-col items-center max-h-[calc(100vh-600px)] overflow-y-auto scroll-hidden">
      <p className="mb-6 font-noto-sans-kr font-medium text-[28px]">
        Recent Notes
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div
          className="w-[240px] flex items-center justify-center cursor-pointer h-[180px] rounded-[12px] border-[1px] border-dashed border-[rgba(var(--color-chatbox-border-rgb),0.2)] bg-notebox-background"
          onClick={() => navigate("/notes")}
        >
          <FaPlus className="text-[28px] text-[rgba(var(--color-notebox-add-rgb),0.2)]" />
        </div>
        {notes?.map((note) => {
          const { title, content } = seperateTitleAndContentFromMarkdown(
            note.content
          );
          return (
            <div
              key={note.id}
              className="w-[240px] px-[16px] py-[14px] flex flex-col cursor-pointer h-[180px] rounded-[12px] border-[1px] border-solid border-[rgba(var(--color-chatbox-border-rgb),0.2)] bg-notebox-background"
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <p className="font-noto-sans-kr font-medium text-[16px] mb-3 line-clamp-2">
                {title}
              </p>
              <p className="line-clamp-3 font-noto-sans-kr text-[12px]">
                {content}
              </p>
              <div className="flex mt-auto items-center justify-between text-text-tertiary">
                <p className="font-noto-sans-kr text-[12px]">
                  {note.createdAt.toLocaleDateString()}
                </p>
                <IoIosMore className="text-[16px]" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
