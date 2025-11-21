import ChatWindow from "../components/ChatWindow";
import ChatSendBox from "../components/ChatSendBox";
import { useSelectedThreadStore } from "@/store/useSelectedThreadIdStore";
import { useState } from "react";

export default function Chat() {
  const [isTyping, setIsTyping] = useState(false);
  const { selectedThreadId } = useSelectedThreadStore();

  return (
    <>
      <ChatWindow threadId={selectedThreadId} isTyping={isTyping} />
      <ChatSendBox setIsTyping={setIsTyping} />
    </>
  );
}
