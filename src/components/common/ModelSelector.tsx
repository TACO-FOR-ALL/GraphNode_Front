import { useEffect, useRef, useState } from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import {
  LLM_MODEL_GROUPS,
  getProvider,
  type LLMModel,
} from "@/constants/OPENAI_MODEL";

interface ModelSelectorProps {
  value: LLMModel;
  onChange: (model: LLMModel) => void;
}

const PROVIDER_STYLES: Record<
  string,
  { label: string; colorClass: string; color: string; rgb: string }
> = {
  openai: {
    label: "ChatGPT",
    colorClass: "text-openai-active",
    color: "#2b89f8",
    rgb: "43, 137, 248",
  },
  claude: {
    label: "Claude",
    colorClass: "text-claude-active",
    color: "#D97757",
    rgb: "217, 119, 87",
  },
  gemini: {
    label: "Gemini",
    colorClass: "text-gemini-active",
    color: "#8C7DCE",
    rgb: "140, 125, 206",
  },
};

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState<LLMModel>(value);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const provider = getProvider(selectedModel);
  const providerStyle = PROVIDER_STYLES[provider];

  // 외부에서 value가 변경되면 동기화
  useEffect(() => {
    if (value !== undefined) {
      setSelectedModel(value);
    }
  }, [value]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (model: LLMModel) => {
    setSelectedModel(model);
    setIsOpen(false);
    onChange?.(model);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          backgroundColor: `rgba(${providerStyle.rgb}, 0.05)`,
          boxShadow: `0 0 3px 0 rgba(${providerStyle.rgb}, 0.4)`,
        }}
        className="flex gap-1 items-center cursor-pointer p-[6px] rounded-[8px] hover:opacity-80 transition-opacity"
      >
        <p className="font-noto-sans-kr text-[12px] font-medium text-text-secondary">
          <span className={providerStyle.colorClass}>
            {providerStyle.label}
          </span>{" "}
          {selectedModel}
        </p>
        {isOpen ? (
          <IoIosArrowUp
            className="text-[16px]"
            style={{ color: providerStyle.color }}
          />
        ) : (
          <IoIosArrowDown
            className="text-[16px]"
            style={{ color: providerStyle.color }}
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-52 bg-bg-primary border border-base-border rounded-lg shadow-lg overflow-y-auto max-h-[250px] z-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LLM_MODEL_GROUPS.map((group, groupIdx) => {
            const groupStyle = PROVIDER_STYLES[group.provider];
            return (
              <div key={group.provider}>
                {groupIdx > 0 && (
                  <div className="border-t border-base-border" />
                )}
                <div className="px-3 py-1.5">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: groupStyle.color }}
                  >
                    {groupStyle.label}
                  </span>
                </div>
                {group.models.map((model) => (
                  <div
                    key={model}
                    onClick={() => handleSelect(model)}
                    className={`px-3 py-2 cursor-pointer text-[12px] font-medium transition-colors ${
                      selectedModel === model
                        ? "bg-bg-secondary"
                        : "text-text-secondary hover:bg-bg-secondary"
                    }`}
                    style={
                      selectedModel === model
                        ? { color: groupStyle.color }
                        : undefined
                    }
                  >
                    {model}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
