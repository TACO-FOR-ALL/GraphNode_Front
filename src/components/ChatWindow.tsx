import { useEffect, useMemo, useRef, useState } from "react";
import MarkdownBubble from "./MarkdownBubble";
import TypingBubble from "./TypingBubble";
import { useThreadsStore } from "@/store/useThreadStore";
import type { ChatMessage } from "../types/Chat";

const PAGE = 10;

export default function ChatWindow({
  threadId,
  isTyping,
}: {
  threadId?: string;
  isTyping: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);

  const [visibleCount, setVisibleCount] = useState(PAGE);

  const { threads, refreshThread } = useThreadsStore();
  const thread = threadId ? threads[threadId] : null;

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
        <p className="text-gray-500">
          왼쪽에서 채팅을 선택하거나 새로운 채팅을 시작해주세요
        </p>
      </div>
    );
  }
  if (!thread) {
    return <div className="p-4">스레드를 찾을 수 없어요</div>;
  }

  return (
    <div ref={wrapRef} className="p-4 pb-10 h-full overflow-y-auto">
      <div ref={topSentinelRef} />
      <h3 className="mt-0 mb-3 font-semibold">{thread.title}</h3>

      {visible.map((m) => {
        const isUser = m.role === "user";
        return (
          <div
            key={m.id}
            className={`mb-2 flex ${isUser ? "justify-end" : "justify-start"}`}
            title={new Date(m.ts).toLocaleString()}
          >
            <div
              className={`max-w-[72%] rounded-2xl px-3 py-2 ${
                isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-black"
              }`}
            >
              <MarkdownBubble text={m.content} />
            </div>
          </div>
        );
      })}

      {isTyping && (
        <div className="mb-2 flex justify-start">
          <TypingBubble />
        </div>
      )}
    </div>
  );
}
