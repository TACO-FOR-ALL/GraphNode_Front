import ChatWindow from "../components/ChatWindow";
import ChatSendBox from "../components/chat/ChatSendBox";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";

export default function Chat({ avatarUrl }: { avatarUrl: string | null }) {
  const [isTyping, setIsTyping] = useState(false);
  const { threadId } = useParams<{ threadId?: string }>();
  const { isExpanded } = useSidebarExpandStore();
  const [is2xl, setIs2xl] = useState(() => window.matchMedia("(min-width: 1536px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1536px)");
    const handler = (e: MediaQueryListEvent) => setIs2xl(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const width = isExpanded && !is2xl ? "768px" : "940px";

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
        />
      </div>

      {/* 하단 마진 */}
      <div className="h-4 flex-shrink-0" />

      {/* ChatSendBox - 고정 높이 */}
      <div className="flex-1 absolute bottom-8 w-full px-6">
        <ChatSendBox setIsTyping={setIsTyping} />
      </div>
    </div>
  );
}
