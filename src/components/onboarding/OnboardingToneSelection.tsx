import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useOnboardingStore, AgentTone } from "@/store/useOnboardingStore";
import OnboardingModal from "./OnboardingModal";

type MessageRole = "user" | "agent";

interface ConversationMessage {
  role: MessageRole;
  textKey: string;
}

// hidden  → 안 보임, 오프셋 위치, 트랜지션 없음
// entering → 안 보임, 오프셋 위치, 트랜지션 없음 (브라우저가 이 위치를 페인트)
// visible  → 보임, 정위치, 트랜지션 적용 → fade+slide 동시 실행
type BubblePhase = "hidden" | "entering" | "visible";

const TONE_CONVERSATIONS: { id: AgentTone; messages: ConversationMessage[] }[] = [
  {
    id: "formal",
    messages: [
      { role: "user", textKey: "onboarding.tone.conversations.formal.user1" },
      { role: "agent", textKey: "onboarding.tone.conversations.formal.agent1" },
      { role: "user", textKey: "onboarding.tone.conversations.formal.user2" },
      { role: "agent", textKey: "onboarding.tone.conversations.formal.agent2" },
    ],
  },
  {
    id: "friendly",
    messages: [
      { role: "user", textKey: "onboarding.tone.conversations.friendly.user1" },
      { role: "agent", textKey: "onboarding.tone.conversations.friendly.agent1" },
      { role: "user", textKey: "onboarding.tone.conversations.friendly.user2" },
      { role: "agent", textKey: "onboarding.tone.conversations.friendly.agent2" },
    ],
  },
  {
    id: "casual",
    messages: [
      { role: "user", textKey: "onboarding.tone.conversations.casual.user1" },
      { role: "agent", textKey: "onboarding.tone.conversations.casual.agent1" },
      { role: "user", textKey: "onboarding.tone.conversations.casual.user2" },
      { role: "agent", textKey: "onboarding.tone.conversations.casual.agent2" },
    ],
  },
];

export default function OnboardingToneSelection() {
  const { t } = useTranslation();
  const { nextStep, selectedTone, setTone } = useOnboardingStore();
  // 이미 선택된 값이 있으면 초기에 펼쳐서 보여줌
  const [expandedTone, setExpandedTone] = useState<AgentTone | null>(selectedTone);

  const handleSelect = (tone: AgentTone) => {
    setTone(tone);
    setExpandedTone(tone);
  };

  return (
    <OnboardingModal>
      <div className="flex flex-col px-8 pt-6 pb-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {t("onboarding.tone.title")}
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            {t("onboarding.tone.subtitle")}
          </p>
        </div>

        <div className="space-y-3 mb-7">
          {TONE_CONVERSATIONS.map((option) => (
            <ToneCard
              key={option.id}
              option={option}
              isSelected={selectedTone === option.id}
              isExpanded={expandedTone === option.id}
              isInitiallyExpanded={selectedTone === option.id}
              onSelect={() => handleSelect(option.id)}
            />
          ))}
        </div>

        <button
          onClick={nextStep}
          disabled={!selectedTone}
          className="w-full px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
        >
          {t("onboarding.next")}
        </button>
      </div>
    </OnboardingModal>
  );
}

// ── 말투 카드 ────────────────────────────────────────────────────────────────

interface ToneCardProps {
  option: (typeof TONE_CONVERSATIONS)[number];
  isSelected: boolean;
  isExpanded: boolean;
  isInitiallyExpanded: boolean;
  onSelect: () => void;
}

function ToneCard({ option, isSelected, isExpanded, isInitiallyExpanded, onSelect }: ToneCardProps) {
  const { t } = useTranslation();
  const [phases, setPhases] = useState<BubblePhase[]>(
    // 처음부터 선택된 항목이면 즉시 visible로 시작
    option.messages.map(() => (isInitiallyExpanded ? "visible" : "hidden")),
  );
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // isInitiallyExpanded인 카드만 첫 렌더링 시 애니메이션 스킵
  // false로 초기화된 카드는 처음 클릭할 때부터 애니메이션 재생
  const skipOnce = useRef(isInitiallyExpanded);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (isExpanded) {
      // 초기 선택값이면 한 번만 즉시 표시 (이후 접혔다 열리면 애니메이션)
      if (skipOnce.current) {
        skipOnce.current = false;
        setPhases(option.messages.map(() => "visible"));
        return;
      }

      // 새로 선택된 경우: 스태거 애니메이션
      setPhases(option.messages.map(() => "hidden"));

      option.messages.forEach((_, idx) => {
        const delay = 150 + idx * 420;

        // 1단계: entering 상태 → 브라우저가 오프셋 위치를 페인트
        const t1 = setTimeout(() => {
          setPhases((prev) => {
            const next = [...prev];
            next[idx] = "entering";
            return next;
          });
        }, delay);

        // 2단계: 한 프레임 뒤 visible → fade+slide 동시 트랜지션 시작
        const t2 = setTimeout(() => {
          setPhases((prev) => {
            const next = [...prev];
            next[idx] = "visible";
            return next;
          });
        }, delay + 32);

        timersRef.current.push(t1, t2);
      });
    } else {
      // 접힐 때 skipOnce는 건드리지 않음 → 다시 열릴 때 애니메이션 재생
      setPhases(option.messages.map(() => "hidden"));
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [isExpanded, option.messages]);

  return (
    <div
      onClick={onSelect}
      className={`
        rounded-xl border-2 overflow-hidden cursor-pointer transition-all duration-300
        ${isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-base-border bg-bg-secondary hover:border-primary/40"
        }
      `}
    >
      {/* 카드 헤더 */}
      <div className="flex items-center justify-between p-4">
        <div className="flex-1">
          <p className={`text-base font-semibold transition-colors duration-200 ${isSelected ? "text-primary" : "text-text-primary"}`}>
            {t(`onboarding.tone.types.${option.id}`)}
          </p>
          <p className="text-xs text-text-tertiary mt-0.5">
            {t(`onboarding.tone.desc.${option.id}`)}
          </p>
        </div>
        <div
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-3
            transition-all duration-200
            ${isSelected ? "border-primary bg-primary" : "border-base-border"}
          `}
        >
          {isSelected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>

      {/* 대화 말풍선 */}
      <div
        className="overflow-hidden transition-all duration-[250ms] ease-in-out"
        style={{ maxHeight: isExpanded ? `${option.messages.length * 56 + 16}px` : "0px" }}
      >
        <div className="px-4 pb-4 space-y-2">
          {option.messages.map((msg, idx) => (
            <ChatBubble
              key={idx}
              text={t(msg.textKey)}
              role={msg.role}
              phase={phases[idx]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 말풍선 ───────────────────────────────────────────────────────────────────

interface ChatBubbleProps {
  text: string;
  role: MessageRole;
  phase: BubblePhase;
}

const BUBBLE_START = "translateY(8px) scale(0.96)";
const BUBBLE_END = "translateY(0) scale(1)";
const BUBBLE_TRANSITION = "opacity 550ms cubic-bezier(0.16, 1, 0.3, 1), transform 550ms cubic-bezier(0.16, 1, 0.3, 1)";

function ChatBubble({ text, role, phase }: ChatBubbleProps) {
  const isAgent = role === "agent";

  return (
    <div
      className={`flex ${isAgent ? "justify-start" : "justify-end"}`}
      style={{
        opacity: phase === "visible" ? 1 : 0,
        transform: phase === "visible" ? BUBBLE_END : BUBBLE_START,
        // entering → visible 전환 시에만 트랜지션 적용
        transition: phase === "visible" ? BUBBLE_TRANSITION : "none",
      }}
    >
      <span
        className={`
          inline-block px-3 py-1.5 text-sm leading-relaxed
          ${isAgent
            ? "rounded-2xl rounded-tl-sm text-white"
            : "rounded-2xl rounded-tr-sm text-text-secondary bg-bg-primary border border-base-border"
          }
        `}
        style={
          isAgent
            ? { backgroundColor: "var(--color-primary)", maxWidth: "78%" }
            : { maxWidth: "78%" }
        }
      >
        {text}
      </span>
    </div>
  );
}
