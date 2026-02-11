import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import MarkdownBubble from "./MarkdownBubble";
import TypingBubble from "./TypingBubble";
import { useThreadsStore } from "@/store/useThreadStore";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";
import type { ChatMessage } from "../types/Chat";
import { useTranslation } from "react-i18next";
import logo from "@/assets/icons/logo.svg";

const PAGE = 10;
const BOTTOM_PADDING = 200; // ChatSendBox 높이만큼 하단 여백

export default function ChatWindow({
  avatarUrl,
  threadId,
  isTyping,
  isPinned,
  onPinComplete,
}: {
  threadId?: string;
  isTyping: boolean;
  avatarUrl: string | null;
  isPinned: boolean;
  onPinComplete: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const turnRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [spacerHeight, setSpacerHeight] = useState(0);

  const { threads, refreshThread } = useThreadsStore();
  const { isExpanded } = useSidebarExpandStore();
  const thread = threadId ? threads[threadId] : null;

  const userMaxWidth = isExpanded ? "708px" : "880px";
  const assistantMaxWidth = isExpanded ? "696px" : "868px";

  const { t } = useTranslation();

  useEffect(() => {
    if (threadId) {
      setVisibleCount(PAGE);
      refreshThread(threadId);
      requestAnimationFrame(() => {
        if (wrapRef.current) {
          wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
        }
      });
    }
  }, [threadId, refreshThread]);

  const allMessages = useMemo<ChatMessage[]>(() => {
    const msgs = thread?.messages ?? [];
    return msgs.slice().sort((a, b) => a.ts - b.ts);
  }, [thread?.messages]);

  const total = allMessages.length;
  const startIndex = Math.max(0, total - visibleCount);
  const visible = total ? allMessages.slice(startIndex) : [];

  // 이전 메시지(history)와 현재 턴(currentTurn) 분리
  const { history, currentTurn } = useMemo(() => {
    if (!isPinned || visible.length === 0) {
      return { history: visible, currentTurn: [] as ChatMessage[] };
    }

    // 가장 마지막 user 메시지의 인덱스 찾기
    let lastUserIdx = -1;
    for (let i = visible.length - 1; i >= 0; i--) {
      if (visible[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx === -1) {
      return { history: visible, currentTurn: [] as ChatMessage[] };
    }

    return {
      history: visible.slice(0, lastUserIdx),
      currentTurn: visible.slice(lastUserIdx),
    };
  }, [visible, isPinned]);

  // 현재 턴을 상단에 보이게 스크롤바 위치 조절
  const scrollTurnToTop = () => {
    const scroller = wrapRef.current;
    const turn = turnRef.current;
    if (!scroller || !turn) return;

    scroller.scrollTop = turn.offsetTop;
  };

  // 현재 턴이 채팅방 가장 상단에 보일 수 있게 하단 스페이서 높이 계산
  const recomputeSpacer = () => {
    const scroller = wrapRef.current;
    const turn = turnRef.current;
    if (!scroller || !turn) {
      setSpacerHeight(0);
      return;
    }

    const scrollerH = scroller.clientHeight;
    const turnH = turn.offsetHeight;

    // ChatSendBox 높이(BOTTOM_PADDING)를 고려하여 스페이서 계산
    const next = Math.max(0, scrollerH - turnH - BOTTOM_PADDING);
    setSpacerHeight(next);
  };

  // 핀 모드일 때 메시지 변경 시 스페이서 재계산 및 스크롤 조정
  useLayoutEffect(() => {
    if (!isPinned) {
      setSpacerHeight(0);
      return;
    }

    // DOM이 완전히 렌더링된 후 스페이서 계산 및 스크롤 조정
    requestAnimationFrame(() => {
      recomputeSpacer();
      scrollTurnToTop();
    });
  }, [isPinned, currentTurn.length, total]);

  // 핀 모드 활성화 시 즉시 스크롤 조정 (별도 effect)
  useEffect(() => {
    if (!isPinned) return;

    // 약간의 지연 후 스크롤 조정 (store 업데이트 및 렌더링 완료 대기)
    const timer = setTimeout(() => {
      recomputeSpacer();
      scrollTurnToTop();
    }, 50);

    return () => clearTimeout(timer);
  }, [isPinned]);

  // 핀 모드일 때 ResizeObserver로 턴 높이 변화 감지
  useEffect(() => {
    if (!isPinned) return;

    const turn = turnRef.current;
    if (!turn) return;

    const ro = new ResizeObserver(() => {
      recomputeSpacer();
      scrollTurnToTop();
    });
    ro.observe(turn);

    return () => ro.disconnect();
  }, [isPinned]);

  // 핀 모드일 때 윈도우 리사이즈 대응
  useEffect(() => {
    if (!isPinned) return;

    const onResize = () => {
      recomputeSpacer();
      scrollTurnToTop();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isPinned]);

  // 핀 모드일 때 사용자가 위로 스크롤하면 핀 해제 (wheel 이벤트 사용)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !isPinned) return;

    const handleWheel = (e: WheelEvent) => {
      // 위로 스크롤 (deltaY < 0)하면 핀 해제
      if (e.deltaY < -10) {
        onPinComplete();
        setSpacerHeight(0);
      }
    };

    el.addEventListener("wheel", handleWheel);
    return () => el.removeEventListener("wheel", handleWheel);
  }, [isPinned, onPinComplete]);

  // 핀 모드가 아닐 때 기존 스크롤 동작 (하단 근처일 때 자동 스크롤)
  useEffect(() => {
    if (isPinned) return;
    const el = wrapRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - (el.scrollTop + el.clientHeight);
    const nearBottom = distanceFromBottom < 120;
    if (nearBottom) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [total, isPinned]);

  // 상단 sentinel로 이전 메시지 로드
  useEffect(() => {
    const el = wrapRef.current;
    const sentinel = topSentinelRef.current;
    if (!el || !sentinel) return;

    const io = new IntersectionObserver(
      (entries) => {
        const topVisible = entries.some((e) => e.isIntersecting);
        if (!topVisible) return;
        if (startIndex === 0) return;

        const prevHeight = el.scrollHeight;
        const add = Math.min(PAGE, startIndex);
        setVisibleCount((c) => c + add);

        requestAnimationFrame(() => {
          const newHeight = el.scrollHeight;
          el.scrollTop += newHeight - prevHeight;
        });
      },
      { root: el, threshold: 0.01 },
    );

    io.observe(sentinel);
    return () => io.disconnect();
  }, [startIndex, threadId]);

  // 메시지 버블 렌더링 함수
  const renderMessage = (m: ChatMessage) => {
    const isUser = m.role === "user";

    return (
      <div
        key={m.id}
        className={`flex ${isUser ? "justify-end" : "justify-start"} items-start mb-10`}
        title={new Date(m.ts).toLocaleString()}
      >
        {isUser ? (
          <div
            className="flex items-start gap-3 ml-20"
            style={{ maxWidth: userMaxWidth }}
          >
            <img
              src={avatarUrl ?? logo}
              alt="Profile"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              className="w-6 h-6 rounded-full flex-shrink-0 mt-0"
            />
            <div className="flex-1 text-text-chat-bubble">{m.content}</div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-6 bg-transparent text-text-chat-bubble flex items-start gap-3 border border-chat-bubble-border shadow-[0_2px_4px_0_rgba(25,33,61,0.08)]"
            style={{ maxWidth: assistantMaxWidth }}
          >
            <img
              src={logo}
              alt="Profile"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              className="w-6 h-6 flex-shrink-0"
              style={{ marginTop: 0 }}
            />
            <div className="flex flex-col min-w-0 overflow-hidden">
              <MarkdownBubble text={m.content} />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!threadId) {
    return (
      <div className="p-4 flex items-center justify-center h-full">
        <p className="text-gray-500">{t("chat.selectChat")}</p>
      </div>
    );
  }
  if (!thread) {
    return <div className="p-4">{t("chat.noChat")}</div>;
  }

  return (
    <div
      ref={wrapRef}
      className="h-full overflow-y-auto"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
        className="min-h-full flex flex-col p-4"
        style={{ paddingBottom: BOTTOM_PADDING }}
      >
        <div ref={topSentinelRef} />

        {/* 이전 메시지들 (history) */}
        <div>
          {history.map(renderMessage)}
        </div>

        {/* 현재 턴 (핀 모드일 때만 분리) */}
        {isPinned && currentTurn.length > 0 ? (
          <>
            <div ref={turnRef}>
              {currentTurn.map(renderMessage)}
              {isTyping && (
                <div className="mb-2 flex justify-start">
                  <div style={{ maxWidth: assistantMaxWidth }}>
                    <TypingBubble />
                  </div>
                </div>
              )}
            </div>
            {/* 동적 스페이서 */}
            <div style={{ height: spacerHeight }} className="bg-transparent" />
          </>
        ) : (
          /* 핀 모드가 아닐 때는 모든 메시지를 일반적으로 렌더링 */
          <>
            {isTyping && (
              <div className="mb-2 flex justify-start">
                <div style={{ maxWidth: assistantMaxWidth }}>
                  <TypingBubble />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
