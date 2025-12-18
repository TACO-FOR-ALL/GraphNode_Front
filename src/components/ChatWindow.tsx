import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import MarkdownBubble from "./MarkdownBubble";
import TypingBubble from "./TypingBubble";
import { useThreadsStore } from "@/store/useThreadStore";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";
import type { ChatMessage } from "../types/Chat";
import { useTranslation } from "react-i18next";
import logo from "@/assets/icons/logo.svg";

const PAGE = 10;

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

  const [visibleCount, setVisibleCount] = useState(PAGE);

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

  useEffect(() => {
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
  }, [total]);

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
      { root: el, threshold: 0.01 }
    );

    io.observe(sentinel);
    return () => io.disconnect();
  }, [startIndex, threadId]);

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
      className="p-4 h-full overflow-y-auto"
      style={{
        paddingBottom: "200px",
        scrollbarWidth: "none", // Firefox
        msOverflowStyle: "none", // IE and Edge
      }}
    >
      <style>{`
        div::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>
      <div ref={topSentinelRef} />

      {visible.map((m, index) => {
        const isUser = m.role === "user";

        return (
          <div
            key={m.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"} items-start`}
            style={{ marginBottom: "40px" }}
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
                  className="w-6 h-6 rounded-full flex-shrink-0"
                  style={{ marginTop: 0 }}
                />
                <div className="flex-1 text-text-chat-bubble">{m.content}</div>
              </div>
            ) : (
              <div
                className="rounded-2xl text-text-chat-bubble flex items-start gap-3"
                style={{
                  maxWidth: assistantMaxWidth,
                  backgroundColor: "transparent",
                  border: "1px solid #F0F2F5",
                  padding: "24px",
                  borderRadius: "16px",
                  boxShadow: "0 2px 4px 0 rgba(25, 33, 61, 0.08)",
                }}
              >
                <img
                  src={logo}
                  alt="Profile"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full flex-shrink-0"
                  style={{ marginTop: 0 }}
                />
                <div className="flex flex-col min-w-0 overflow-hidden">
                  <MarkdownBubble text={m.content} />
                </div>
              </div>
            )}
          </div>
        );
      })}

      {isTyping && (
        <div className="mb-2 flex justify-start">
          <div style={{ maxWidth: assistantMaxWidth }}>
            <TypingBubble />
          </div>
        </div>
      )}
    </div>
  );
}
