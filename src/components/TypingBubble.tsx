export default function TypingBubble() {
  return (
    <div
      className="inline-flex items-center gap-1"
      aria-label="assistant is typing"
    >
      <span className="sr-only">Typing…</span>
      <span className="w-2 h-2 rounded-full bg-gray-500 dot dot1" />
      <span className="w-2 h-2 rounded-full bg-gray-500 dot dot2" />
      <span className="w-2 h-2 rounded-full bg-gray-500 dot dot3" />
      {/* 컴포넌트 로컬 스타일로 키프레임 정의 */}
      <style>{`
        @keyframes blink {
          0% { opacity: .2; transform: translateY(0) }
          20% { opacity: 1; transform: translateY(-1px) }
          100% { opacity: .2; transform: translateY(0) }
        }
        .dot { animation: blink 1.2s infinite ease-in-out; }
        .dot1 { animation-delay: 0s; }
        .dot2 { animation-delay: .15s; }
        .dot3 { animation-delay: .3s; }
      `}</style>
    </div>
  );
}
