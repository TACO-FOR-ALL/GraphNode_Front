import ChatWindow from "../components/ChatWindow";
import ChatSendBox from "../components/chat/ChatSendBox";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";

export default function Chat({ avatarUrl }: { avatarUrl: string | null }) {
  const [isTyping, setIsTyping] = useState(false);
  const { threadId } = useParams<{ threadId?: string }>();
  const { isExpanded } = useSidebarExpandStore();

  const width = isExpanded ? "744px" : "916px";

  return (
    <div
      className="h-full pt-16 bg-bg-primary flex flex-col"
      style={{
        width,
        margin: "0 auto",
        transition: "width 0.5s ease",
      }}
    >
      {/* 상단 마진 */}
      <div className="h-8 flex-shrink-0" />

      {/* 채팅창 - flex-1로 남은 공간 차지 */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          threadId={threadId || undefined}
          isTyping={isTyping}
          avatarUrl={avatarUrl}
        />
      </div>

      {/* 하단 마진 */}
      <div className="h-4 flex-shrink-0" />

      {/* ChatSendBox - 고정 높이 */}
      <div className="flex-shrink-0 pb-8">
        <ChatSendBox setIsTyping={setIsTyping} />
      </div>
    </div>
  );
}
