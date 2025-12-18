import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoIosClose } from "react-icons/io";
import { MdOpenInFull } from "react-icons/md";
import MarkdownBubble from "../MarkdownBubble";
import { useThreadsStore } from "@/store/useThreadStore";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";
import type { ChatMessage } from "@/types/Chat";
import logo from "@/assets/icons/logo.svg";

const PAGE = 10;

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
  const wrapRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const userScrolledRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [isExpanding, setIsExpanding] = useState(false);

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
      // 초기 로드 시에만 맨 아래로 스크롤
      requestAnimationFrame(() => {
        if (wrapRef.current && isInitialLoadRef.current) {
          wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
          isInitialLoadRef.current = false;
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

  if (!thread) {
    return null;
  }

  return (
    <div
      className={`absolute bottom-14 right-9 z-[100] bg-white pb-4 rounded-xl shadow-[0_2px_20px_0_#badaff] border-[1px] border-[rgba(var(--color-chatbox-border-rgb),0.2)] flex flex-col overflow-hidden transition-all duration-300 ease-out ${
        isExpanding
          ? "w-screen h-screen bottom-0 right-0 rounded-none p-0"
          : "w-96 h-[520px] p-4"
      }`}
    >
      {/* 헤더 */}
      <div
        className={`flex items-center justify-between ${isExpanding ? "hidden" : "mb-4"}`}
      >
        <div className="flex items-center justify-center gap-2">
          <img src={logo} alt="logo" className="w-3 h-3" />
          <span className="text-[12px] font-medium">Chat Preview</span>
        </div>
        <div className="flex items-center gap-2">
          <MdOpenInFull
            onClick={handleExpand}
            className="text-sm text-text-secondary cursor-pointer hover:text-primary transition-colors"
          />
          <IoIosClose
            onClick={onClose}
            className="text-2xl text-text-secondary cursor-pointer hover:text-primary transition-colors"
          />
        </div>
      </div>

      {/* 확장 시 중앙 정렬된 컨텐츠 */}
      <div
        className={`flex-1 transition-all duration-300 ease-out ${
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
          className="overflow-y-auto py-4"
          style={{
            height: isExpanding ? "100%" : "480px",
            paddingBottom: isExpanding ? "200px" : "20px",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
          <div ref={topSentinelRef} />

          {visible.map((m, index) => {
            const isUser = m.role === "user";

            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"} items-start`}
                style={{ marginBottom: isExpanding ? "40px" : "16px" }}
                title={new Date(m.ts).toLocaleString()}
              >
                {isUser ? (
                  <div
                    className={`flex items-start gap-2 ${isExpanding ? "ml-20" : "ml-8"}`}
                    style={{ maxWidth: isExpanding ? userMaxWidth : "80%" }}
                  >
                    <img
                      src={avatarUrl ?? logo}
                      alt="Profile"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className={`rounded-full flex-shrink-0 ${isExpanding ? "w-6 h-6" : "w-5 h-5"}`}
                    />
                    <div
                      className={`text-text-chat-bubble ${isExpanding ? "" : "text-[12px]"}`}
                    >
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-xl text-text-chat-bubble flex items-start gap-2"
                    style={{
                      maxWidth: isExpanding ? assistantMaxWidth : "80%",
                      backgroundColor: "transparent",
                      border: "1px solid #F0F2F5",
                      padding: isExpanding ? "24px" : "12px",
                      borderRadius: isExpanding ? "16px" : "12px",
                      boxShadow: "0 2px 4px 0 rgba(25, 33, 61, 0.08)",
                    }}
                  >
                    <img
                      src={logo}
                      alt="Profile"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      className={`rounded-full flex-shrink-0 ${isExpanding ? "w-6 h-6" : "w-5 h-5"}`}
                    />
                    <div
                      className={`flex flex-col min-w-0 overflow-hidden ${isExpanding ? "" : "text-[12px]"}`}
                    >
                      <MarkdownBubble text={m.content} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
