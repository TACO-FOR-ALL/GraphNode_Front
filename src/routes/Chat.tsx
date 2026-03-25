import ChatWindow from "../components/ChatWindow";
import ChatSendBox from "../components/chat/ChatSendBox";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";
import { FiArrowDown } from "react-icons/fi";

export default function Chat({ avatarUrl }: { avatarUrl: string | null }) {
  const [isTyping, setIsTyping] = useState(false);
  const { threadId } = useParams<{ threadId?: string }>();
  const { isExpanded } = useSidebarExpandStore();
  const [is2xl, setIs2xl] = useState(
    () => window.matchMedia("(min-width: 1536px)").matches,
  );
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollToBottomRef = useRef<(() => void) | null>(
    null,
  ) as React.RefObject<(() => void) | null>;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1536px)");
    const handler = (e: MediaQueryListEvent) => setIs2xl(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const width = isExpanded && !is2xl ? "768px" : "940px";

  const handleScrollStateChange = useCallback((show: boolean) => {
    setShowScrollButton(show);
  }, []);

  return (
    <div
      className="h-full min-h-0 overflow-hidden bg-bg-primary flex flex-col box-border relative w-full"
      style={{
        width,
        margin: "0 auto",
        transition: "width 0.5s ease",
      }}
    >
      {/* 상단 그라데이션 블러 */}
      <div className="absolute top-0 h-12 w-full pointer-events-none z-10 bg-gradient-to-b from-bg-primary to-transparent" />

      {/* 채팅창 - flex-1로 남은 공간 차지 */}
      <div className="flex-1 min-h-0 overflow-hidden mb-36 px-5">
        <ChatWindow
          threadId={threadId || undefined}
          isTyping={isTyping}
          avatarUrl={avatarUrl}
          onScrollStateChange={handleScrollStateChange}
          scrollToBottomRef={scrollToBottomRef}
        />
      </div>

      {/* 플로팅 스크롤 버튼 */}
      {showScrollButton && (
        <div
          onClick={() => scrollToBottomRef.current?.()}
          className="absolute left-1/2 right-1/2 -translate-x-1/2 bottom-44 z-20 flex items-center justify-center w-8 h-8 rounded-full hover:bg-bg-secondary border border-chat-bubble-border shadow-md text-primary bg-bg-primary transition-colors cursor-pointer"
          aria-label="최하단으로 이동"
        >
          <FiArrowDown size={15} />
        </div>
      )}

      {/* 하단 마진 */}
      <div className="h-4 flex-shrink-0" />

      {/* ChatSendBox - 고정 높이 */}
      <div className="flex-1 absolute bottom-8 w-full px-6">
        <ChatSendBox setIsTyping={setIsTyping} />
      </div>
    </div>
  );
}
