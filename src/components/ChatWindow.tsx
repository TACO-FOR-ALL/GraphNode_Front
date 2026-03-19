import { useEffect, useMemo, useRef, useState } from "react";
import StreamingMarkdownBubble from "./StreamingMarkdownBubble";
import TypingBubble from "./TypingBubble";
import { useThreadsStore } from "@/store/useThreadStore";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";
import { useToastStore } from "@/store/useToastStore";
import type { ChatMessage } from "../types/Chat";
import { useTranslation } from "react-i18next";
import logo from "@/assets/icons/logo.svg";
import { FiCopy, FiCheck, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import threadRepo from "@/managers/threadRepo";

const PAGE = 10;

function ChatSkeleton({
  assistantMaxWidth,
  userMaxWidth,
}: {
  assistantMaxWidth: string;
  userMaxWidth: string;
}) {
  const assistantSkeleton = (lines: number[]) => (
    <div className="flex justify-start items-start mb-10">
      <div style={{ maxWidth: assistantMaxWidth }} className="w-full">
        <div className="rounded-2xl p-6 border border-chat-bubble-border shadow-[0_2px_4px_0_rgba(25,33,61,0.08)] flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-bg-tertiary flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-2.5 flex-1">
            {lines.map((w, i) => (
              <div
                key={i}
                className="h-3 bg-bg-tertiary rounded-full"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const userSkeleton = (widthPct: number) => (
    <div className="flex justify-end items-start mb-10">
      <div style={{ maxWidth: userMaxWidth, width: `${widthPct}%` }}>
        <div className="h-10 bg-bg-tertiary rounded-2xl rounded-tr-sm" />
      </div>
    </div>
  );

  return (
    <div className="p-4 animate-pulse">
      {assistantSkeleton([72, 100, 85, 60])}
      {userSkeleton(38)}
      {assistantSkeleton([100, 80, 95])}
      {userSkeleton(28)}
      {assistantSkeleton([65, 88])}
    </div>
  );
}

export default function ChatWindow({
  avatarUrl,
  threadId,
  isTyping,
}: {
  threadId?: string;
  isTyping: boolean;
  avatarUrl: string | null;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const aiTurnRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [containerHeight, setContainerHeight] = useState(0);
  const [userMessageHeight, setUserMessageHeight] = useState(0);
  const [aiResponseHeight, setAiResponseHeight] = useState(0);
  const [isLoading, setIsLoading] = useState(!!threadId);

  // 컨테이너 높이 측정
  useEffect(() => {
    const updateHeight = () => {
      if (wrapRef.current) {
        setContainerHeight(wrapRef.current.clientHeight);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    if (wrapRef.current) {
      resizeObserver.observe(wrapRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Selector를 사용하여 특정 thread만 구독 (성능 최적화)
  const thread = useThreadsStore((state) =>
    threadId ? state.threads[threadId] : null,
  );
  const refreshThread = useThreadsStore((state) => state.refreshThread);
  const { isExpanded } = useSidebarExpandStore();
  const addToast = useToastStore((s) => s.addToast);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessage = async (messageId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    addToast({ type: "success", message: t("chat.copied") });
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!threadId) return;

    await threadRepo.deleteMessageFromThreadById(threadId, messageId);
    addToast({ type: "success", message: t("chat.deleted", "Message deleted") });
  };

  const userMaxWidth = isExpanded ? "708px" : "880px";
  const assistantMaxWidth = isExpanded ? "696px" : "868px";

  const { t } = useTranslation();

  useEffect(() => {
    if (threadId) {
      setIsLoading(true);
      setVisibleCount(PAGE);
      refreshThread(threadId);
      requestAnimationFrame(() => {
        if (wrapRef.current) {
          wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
        }
      });
    }
  }, [threadId, refreshThread]);

  useEffect(() => {
    if (thread !== null) {
      setIsLoading(false);
    }
  }, [thread]);

  const allMessages = useMemo<ChatMessage[]>(() => {
    const msgs = thread?.messages ?? [];
    return msgs.slice().sort((a, b) => a.ts - b.ts);
  }, [thread?.messages]);

  const total = allMessages.length;
  const pagedStartIndex = Math.max(0, total - visibleCount);
  const lastMessage = total > 0 ? allMessages[total - 1] : null;
  const hasActiveTurn =
    !!lastMessage &&
    (isTyping ||
      lastMessage.role === "user" ||
      (lastMessage.role === "assistant" && lastMessage.content === ""));
  const startIndex = hasActiveTurn ? 0 : pagedStartIndex;
  const visible = total ? allMessages.slice(startIndex) : [];
  const lastVisibleMessage =
    visible.length > 0 ? visible[visible.length - 1] : null;

  // 이전 메시지(history)와 현재 활성 턴(가장 최근 user + 그 이후 assistant들) 분리
  const { history, currentTurn } = useMemo(() => {
    if (visible.length === 0 || !hasActiveTurn) {
      return { history: visible, currentTurn: [] as ChatMessage[] };
    }

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
  }, [visible, hasActiveTurn]);

  const shouldUseTopAnchoredTurn = currentTurn.length > 0;
  const turnUserMessage =
    currentTurn[0]?.role === "user" ? currentTurn[0] : null;
  const turnAssistantMessages = turnUserMessage ? currentTurn.slice(1) : [];
  const lastUserMessage = turnUserMessage;
  const lastUserMessageId = lastUserMessage?.id;

  const spacerHeight = useMemo(() => {
    if (!shouldUseTopAnchoredTurn) return 0;
    return Math.max(
      0,
      containerHeight - (userMessageHeight + aiResponseHeight),
    );
  }, [
    shouldUseTopAnchoredTurn,
    containerHeight,
    userMessageHeight,
    aiResponseHeight,
  ]);

  const alignCurrentTurnToTop = () => {
    const scroller = wrapRef.current;
    const userMessageEl = lastUserMessageRef.current;
    if (!scroller || !userMessageEl) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const userRect = userMessageEl.getBoundingClientRect();
    const targetTop = userRect.top - scrollerRect.top + scroller.scrollTop;

    if (Math.abs(scroller.scrollTop - targetTop) > 1) {
      scroller.scrollTop = targetTop;
    }
  };

  // 유저/AI 영역 높이 측정 (스트리밍 중 지속 갱신)
  useEffect(() => {
    if (!shouldUseTopAnchoredTurn) {
      setUserMessageHeight(0);
      setAiResponseHeight(0);
      return;
    }

    const measureHeights = () => {
      const userHeight = lastUserMessageRef.current?.offsetHeight ?? 0;
      const aiHeight = aiTurnRef.current?.offsetHeight ?? 0;
      setUserMessageHeight((prev) =>
        Math.abs(prev - userHeight) > 1 ? userHeight : prev,
      );
      setAiResponseHeight((prev) =>
        Math.abs(prev - aiHeight) > 1 ? aiHeight : prev,
      );
    };

    measureHeights();

    const resizeObserver = new ResizeObserver(measureHeights);
    if (lastUserMessageRef.current) {
      resizeObserver.observe(lastUserMessageRef.current);
    }
    if (aiTurnRef.current) {
      resizeObserver.observe(aiTurnRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    shouldUseTopAnchoredTurn,
    lastUserMessageId,
    turnAssistantMessages.length,
    total,
  ]);

  // 유저 메시지 추가/스트리밍 높이 변경 시 상단 정렬 유지
  useEffect(() => {
    if (!shouldUseTopAnchoredTurn) return;
    if (spacerHeight <= 0) return;

    requestAnimationFrame(() => {
      alignCurrentTurnToTop();
    });
  }, [
    shouldUseTopAnchoredTurn,
    lastUserMessageId,
    spacerHeight,
    userMessageHeight,
    aiResponseHeight,
  ]);

  // AI 응답 스트리밍 중일 때 하단 자동 스크롤
  useEffect(() => {
    if (!isTyping) return;
    if (shouldUseTopAnchoredTurn) return;
    const el = wrapRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [isTyping, total, shouldUseTopAnchoredTurn]);

  // 상단 sentinel로 이전 메시지 로드
  useEffect(() => {
    const el = wrapRef.current;
    const sentinel = topSentinelRef.current;
    if (!el || !sentinel) return;
    if (shouldUseTopAnchoredTurn) return;

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
  }, [startIndex, threadId, shouldUseTopAnchoredTurn]);

  // 전체 visible 배열에서 마지막 메시지 ID 확인
  const lastMessageId =
    visible.length > 0 ? visible[visible.length - 1]?.id : null;
  const lastMessageRole =
    visible.length > 0 ? visible[visible.length - 1]?.role : null;

  // 메시지 버블 렌더링 함수
  const renderMessage = (m: ChatMessage, isInCurrentTurn: boolean = false) => {
    const isUser = m.role === "user";

    // 전체 visible 배열에서 마지막 어시스턴트 메시지인지 확인 (스트리밍 중인 메시지)
    const isLastAssistantMessage =
      !isUser && m.id === lastMessageId && lastMessageRole === "assistant";

    // currentTurn의 마지막 유저 메시지인지 확인
    const isLastUserInTurn =
      isInCurrentTurn && isUser && lastUserMessage?.id === m.id;

    // Assistant 메시지가 빈 문자열이면 TypingBubble 표시
    if (!isUser && m.content === "") {
      return (
        <div key={m.id} className="mb-10 flex justify-start">
          <div style={{ maxWidth: assistantMaxWidth }}>
            <TypingBubble />
          </div>
        </div>
      );
    }

    return (
      <div
        key={m.id}
        ref={isLastUserInTurn ? lastUserMessageRef : null}
        className={`flex ${isUser ? "justify-end" : "justify-start"} items-start mb-10`}
        title={new Date(m.ts).toLocaleString()}
      >
        {isUser ? (
          <div
            className="flex items-start gap-3 ml-20"
            style={{ maxWidth: userMaxWidth }}
          >
            <div
              className="flex-1 text-text-chat-bubble bg-bg-secondary rounded-2xl rounded-tr-sm px-4 py-3 break-words"
              style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
            >
              {m.content}
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-start"
            style={{ maxWidth: assistantMaxWidth }}
          >
            <div className="rounded-2xl p-6 bg-transparent text-text-chat-bubble flex items-start gap-3 border border-chat-bubble-border shadow-[0_2px_4px_0_rgba(25,33,61,0.08)] w-full">
              <img
                src={logo}
                alt="Profile"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                className="w-6 h-6 flex-shrink-0 pt-1"
                style={{ marginTop: 0 }}
              />
              <div className="flex flex-col min-w-0 overflow-hidden">
                <StreamingMarkdownBubble
                  text={m.content}
                  isStreaming={isLastAssistantMessage && isTyping}
                />
              </div>
            </div>
            {!(isLastAssistantMessage && isTyping) && (
              <div className="flex items-center gap-2.5 mt-2 ml-1.5">
                <div
                  onClick={() => handleCopyMessage(m.id, m.content)}
                  className="flex p-1 items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  {copiedMessageId === m.id ? (
                    <FiCheck size={13} />
                  ) : (
                    <FiCopy size={13} />
                  )}
                </div>
                <div
                  // TODO: retry 기능 구현
                  onClick={() => {}}
                  className="flex p-1 items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
                >
                  <FiRefreshCw size={13} />
                </div>
                <div
                  onClick={() => void handleDeleteMessage(m.id)}
                  className="flex p-1 items-center justify-center rounded text-text-secondary hover:text-red-500 hover:bg-bg-secondary transition-colors"
                  title={t("chat.deleteMessage", "Delete message")}
                >
                  <FiTrash2 size={13} />
                </div>
              </div>
            )}
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
  if (isLoading || !thread) {
    return (
      <ChatSkeleton
        assistantMaxWidth={assistantMaxWidth}
        userMaxWidth={userMaxWidth}
      />
    );
  }

  return (
    <div
      ref={wrapRef}
      className="h-full min-h-0 overflow-y-auto overscroll-contain"
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
      <div className="p-4">
        <div ref={topSentinelRef} />

        {/* 이전 메시지들 (history) */}
        <div>{history.map((msg) => renderMessage(msg, false))}</div>

        {/* 현재 턴 (가장 최근 user 턴) */}
        {shouldUseTopAnchoredTurn && (
          <>
            <div>
              {turnUserMessage ? renderMessage(turnUserMessage, true) : null}
              <div ref={aiTurnRef}>
                {turnAssistantMessages.map((msg) => renderMessage(msg, true))}
              </div>
            </div>
            {/* 동적 여백 - AI 응답이 길어질수록 줄어듦 */}
            <div style={{ height: `${spacerHeight}px` }} />
          </>
        )}
      </div>
    </div>
  );
}
