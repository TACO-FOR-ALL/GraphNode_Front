import AutoResizeTextarea from "@/components/AutoResizeTextArea";
import { useState } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { FaArrowRight, FaPlus } from "react-icons/fa6";
import { IoIosMore } from "react-icons/io";
import { noteRepo } from "@/managers/noteRepo";
import { useQuery } from "@tanstack/react-query";
import { threadRepo } from "@/managers/threadRepo";
import { ChatThread } from "@/types/Chat";
import { Note } from "@/types/Note";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const handleSend = () => {
    console.log("send");
  };

  const { data: chatThreads } = useQuery<ChatThread[]>({
    queryKey: ["chatThreads"],
    queryFn: () => threadRepo.getThreadList(),
  });

  const { data: notes } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => noteRepo.getNoteList(),
  });

  return (
    <div className="flex flex-col items-center">
      {/* title */}
      <div className="mt-[140px] flex flex-col items-center justify-center gap-3 mb-10">
        <p className="font-noto-sans-kr font-semibold text-[28px]">
          Hello John Han
        </p>
        <p className="font-noto-sans-kr text-[28px]">Welcome to GraphNode</p>
      </div>
      {/* chatbox */}
      <div className="flex w-[744px] flex-col py-3 pl-3 items-center justify-center rounded-xl border-[1px] border-[rgba(var(--color-chatbox-border-rgb),0.2)] border-solid shadow-[0_2px_20px_0_#badaff]">
        <AutoResizeTextarea
          value={input}
          onChange={setInput}
          placeholder="How can I help you?"
        />
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-1 items-center cursor-pointer bg-[rgba(var(--color-chatbox-active-rgb),0.05)] p-[6px] rounded-[8px] shadow-[0_0_3px_0_#badaff]">
            <p className="font-noto-sans-kr text-[12px] font-medium text-text-secondary">
              <span className="text-chatbox-active">ChatGPT</span> 5.1 Instant
            </p>
            <IoIosArrowDown className="text-[16px] text-chatbox-active" />
          </div>
          <div
            onClick={() => input.length > 0 && handleSend()}
            className={`w-[28px] h-[28px] text-white p-[6px] text-[16px] rounded-[8px] mr-3 ${input.length > 0 ? "bg-chatbox-active cursor-pointer" : "bg-text-placeholder cursor-not-allowed"}`}
          >
            <FaArrowRight />
          </div>
        </div>
      </div>
      {/* notebox */}
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
          {notes?.map((note) => (
            <div
              key={note.id}
              className="w-[240px] px-[16px] py-[14px] flex flex-col cursor-pointer h-[180px] rounded-[12px] border-[1px] border-solid border-[rgba(var(--color-chatbox-border-rgb),0.2)] bg-notebox-background"
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <p className="font-noto-sans-kr font-medium text-[16px] mb-3">
                {note.title}
              </p>
              <p className="line-clamp-3 font-noto-sans-kr text-[12px]">
                {note.content}
              </p>
              <div className="flex mt-11 items-center justify-between text-text-tertiary">
                <p className="font-noto-sans-kr text-[12px]">
                  {note.createdAt.toLocaleDateString()}
                </p>
                <IoIosMore className="text-[16px]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
