import SemanticSearchPanel from "@/components/SemanticSearchPanel";
import { useSelectedThreadStore } from "@/store/useSelectedThreadStore";
import { useNavigate } from "react-router-dom";

export default function Search() {
  const { openThreadAndScrollToMessage } = useThreadNavigator(); // 네 라우팅 헬퍼라고 가정

  return (
    <div className="w-full h-full border-l">
      <SemanticSearchPanel
        onJump={(threadId, messageId) => {
          openThreadAndScrollToMessage(threadId, messageId);
        }}
      />
    </div>
  );
}

function useThreadNavigator() {
  const setSelectedThreadId = useSelectedThreadStore(
    (s) => s.setSelectedThreadId
  );
  const navigate = useNavigate(); // 라우터 쓰면 활성화

  return {
    openThreadAndScrollToMessage(threadId: string, messageId: string) {
      // 1) 선택된 스레드 갱신
      setSelectedThreadId(threadId);

      navigate(`/?thread=${threadId}&mid=${messageId}`);

      // 3) DOM 스크롤 (렌더 후)
      setTimeout(() => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) el.scrollIntoView({ block: "center" });
      }, 50);
    },
  };
}
