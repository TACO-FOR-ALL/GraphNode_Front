import ChatWindow from "../components/ChatWindow";
import ChatSendBox from "../components/ChatSendBox";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";

export default function Chat() {
  const [isTyping, setIsTyping] = useState(false);
  const { threadId } = useParams<{ threadId?: string }>();
  const { isExpanded } = useSidebarExpandStore();

  const width = isExpanded ? "744px" : "916px";

  return (
    <div
      className="relative h-full pt-16"
      style={{
        width,
        margin: "0 auto",
        transition: "width 0.5s ease",
      }}
    >
      <ChatWindow threadId={threadId || undefined} isTyping={isTyping} />
      <ChatSendBox setIsTyping={setIsTyping} />
    </div>
  );
}
