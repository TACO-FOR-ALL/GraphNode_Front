import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoIosClose } from "react-icons/io";
import { MdOpenInFull } from "react-icons/md";
import { FiExternalLink, FiMessageCircle } from "react-icons/fi";
import MarkdownBubble from "../MarkdownBubble";
import { useThreadsStore } from "@/store/useThreadStore";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";
import type { ChatMessage } from "@/types/Chat";
import logo from "@/assets/icons/logo.svg";

const PAGE = 10;

// 학술적 더미 데이터 세트들
const SAMPLE_DATA_SETS: ChatMessage[][] = [
  // 데이터셋 1: 머신러닝 연구
  [
    {
      id: "ml-1",
      role: "user",
      content: "Transformer 아키텍처에서 Self-Attention의 계산 복잡도는 어떻게 되나요?",
      ts: Date.now() - 60000,
    },
    {
      id: "ml-2",
      role: "assistant",
      content:
        "Self-Attention의 계산 복잡도는 **O(n²·d)**입니다. 여기서 n은 시퀀스 길이, d는 임베딩 차원입니다.\n\n주요 연산:\n1. **Query-Key 행렬곱**: O(n²·d)\n2. **Softmax 정규화**: O(n²)\n3. **Attention-Value 행렬곱**: O(n²·d)\n\n이 때문에 긴 시퀀스에서는 Linformer, Performer 같은 선형 복잡도 변형이 연구되고 있습니다.",
      ts: Date.now() - 45000,
    },
    {
      id: "ml-3",
      role: "user",
      content: "LoRA와 같은 Parameter-Efficient Fine-Tuning 방법의 장점은 무엇인가요?",
      ts: Date.now() - 30000,
    },
    {
      id: "ml-4",
      role: "assistant",
      content:
        "LoRA(Low-Rank Adaptation)의 주요 장점:\n\n1. **메모리 효율성**: 전체 파라미터의 0.1-1%만 학습\n2. **빠른 학습**: 그래디언트 계산량 감소\n3. **모듈성**: 여러 태스크용 어댑터를 쉽게 교체 가능\n4. **성능 유지**: Full fine-tuning과 유사한 성능\n\n수학적으로 W = W₀ + BA 형태로, rank r << d인 행렬 B, A만 학습합니다.",
      ts: Date.now(),
    },
  ],
  // 데이터셋 2: 양자 컴퓨팅
  [
    {
      id: "qc-1",
      role: "user",
      content: "양자 컴퓨터에서 큐비트의 중첩 상태는 어떻게 표현되나요?",
      ts: Date.now() - 60000,
    },
    {
      id: "qc-2",
      role: "assistant",
      content:
        "큐비트의 중첩 상태는 **|ψ⟩ = α|0⟩ + β|1⟩**로 표현됩니다.\n\n여기서:\n- α, β는 복소수 진폭 (amplitude)\n- |α|² + |β|² = 1 (정규화 조건)\n- |α|²는 |0⟩ 상태 측정 확률\n- |β|²는 |1⟩ 상태 측정 확률\n\nBloch Sphere 상에서 단위 벡터로 시각화할 수 있습니다.",
      ts: Date.now() - 40000,
    },
    {
      id: "qc-3",
      role: "user",
      content: "양자 얽힘과 벨 상태에 대해 설명해주세요.",
      ts: Date.now() - 20000,
    },
    {
      id: "qc-4",
      role: "assistant",
      content:
        "**양자 얽힘(Entanglement)**은 두 큐비트가 분리 불가능한 상관관계를 가지는 현상입니다.\n\n**벨 상태 (Bell States)**:\n- |Φ⁺⟩ = (|00⟩ + |11⟩)/√2\n- |Φ⁻⟩ = (|00⟩ - |11⟩)/√2\n- |Ψ⁺⟩ = (|01⟩ + |10⟩)/√2\n- |Ψ⁻⟩ = (|01⟩ - |10⟩)/√2\n\n이 상태들은 양자 텔레포테이션, 양자 암호화의 기초가 됩니다.",
      ts: Date.now(),
    },
  ],
  // 데이터셋 3: 신경과학
  [
    {
      id: "neuro-1",
      role: "user",
      content: "시냅스 가소성(Synaptic Plasticity)의 종류에는 어떤 것이 있나요?",
      ts: Date.now() - 60000,
    },
    {
      id: "neuro-2",
      role: "assistant",
      content:
        "시냅스 가소성의 주요 유형:\n\n**1. 장기 강화 (LTP)**\n- 고빈도 자극 후 시냅스 효율 증가\n- NMDA 수용체 의존적\n- 학습과 기억의 세포 기전\n\n**2. 장기 억제 (LTD)**\n- 저빈도 자극 후 시냅스 효율 감소\n- 운동 학습, 소뇌 기능에 중요\n\n**3. 스파이크 타이밍 의존적 가소성 (STDP)**\n- 전후 뉴런 발화 시간 차이에 따른 변화",
      ts: Date.now() - 35000,
    },
    {
      id: "neuro-3",
      role: "user",
      content: "Hebbian Learning과 딥러닝의 역전파 알고리즘은 어떻게 다른가요?",
      ts: Date.now() - 15000,
    },
    {
      id: "neuro-4",
      role: "assistant",
      content:
        "**Hebbian Learning** (\"함께 발화하면 함께 연결된다\"):\n- 지역적(Local) 학습 규칙\n- Δw ∝ x·y (입출력 상관관계)\n- 생물학적으로 타당\n- 비지도 학습\n\n**역전파 (Backpropagation)**:\n- 전역적(Global) 오류 신호 필요\n- 미분 가능한 활성화 함수 요구\n- 생물학적 타당성 논쟁 (weight transport problem)\n- 지도 학습\n\n최근 Equilibrium Propagation, Predictive Coding 등이 이 간극을 메우려 시도 중입니다.",
      ts: Date.now(),
    },
  ],
];

// 랜덤 데이터셋 선택
const getRandomSampleData = (): ChatMessage[] => {
  const randomIndex = Math.floor(Math.random() * SAMPLE_DATA_SETS.length);
  return SAMPLE_DATA_SETS[randomIndex];
};

export default function NodeChatPreview({
  threadId,
  avatarUrl,
  onClose,
  onExpand,
}: {
  threadId: string;
  avatarUrl: string | null;
  onClose: () => void;
  onExpand: () => void;
}) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const userScrolledRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [isExpanding, setIsExpanding] = useState(false);

  // 드래그 관련 상태
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });

  const applyTransform = () => {
    const el = modalRef.current;
    if (!el) return;
    const { x, y } = positionRef.current;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };

  // 드래그 이벤트 핸들러
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      positionRef.current = {
        x: positionRef.current.x + deltaX,
        y: positionRef.current.y + deltaY,
      };

      dragStartPos.current = { x: e.clientX, y: e.clientY };
      applyTransform();
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // 좌클릭만 허용
    if (modalRef.current && !isExpanding) {
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
    }
  };

  const { threads, refreshThread } = useThreadsStore();
  const { isExpanded } = useSidebarExpandStore();
  const thread = threads[threadId];

  const userMaxWidth = isExpanded ? "708px" : "880px";
  const assistantMaxWidth = isExpanded ? "696px" : "868px";

  useEffect(() => {
    if (threadId) {
      setVisibleCount(PAGE);
      userScrolledRef.current = false;
      isInitialLoadRef.current = true;
      refreshThread(threadId);
      // 위치 리셋
      positionRef.current = { x: 0, y: 0 };
      if (modalRef.current) {
        modalRef.current.style.transform = "translate(0px, 0px)";
      }
      // 초기 로드 시에만 맨 아래로 스크롤
      requestAnimationFrame(() => {
        if (wrapRef.current && isInitialLoadRef.current) {
          wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
          isInitialLoadRef.current = false;
        }
      });
    }
  }, [threadId, refreshThread]);

  // 컴포넌트 마운트 시 랜덤 샘플 데이터 선택
  const [sampleData] = useState<ChatMessage[]>(() => getRandomSampleData());

  // 실제 데이터가 없으면 샘플 데이터 사용
  const allMessages = useMemo<ChatMessage[]>(() => {
    const msgs = thread?.messages ?? [];
    if (msgs.length === 0) {
      return sampleData;
    }
    return msgs.slice().sort((a, b) => a.ts - b.ts);
  }, [thread?.messages, sampleData]);

  const total = allMessages.length;
  const startIndex = Math.max(0, total - visibleCount);
  const visible = total ? allMessages.slice(startIndex) : [];

  const isUsingHardcodedData = !thread?.messages || thread.messages.length === 0;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const handleScroll = () => {
      userScrolledRef.current = true;
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    if (userScrolledRef.current && !isInitialLoadRef.current) {
      return;
    }

    const distanceFromBottom =
      el.scrollHeight - (el.scrollTop + el.clientHeight);
    const nearBottom = distanceFromBottom < 120;

    // 초기 로드 시에만 자동 스크롤
    if (nearBottom && isInitialLoadRef.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        isInitialLoadRef.current = false;
      });
    }
  }, [total]);

  const loadingRef = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    const sentinel = topSentinelRef.current;
    if (!el || !sentinel) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (loadingRef.current) return;

        const topVisible = entries.some((e) => e.isIntersecting);
        if (!topVisible) return;
        if (startIndex === 0) return;

        if (!userScrolledRef.current) return;
        if (el.scrollTop > 40) return;

        loadingRef.current = true;

        const prevHeight = el.scrollHeight;
        const add = Math.min(PAGE, startIndex);
        setVisibleCount((c) => c + add);

        requestAnimationFrame(() => {
          const newHeight = el.scrollHeight;
          el.scrollTop += newHeight - prevHeight;
          loadingRef.current = false;
        });
      },
      { root: el, threshold: 0.01 }
    );

    io.observe(sentinel);
    return () => io.disconnect();
  }, [startIndex, threadId]);

  const handleExpand = () => {
    setIsExpanding(true);
    // 애니메이션 완료 후 라우트 이동
    setTimeout(() => {
      onExpand();
      navigate(`/chat/${threadId}`);
    }, 400);
  };

  const handleViewDetail = () => {
    navigate(`/visualize/detail/${threadId}`);
    onClose();
  };

  return (
    <div
      ref={modalRef}
      className={`absolute z-[100] bg-bg-primary dark:bg-bg-primary rounded-xl shadow-lg border border-base-border flex flex-col overflow-hidden transition-all duration-300 ease-out ${
        isExpanding
          ? "w-screen h-screen top-0 left-0 rounded-none p-0"
          : "top-6 left-8 w-[420px] h-[520px]"
      }`}
      style={{
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* 헤더 - 드래그 가능 */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b border-base-border bg-bg-secondary/50 ${
          isExpanding ? "hidden" : "cursor-move"
        }`}
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FiMessageCircle size={16} className="text-primary" />
          </div>
          <div>
            <span className="text-[13px] font-semibold text-text-primary">
              {t("visualize.chatPreview.title")}
            </span>
            {isUsingHardcodedData && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">
                {t("visualize.chatPreview.noData")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleViewDetail}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors group"
            title={t("visualize.chatPreview.viewDetail")}
          >
            <FiExternalLink
              size={16}
              className="text-text-secondary group-hover:text-primary transition-colors"
            />
          </button>
          <button
            onClick={handleExpand}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors group"
          >
            <MdOpenInFull
              size={16}
              className="text-text-secondary group-hover:text-primary transition-colors"
            />
          </button>
          <button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors group"
          >
            <IoIosClose
              size={20}
              className="text-text-secondary group-hover:text-primary transition-colors"
            />
          </button>
        </div>
      </div>

      {/* 확장 시 중앙 정렬된 컨텐츠 */}
      <div
        className={`flex-1 min-h-0 flex flex-col transition-all duration-300 ease-out ${
          isExpanding ? "pt-16" : ""
        }`}
        style={
          isExpanding
            ? {
                width: isExpanded ? "744px" : "916px",
                margin: "0 auto",
                transition: "width 0.5s ease",
              }
            : {}
        }
      >
        <div
          ref={wrapRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "var(--color-text-tertiary) transparent",
          }}
        >
          <div ref={topSentinelRef} />
          {visible.map((m) => {
            const isUser = m.role === "user";

            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"} items-start mb-4`}
                title={new Date(m.ts).toLocaleString()}
              >
                {isUser ? (
                  <div
                    className={`flex items-start gap-2 ${isExpanding ? "ml-20" : "ml-8"} min-w-0`}
                    style={{ maxWidth: isExpanding ? userMaxWidth : "85%" }}
                  >
                    <img
                      src={avatarUrl ?? logo}
                      alt="Profile"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className={`rounded-full flex-shrink-0 ${isExpanding ? "w-6 h-6" : "w-6 h-6"}`}
                    />
                    <div
                      className={`text-text-primary bg-primary/10 rounded-2xl rounded-tr-sm px-3 py-2 ${
                        isExpanding ? "text-sm" : "text-[13px]"
                      } break-words overflow-wrap-anywhere min-w-0`}
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        overflowX: "hidden",
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex items-start gap-2"
                    style={{
                      maxWidth: isExpanding ? assistantMaxWidth : "85%",
                    }}
                  >
                    <img
                      src={logo}
                      alt="Assistant"
                      className={`flex-shrink-0 ${isExpanding ? "w-6 h-6" : "w-6 h-6"}`}
                    />
                    <div
                      className={`bg-bg-tertiary/50 dark:bg-bg-tertiary/30 border border-base-border rounded-2xl rounded-tl-sm px-3 py-2 ${
                        isExpanding ? "text-sm" : "text-[13px]"
                      }`}
                    >
                      <div className="text-text-primary min-w-0 overflow-hidden">
                        <MarkdownBubble text={m.content} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div aria-hidden="true" className="h-2" />
        </div>
      </div>

      {/* 하단 액션 바 */}
      {!isExpanding && (
        <div className="px-4 py-3 border-t border-base-border bg-bg-secondary/30">
          <button
            onClick={handleViewDetail}
            className="w-full py-2.5 px-4 bg-primary text-white rounded-lg font-medium text-[13px] hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <FiExternalLink size={14} />
            {t("visualize.chatPreview.viewDetail")}
          </button>
        </div>
      )}
    </div>
  );
}
