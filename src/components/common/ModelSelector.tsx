import { useEffect, useRef, useState } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { OPENAI_MODEL, OPENAI_MODEL_DEFAULT, OpenAIModel } from "@/constants/OPENAI_MODEL";

interface ModelSelectorProps {
  value?: OpenAIModel;
  onChange?: (model: OpenAIModel) => void;
}

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<OpenAIModel>(value ?? OPENAI_MODEL_DEFAULT);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 외부에서 value가 변경되면 동기화
  useEffect(() => {
    if (value !== undefined) {
      setSelectedModel(value);
    }
  }, [value]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (model: OpenAIModel) => {
    setSelectedModel(model);
    setIsOpen(false);
    onChange?.(model);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex gap-1 items-center cursor-pointer bg-[rgba(var(--color-chatbox-active-rgb),0.05)] p-[6px] rounded-[8px] shadow-[0_0_3px_0_#badaff] hover:bg-[rgba(var(--color-chatbox-active-rgb),0.1)] transition-colors"
      >
        <p className="font-noto-sans-kr text-[12px] font-medium text-text-secondary">
          <span className="text-chatbox-active">ChatGPT</span> {selectedModel}
        </p>
        {isOpen ? (
          <IoIosArrowUp className="text-[16px] text-chatbox-active" />
        ) : (
          <IoIosArrowDown className="text-[16px] text-chatbox-active" />
        )}
      </div>
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-bg-primary border border-base-border rounded-lg shadow-lg overflow-hidden z-50">
          {OPENAI_MODEL.map((model) => (
            <div
              key={model}
              onClick={() => handleSelect(model)}
              className={`px-3 py-2 cursor-pointer text-[12px] font-medium transition-colors ${
                selectedModel === model
                  ? "bg-primary/10 text-primary"
                  : "text-text-secondary hover:bg-bg-secondary"
              }`}
            >
              <span className="text-chatbox-active">ChatGPT</span> {model}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
