import ChatWindow from "../components/ChatWindow";
import ChatSendBox from "../components/ChatSendBox";
import { useSelectedThreadStore } from "@/store/useSelectedThreadStore";
import { useState } from "react";

export default function Home() {
  const [isTyping, setIsTyping] = useState(false);
  const { selectedThreadId } = useSelectedThreadStore();

  return (
    <>
      <ChatWindow threadId={selectedThreadId} isTyping={isTyping} />
      <ChatSendBox setIsTyping={setIsTyping} />
    </>
  );
}
