// ChatWindow.tsx
import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import threadRepo from "../managers/threadRepo";
import MarkdownBubble from "./MarkdownBubble";

export default function ChatWindow({ threadId }: { threadId?: string }) {
  const [tick, setTick] = useState(0); // 외부 저장 갱신 이벤트 받으면 setTick(n+1) 하게끔(threadsBus로)
  const wrapRef = useRef<HTMLDivElement>(null);

  const thread = useMemo(
    () => (threadId ? threadRepo.get(threadId) : undefined),
    [threadId, tick]
  );
  const messages = useMemo(() => {
    if (!thread) return [];
    // 오래된→최신(오름차순) 정렬
    return [...thread.messages].sort((a, b) => a.ts - b.ts);
  }, [thread]);

  // 최초 진입 시 맨 아래로
  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
  }, [threadId]);

  // 새 메시지가 들어왔는데, 유저가 바닥 근처면 자동으로 바닥 붙이기
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const distanceFromBottom =
      el.scrollHeight - (el.scrollTop + el.clientHeight);
    const nearBottom = distanceFromBottom < 120; // 임계값
    if (nearBottom) {
      // 다음 페인트 이후로 밀어 붙이기
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages.length]);

  if (!threadId) return <div className="p-4">왼쪽에서 채팅을 선택하세요</div>;
  if (!thread) return <div className="p-4">스레드를 찾을 수 없어요</div>;

  return (
    <div ref={wrapRef} className="p-4 h-full overflow-y-auto">
      <h3 className="mt-0 mb-3 font-semibold">{thread.title}</h3>
      {messages.map((m) => {
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
    </div>
  );
}
