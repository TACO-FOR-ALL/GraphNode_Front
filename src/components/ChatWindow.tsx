import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const ChatMessageItem = React.memo(function ChatMessageItem({
  message,
  isLastAssistant,
  isStreaming,
  userMaxWidth,
  assistantMaxWidth,
  onDelete,
}: {
  message: ChatMessage;
  isLastAssistant: boolean;
  isStreaming: boolean;
  userMaxWidth: string;
  assistantMaxWidth: string;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    addToast({ type: "success", message: t("chat.copied") });
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const isUser = message.role === "user";

  if (!isUser && message.content === "") {
    return (
      <div className="mb-10 flex justify-start">
        <div style={{ maxWidth: assistantMaxWidth }}>
          <TypingBubble />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} items-start mb-10`}
      title={new Date(message.ts).toLocaleString()}
    >
      {isUser ? (
        <div className="flex items-start gap-3 ml-20" style={{ maxWidth: userMaxWidth }}>
          <div
            className="flex-1 text-text-chat-bubble bg-bg-secondary rounded-2xl rounded-tr-sm px-4 py-3 break-words"
            style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
          >
            {message.content}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start" style={{ maxWidth: assistantMaxWidth }}>
          <div className="rounded-2xl p-6 bg-transparent text-text-chat-bubble flex items-start gap-3 border border-chat-bubble-border shadow-[0_2px_4px_0_rgba(25,33,61,0.08)] w-full">
            <img
              src={logo}
              alt="Profile"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              className="w-6 h-6 flex-shrink-0 pt-1"
              style={{ marginTop: 0 }}
            />
            <div className="flex flex-col min-w-0 overflow-hidden w-full">
              <StreamingMarkdownBubble text={message.content} isStreaming={isStreaming} />
            </div>
          </div>
          {!(isLastAssistant && isStreaming) && (
            <div className="flex items-center gap-2.5 mt-2 ml-1.5">
              <div
                onClick={handleCopy}
                className="flex p-1 items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
              >
                {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
              </div>
              <div
                onClick={() => {}}
                className="flex p-1 items-center justify-center rounded text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors cursor-pointer"
              >
                <FiRefreshCw size={13} />
              </div>
              <div
                onClick={() => onDelete(message.id)}
                className="flex p-1 items-center justify-center rounded text-text-secondary hover:text-red-500 hover:bg-bg-secondary transition-colors cursor-pointer"
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
});

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
  threadId,
  isTyping,
  onScrollStateChange,
  scrollToBottomRef,
}: {
  threadId?: string;
  isTyping: boolean;
  avatarUrl?: string | null;
  onScrollStateChange?: (showButton: boolean) => void;
  scrollToBottomRef?: React.RefObject<(() => void) | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const userMessageRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const aiResponseRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [isLoading, setIsLoading] = useState(!!threadId);

  const thread = useThreadsStore((state) =>
    threadId ? state.threads[threadId] : null,
  );
  const refreshThread = useThreadsStore((state) => state.refreshThread);
  const evictThread = useThreadsStore((state) => state.evictThread);
  const { isExpanded } = useSidebarExpandStore();
  const addToast = useToastStore((s) => s.addToast);
  const { t } = useTranslation();

  const userMaxWidth = isExpanded ? "708px" : "880px";
  const assistantMaxWidth = isExpanded ? "696px" : "868px";

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!threadId) return;
    await threadRepo.deleteMessageFromThreadById(threadId, messageId);
    addToast({ type: "success", message: t("chat.deleted", "Message deleted") });
  }, [threadId, addToast, t]);

  const shouldScrollToBottomRef = useRef(false);

  useEffect(() => {
    if (!threadId) return;
    setIsLoading(true);
    setVisibleCount(PAGE);
    refreshThread(threadId);
    shouldScrollToBottomRef.current = true;
    return () => {
      evictThread(threadId);
    };
  }, [threadId, refreshThread, evictThread]);

  useEffect(() => {
    if (thread != null) {
      setIsLoading(false);
    }
  }, [thread]);

  // 로딩 완료 후 스크롤을 맨 아래로 이동
  useEffect(() => {
    if (!isLoading && shouldScrollToBottomRef.current) {
      shouldScrollToBottomRef.current = false;
      requestAnimationFrame(() => {
        if (wrapRef.current) {
          wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
        }
      });
    }
  }, [isLoading]);

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
  const visible = useMemo(
    () => (total ? allMessages.slice(startIndex) : []),
    [allMessages, startIndex, total],
  );

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
  const lastUserMessageId = turnUserMessage?.id;

  // shouldUseTopAnchoredTurn을 scroll 리스너가 동기적으로 읽을 수 있도록 ref로 유지
  // (spacer 높이 주입 → scrollTop 변경 → scroll 이벤트 순으로 동기 실행되기 때문에
  //  useLayoutEffect 선언 순서가 spacer 효과보다 먼저여야 ref가 미리 갱신됨)
  const shouldUseTopAnchoredTurnRef = useRef(shouldUseTopAnchoredTurn);
  useLayoutEffect(() => {
    shouldUseTopAnchoredTurnRef.current = shouldUseTopAnchoredTurn;
  }, [shouldUseTopAnchoredTurn]);

  // 새 유저 질문: spacer 확보 + 유저 메시지를 viewport 하단에 배치 (paint 전)
  useLayoutEffect(() => {
    if (!shouldUseTopAnchoredTurn) return;
    const wrap = wrapRef.current;
    const spacerEl = spacerRef.current;
    const userMsg = userMessageRef.current;
    if (!wrap || !spacerEl || !userMsg) return;

    // spacer로 viewport 높이만큼 하단 여백 확보
    spacerEl.style.height = `${wrap.clientHeight}px`;

    // 유저 메시지가 viewport 하단에 보이도록 scrollTop 설정
    // → 이후 useEffect 애니메이션의 시작점
    const userMsgBottom = userMsg.offsetTop + userMsg.offsetHeight;
    wrap.scrollTop = Math.max(0, userMsgBottom - wrap.clientHeight + 24);
  }, [shouldUseTopAnchoredTurn, lastUserMessageId]);

  // 새 유저 질문: paint 후 유저 메시지를 viewport 상단으로 부드럽게 올리는 애니메이션
  useEffect(() => {
    if (!shouldUseTopAnchoredTurn) return;
    const wrap = wrapRef.current;
    const userMsg = userMessageRef.current;
    if (!wrap || !userMsg) return;

    const targetScrollTop = Math.max(0, userMsg.offsetTop - 16);
    const startScrollTop = wrap.scrollTop;
    const distance = targetScrollTop - startScrollTop;
    if (Math.abs(distance) < 2) return;

    const duration = 480;
    const startTime = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    let cancelled = false;

    const animate = (now: number) => {
      if (cancelled) return;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      wrap.scrollTop = startScrollTop + distance * easeOut(progress);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    return () => { cancelled = true; };
  }, [shouldUseTopAnchoredTurn, lastUserMessageId]);

  // AI 응답이 커질수록 spacer를 줄이고, 응답이 viewport를 넘으면 하단 자동 스크롤
  useEffect(() => {
    if (!shouldUseTopAnchoredTurn) return;

    const spacerEl = spacerRef.current;
    const aiEl = aiResponseRef.current;
    const wrap = wrapRef.current;
    if (!spacerEl || !aiEl || !wrap) return;

    const ro = new ResizeObserver(() => {
      const aiHeight = aiEl.offsetHeight;
      const viewportHeight = wrap.clientHeight;
      const newSpacerHeight = Math.max(0, viewportHeight - aiHeight);
      spacerEl.style.height = `${newSpacerHeight}px`;
      // scrollTop은 건드리지 않음 → 유저 메시지 상단 위치 고정
    });

    ro.observe(aiEl);
    return () => ro.disconnect();
  }, [shouldUseTopAnchoredTurn, lastUserMessageId]);

  // active turn 중 visibleCount를 total로 유지: 전환 후 startIndex가 0으로 유지됨
  useEffect(() => {
    if (hasActiveTurn && total > visibleCount) {
      setVisibleCount(total);
    }
  }, [hasActiveTurn, total, visibleCount]);

  // active turn 중 scrollTop을 매 렌더마다 기억 (전환 직전 값 보존용)
  const savedScrollTopRef = useRef(0);
  useLayoutEffect(() => {
    if (!hasActiveTurn) return;
    const wrap = wrapRef.current;
    if (wrap) savedScrollTopRef.current = wrap.scrollTop;
  });

  // 스크롤 위치 추적 → 최하단이 아닐 때 플로팅 버튼 표시
  // active turn 중에는 spacer가 scrollHeight를 인위적으로 늘리므로
  // "spacer 제외 실제 콘텐츠 높이"가 뷰포트 이하면 버튼 숨김,
  // 실제로 콘텐츠가 넘치는 경우(긴 답변)엔 기존 atBottom 판단 유지
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const check = () => {
      if (shouldUseTopAnchoredTurnRef.current) {
        const spacerHeight = spacerRef.current?.offsetHeight ?? 0;
        const realScrollHeight = el.scrollHeight - spacerHeight;
        if (realScrollHeight <= el.clientHeight) {
          onScrollStateChange?.(false);
          return;
        }
        const atBottom = el.scrollTop >= el.scrollHeight - spacerHeight - el.clientHeight - 80;
        onScrollStateChange?.(!atBottom);
        return;
      }
      const atBottom = el.scrollTop >= el.scrollHeight - el.clientHeight - 80;
      onScrollStateChange?.(!atBottom);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [isLoading, onScrollStateChange]);

  // active turn 진입 직후 scroll 이벤트 없이 scrollTop이 변하지 않는 경우(첫 메시지)
  // scroll 리스너가 재실행되지 않으므로 spacer 주입 후 명시적으로 재평가
  useEffect(() => {
    if (!shouldUseTopAnchoredTurn) return;
    const el = wrapRef.current;
    if (!el) return;
    const spacerHeight = spacerRef.current?.offsetHeight ?? 0;
    const realScrollHeight = el.scrollHeight - spacerHeight;
    if (realScrollHeight <= el.clientHeight) {
      onScrollStateChange?.(false);
    }
  }, [shouldUseTopAnchoredTurn, onScrollStateChange]);

  // 스트리밍 완료 시 (hasActiveTurn: true → false) spacer가 사라져 scrollHeight가 줄어도 위치 유지
  const prevHasActiveTurnRef = useRef(hasActiveTurn);
  useLayoutEffect(() => {
    const wasActive = prevHasActiveTurnRef.current;
    prevHasActiveTurnRef.current = hasActiveTurn;

    if (wasActive && !hasActiveTurn) {
      const wrap = wrapRef.current;
      if (wrap) {
        wrap.scrollTop = savedScrollTopRef.current;
      }
    }
  }, [hasActiveTurn]);

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

  const lastMessageId =
    visible.length > 0 ? visible[visible.length - 1]?.id : null;
  const lastMessageRole =
    visible.length > 0 ? visible[visible.length - 1]?.role : null;

  const renderMessage = (m: ChatMessage) => {
    const isLastAssistant =
      m.role === "assistant" && m.id === lastMessageId && lastMessageRole === "assistant";
    return (
      <ChatMessageItem
        key={m.id}
        message={m}
        isLastAssistant={isLastAssistant}
        isStreaming={isLastAssistant && isTyping}
        userMaxWidth={userMaxWidth}
        assistantMaxWidth={assistantMaxWidth}
        onDelete={handleDeleteMessage}
      />
    );
  };

  const scrollToBottom = () => {
    const el = wrapRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // scrollToBottomRef에 함수 등록 (early return 전에 위치해야 Rules of Hooks 준수)
  useEffect(() => {
    if (scrollToBottomRef) scrollToBottomRef.current = scrollToBottom;
    return () => {
      if (scrollToBottomRef) scrollToBottomRef.current = null;
    };
  });

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
        position: "relative",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        overflowAnchor: "none",
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
        <div>{history.map((msg) => renderMessage(msg))}</div>

        {/* 현재 턴 (가장 최근 user 턴) */}
        {shouldUseTopAnchoredTurn && (
          <div>
            {/* 유저 메시지 */}
            <div ref={userMessageRef}>
              {turnUserMessage ? renderMessage(turnUserMessage) : null}
            </div>
            {/* AI 응답: userMessage 바로 아래에서 아래로 자람 */}
            <div ref={aiResponseRef}>
              {turnAssistantMessages.map((msg) => renderMessage(msg))}
            </div>
            {/* 스페이서: AI 응답 아래 빈 공간, 응답이 커질수록 줄어듦 */}
            <div ref={spacerRef} />
          </div>
        )}
      </div>
    </div>
  );
}
