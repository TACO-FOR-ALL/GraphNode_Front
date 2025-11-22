import { useEffect, useRef, useState } from "react";
import OpenAI from "openai";
import { FaArrowRight } from "react-icons/fa6";
import { IoIosArrowDown } from "react-icons/io";
import uuid from "../utils/uuid";
import threadRepo from "../managers/threadRepo";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ChatMessageRequest } from "@/types/Chat";
import {
  OPENAI_MODEL,
  OPENAI_MODEL_DEFAULT,
  OpenAIModel,
} from "@/constants/OPENAI_MODEL";
import AutoResizeTextarea from "./AutoResizeTextArea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";

const HISTORY_LIMIT = 5;

export default function ChatSendBox({
  setIsTyping,
}: {
  setIsTyping: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { threadId } = useParams<{ threadId?: string }>();
  const { isExpanded } = useSidebarExpandStore();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState<OpenAIModel>(OPENAI_MODEL_DEFAULT);
  const autoSendRef = useRef(false);
  const processedLocationKeyRef = useRef<string | null>(null);
  const sendingRef = useRef(false);

  // OpenAI 클라이언트 캐시 (키 로드 후 1회 생성)
  const clientRef = useRef<OpenAI | null>(null);

  const {
    data: key,
    isLoading: keyLoading,
    error: keyError,
  } = useQuery<string | null>({
    queryKey: ["openaiKey"],
    queryFn: () => window.keytarAPI.getAPIKey("openai"),
    staleTime: 5 * 60 * 1000, // 캐시 유지 시간
    retry: 1, // 오류 발생 시 재시도 횟수
  });

  const clientReady = !keyLoading && !keyError && key !== null;

  useEffect(() => {
    if (key && !clientRef.current) {
      clientRef.current = new OpenAI({
        apiKey: key,
        dangerouslyAllowBrowser: true,
      });
    }
  }, [key]);

  // threadId가 변경되면 리셋
  useEffect(() => {
    autoSendRef.current = false;
    processedLocationKeyRef.current = null;
  }, [threadId]);

  const handleSendMessage = async (
    messageText: string,
    targetThreadId: string
  ) => {
    if (!messageText || sending || !clientReady || sendingRef.current) return;

    // 중복 실행 방지
    sendingRef.current = true;
    setSending(true);

    // 1) 유저 메시지는 이미 추가되어 있으므로 스레드 가져오기
    const th = await threadRepo.getThreadById(targetThreadId);
    if (!th) {
      setSending(false);
      return;
    }

    // 2) UI 타이핑 표시
    setIsTyping(true);

    try {
      // 3) 최근 N개 이력만 전송
      const history = (th.messages ?? [])
        .slice(-HISTORY_LIMIT)
        .map((m) => ({ role: m.role, content: m.content }));

      // 4) OpenAI 호출
      const resp = await window.openaiAPI.request(
        key!,
        false,
        model,
        history as ChatMessageRequest[]
      );

      const assistantText = resp.ok
        ? (resp.data.choices?.[0]?.message?.content ??
          "⚠️ 응답을 파싱할 수 없어요.")
        : `❌ API 오류: ${resp.error || "unknown_error"}`;

      // 5) 새 스레드면 제목 추론 후 갱신
      if (th.title === "loading…" || !th.title) {
        const result = await window.openaiAPI.requestGenerateThreadTitle(
          key!,
          messageText,
          {
            timeoutMs: 10000,
          }
        );
        const title = result.ok
          ? result.data
          : messageText.slice(0, 15) + (messageText.length > 15 ? "…" : "");
        await threadRepo.updateThreadTitleById(targetThreadId, title);
        queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
      }

      // 6) 어시스턴트 메시지 저장
      await threadRepo.addMessageToThreadById(targetThreadId, {
        id: uuid(),
        role: "assistant",
        content: assistantText,
        ts: Date.now(),
      });
    } catch (err: any) {
      await threadRepo.addMessageToThreadById(targetThreadId, {
        id: uuid(),
        role: "assistant",
        content: `❌ 오류: ${err?.message || err}`,
        ts: Date.now(),
      });
    } finally {
      setIsTyping(false);
      setSending(false);
      sendingRef.current = false;
    }
  };

  // 자동 전송 로직 (Home에서 ChatBox로부터 전달된 경우)
  useEffect(() => {
    // 이미 처리했거나 전송 중이면 리턴
    if (autoSendRef.current || sending || !threadId || !clientReady) {
      return;
    }

    // Home의 ChatBox에서 navigate로 전달된 state를 가져옴
    const state = location.state as {
      autoSend?: boolean;
      initialMessage?: string;
    } | null;

    // state가 없거나 autoSend가 아니면 리턴
    if (!state?.autoSend || !state?.initialMessage) {
      return;
    }

    // React Router가 각 Navigation마다 생성하는 고유 키로, 같은 navigation을 중복 처리하지 않음
    if (processedLocationKeyRef.current === location.key) {
      return;
    }

    autoSendRef.current = true;
    processedLocationKeyRef.current = location.key;

    // 메시지 저장 (navigate 전에)
    const messageText = state.initialMessage;

    // location.state 초기화 (다음 렌더링에서 다시 실행되지 않도록)
    // navigate는 비동기이므로 먼저 실행
    navigate(location.pathname, { replace: true, state: {} });

    // 자동으로 메시지 전송 (비동기로 실행)
    handleSendMessage(messageText, threadId).catch((err) => {
      console.error("Auto send failed:", err);
      // 에러 발생 시 ref 리셋하여 재시도 가능하게
      autoSendRef.current = false;
      processedLocationKeyRef.current = null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, clientReady, sending, location.key]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !clientReady) return;
    setSending(true);

    // 1) 스레드 준비 (없으면 새로 만들고 URL 업데이트)
    let tid = threadId;
    if (!tid) {
      const created = await threadRepo.create("loading…", []);
      tid = created.id;
      navigate(`/chat/${tid}`, { replace: true });
    }

    // 2) 유저 메시지 즉시 저장
    const userMsg = {
      id: uuid(),
      role: "user" as const,
      content: text,
      ts: Date.now(),
    };
    await threadRepo.addMessageToThreadById(tid!, userMsg);
    setInput("");

    // 3) 메시지 전송 로직 실행
    await handleSendMessage(text, tid!);
  };

  const width = isExpanded ? "744px" : "916px";

  return (
    <div
      className="flex absolute bottom-8 left-0 right-0 flex-col py-3 pl-3 items-center justify-center rounded-xl border-[1px] transition-all duration-500 border-[rgba(var(--color-chatbox-border-rgb),0.2)] border-solid shadow-[0_2px_20px_0_#badaff]"
      style={{
        width,
        left: "50%",
        transform: "translateX(-50%)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        backgroundColor: "rgba(255, 255, 255, 0.5)",
      }}
    >
      <AutoResizeTextarea
        value={input}
        onChange={setInput}
        placeholder="How can I help you?"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && clientReady && input.trim()) {
            e.preventDefault();
            handleSend();
          }
        }}
        disabled={sending || !clientReady}
      />
      <div className="flex items-center justify-between w-full">
        <div className="flex gap-1 items-center cursor-pointer bg-[rgba(var(--color-chatbox-active-rgb),0.05)] p-[6px] rounded-[8px] shadow-[0_0_3px_0_#badaff]">
          <p className="font-noto-sans-kr text-[12px] font-medium text-text-secondary">
            <span className="text-chatbox-active">ChatGPT</span> 5.1 Instant
          </p>
          <IoIosArrowDown className="text-[16px] text-chatbox-active" />
        </div>
        <div
          onClick={() =>
            input.trim().length > 0 && clientReady && !sending && handleSend()
          }
          className={`w-[28px] h-[28px] text-white p-[6px] text-[16px] rounded-[8px] mr-3 flex items-center justify-center ${
            input.trim().length > 0 && clientReady && !sending
              ? "bg-chatbox-active cursor-pointer"
              : "bg-text-placeholder cursor-not-allowed"
          }`}
        >
          <FaArrowRight />
        </div>
      </div>
    </div>
  );
}
