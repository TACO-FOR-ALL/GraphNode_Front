import AutoResizeTextarea from "@/components/AutoResizeTextArea";
import { IoIosArrowDown } from "react-icons/io";
import { FaArrowRight } from "react-icons/fa6";
import { useState } from "react";

export default function ChatBox() {
  const [input, setInput] = useState("");
  const handleSend = () => {
    console.log("send");
  };

  return (
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
  );
}
