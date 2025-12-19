import AutoResizeTextarea from "@/components/AutoResizeTextArea";
import { IoIosArrowDown } from "react-icons/io";
import { FaArrowRight } from "react-icons/fa6";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import threadRepo from "@/managers/threadRepo";
import uuid from "@/utils/uuid";

export default function ChatBox() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      // 새 스레드 생성
      const created = await threadRepo.create("loading…", []);

      const id = uuid();

      // 첫 메시지 추가
      const userMsg = {
        id: id,
        role: "user" as const,
        content: text,
        ts: Date.now(),
      };
      await threadRepo.addMessageToThreadById(created.id, userMsg);

      // Chat 페이지로 이동 (자동 전송 플래그와 함께)
      navigate(`/chat/${created.id}`, {
        state: { autoSend: true, initialMessage: text, id: id },
      });
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex w-[744px] flex-col py-3 pl-3 items-center justify-center rounded-xl border-[1px] border-[rgba(var(--color-chatbox-border-rgb),0.2)] border-solid shadow-[0_2px_20px_0_#badaff]">
      <AutoResizeTextarea
        value={input}
        onChange={setInput}
        placeholder="How can I help you?"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && input.trim() && !sending) {
            e.preventDefault();
            handleSend();
          }
        }}
        disabled={sending}
      />
      <div className="flex items-center justify-between w-full">
        <div className="flex gap-1 items-center cursor-pointer bg-[rgba(var(--color-chatbox-active-rgb),0.05)] p-[6px] rounded-[8px] shadow-[0_0_3px_0_#badaff]">
          <p className="font-noto-sans-kr text-[12px] font-medium text-text-secondary">
            <span className="text-chatbox-active">ChatGPT</span> 5.1 Instant
          </p>
          <IoIosArrowDown className="text-[16px] text-chatbox-active" />
        </div>
        <div
          onClick={() => input.trim().length > 0 && !sending && handleSend()}
          className={`w-[28px] h-[28px] text-white p-[6px] text-[16px] rounded-[8px] mr-3 flex items-center justify-center ${
            input.trim().length > 0 && !sending
              ? "bg-chatbox-active cursor-pointer"
              : "bg-text-placeholder cursor-not-allowed"
          }`}
        >
          <FaArrowRight />
        </div>
      </div>
    </div>
  );
}
