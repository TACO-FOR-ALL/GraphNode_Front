import { useEffect, useRef, useState } from "react";
import { IoMdSend } from "react-icons/io";
import OpenAI from "openai";
import { FaRegStopCircle } from "react-icons/fa";
import uuid from "../utils/uuid";
import threadRepo from "../managers/threadRepo";
import { useSelectedThreadStore } from "@/store/useSelectedThreadStore";
import { ChatMessageRequest } from "@/types/Chat";
import {
  OPENAI_MODEL,
  OPENAI_MODEL_DEFAULT,
  OpenAIModel,
} from "@/constants/OPENAI_MODEL";
import AutoResizeTextarea from "./AutoResizeTextArea";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const HISTORY_LIMIT = 5;

export default function ChatSendBox({
  setIsTyping,
}: {
  setIsTyping: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState<OpenAIModel>(OPENAI_MODEL_DEFAULT);
  const [end, setEnd] = useState<boolean>(true);

  const { selectedThreadId, setSelectedThreadId } = useSelectedThreadStore();

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

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || !clientReady) return;
    setEnd(false);
    setSending(true);

    // 1) 스레드 준비 (없으면 새로 만들고 선택)
    let tid = selectedThreadId;
    if (!tid) {
      const created = await threadRepo.create("loading…", []);
      tid = created.id;
      setSelectedThreadId(tid);
    }
    console.log(tid);

    // 2) 유저 메시지 즉시 저장
    const userMsg = {
      id: uuid(),
      role: "user" as const,
      content: text,
      ts: Date.now(),
    };
    const msg = await threadRepo.addMessageToThreadById(tid!, userMsg);
    setInput("");
    console.log(msg);

    // 3) UI 타이핑 표시
    setIsTyping(true);

    try {
      // 4) 최근 N개 이력만 전송
      const th = await threadRepo.getThreadById(tid!);
      const history = (th?.messages ?? [])
        .slice(-HISTORY_LIMIT)
        .map((m) => ({ role: m.role, content: m.content }));

      // 5) OpenAI 호출
      const resp = await window.openaiAPI.request(
        key!,
        false, // stream (실시간 구현), signal도 확장 가능
        model,
        history as ChatMessageRequest[]
      );

      console.log("resp", resp);

      const assistantText = resp.ok
        ? (resp.data.choices?.[0]?.message?.content ??
          "⚠️ 응답을 파싱할 수 없어요.")
        : `❌ API 오류: ${resp.error || "unknown_error"}`;

      console.log("assistantText", assistantText);

      // 6) 새 스레드면 제목 추론 후 갱신
      if (th?.title === "loading…" || !th?.title) {
        const result = await window.openaiAPI.requestGenerateThreadTitle(
          key!,
          text,
          {
            timeoutMs: 10000,
          }
        );
        const title = result.ok
          ? result.data
          : text.slice(0, 15) + (text.length > 15 ? "…" : "");
        await threadRepo.updateThreadTitleById(tid!, title);
        queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
      }

      // 7) 어시스턴트 메시지 저장 (확정본만)
      await threadRepo.addMessageToThreadById(tid!, {
        id: uuid(),
        role: "assistant",
        content: assistantText,
        ts: Date.now(),
      });
    } catch (err: any) {
      await threadRepo.addMessageToThreadById(tid!, {
        id: uuid(),
        role: "assistant",
        content: `❌ 오류: ${err?.message || err}`,
        ts: Date.now(),
      });
    } finally {
      setIsTyping(false);
      setSending(false);
      setEnd(true);
    }
  };

  return (
    <div className="flex flex-col border-gray-200 bg-white">
      <div className="flex items-center justify-between p-3 border-t ">
        <AutoResizeTextarea
          value={input}
          onChange={setInput}
          onKeyDown={(e) => e.key === "Enter" && clientReady && handleSend()}
          disabled={sending || !clientReady}
        />
        <button
          onClick={() => clientReady && handleSend()}
          disabled={sending || !clientReady}
          className="w-8 h-8 text-gray-500 hover:text-blue-500 disabled:opacity-50"
          title="보내기"
        >
          {end ? <IoMdSend /> : <FaRegStopCircle />}
        </button>
      </div>

      <div className="flex items-center justify-between px-3 mb-2 w-[200px] bg-white">
        <select
          name="model"
          value={model}
          onChange={(e) => setModel(e.target.value as OpenAIModel)}
        >
          {OPENAI_MODEL.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
