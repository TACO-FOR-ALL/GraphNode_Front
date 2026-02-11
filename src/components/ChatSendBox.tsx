import { useEffect, useRef, useState } from "react";
import { FaArrowRight } from "react-icons/fa6";
import { IoIosArrowDown } from "react-icons/io";
import uuid from "../utils/uuid";
import threadRepo from "../managers/threadRepo";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  OPENAI_MODEL,
  OPENAI_MODEL_DEFAULT,
  OpenAIModel,
} from "@/constants/OPENAI_MODEL";
import AutoResizeTextarea from "./AutoResizeTextArea";
import { useQueryClient } from "@tanstack/react-query";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";
import { api } from "@/apiClient";
import { MdAttachFile } from "react-icons/md";
import FilePreviewList from "./FilePreviewList";
import useFileAttachment from "@/hooks/useFileAttachment";
import { useTranslation } from "react-i18next";
import { useToastStore } from "@/store/useToastStore";

const HISTORY_LIMIT = 5;

export default function ChatSendBox({
  setIsTyping,
  setIsPinned,
}: {
  setIsTyping: (v: boolean) => void;
  setIsPinned: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
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

  const {
    attachedFiles,
    previewUrls,
    fileInputRef,
    handleButtonClick,
    handleFileChange,
    handleRemoveFile,
  } = useFileAttachment();

  // threadId가 변경되면 리셋
  useEffect(() => {
    autoSendRef.current = false;
    processedLocationKeyRef.current = null;
  }, [threadId]);

  const handleSendMessage = async (
    messageText: string,
    targetThreadId: string,
    id: string,
  ) => {
    if (!messageText || sending || sendingRef.current) return;

    // 중복 실행 방지
    sendingRef.current = true;
    setSending(true);

    // 2) UI 타이핑 표시
    setIsTyping(true);

    try {
      const result = await api.ai.chat(targetThreadId, {
        model: "openai",
        id: id,
        chatContent: messageText,
      });

      console.log(result);

      // API키 미등록 응답 처리 (TODO: statuscode 변경 필요)
      if (!result.isSuccess && result.error.statusCode == 500) {
        addToast({
          message: t("toast.apiKeyRequired"),
          type: "error",
          action: {
            label: t("toast.goToSettings"),
            onClick: () => navigate("/settings"),
          },
        });
        return;
      }

      // @ts-ignore
      const messages = result.data.messages;
      // @ts-ignore
      const title = result.data.title ?? null;

      const assistantText = result.isSuccess
        ? (messages[1]?.content ?? "⚠️ 응답을 파싱할 수 없어요.")
        : `❌ API 오류: ${result.error || "unknown_error"}`;

      if (title) {
        await threadRepo.updateThreadTitleById(targetThreadId, title);
        queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
      }

      // 6) 어시스턴트 메시지 저장 및 기존 대화
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
    if (autoSendRef.current || sending || !threadId) {
      return;
    }

    // Home의 ChatBox에서 navigate로 전달된 state를 가져옴
    const state = location.state as {
      autoSend?: boolean;
      initialMessage?: string;
      attachedFiles?: File[]; // TODO: FormData로 백엔드에게 넘기기
      id?: string;
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
    const id = state.id;
    // location.state 초기화 (다음 렌더링에서 다시 실행되지 않도록)
    // navigate는 비동기이므로 먼저 실행
    navigate(location.pathname, { replace: true, state: {} });

    if (!id) {
      return; // TODO: 에러 처리
    }

    // Pin-to-Top 모드 활성화
    setIsPinned(true);

    // 자동으로 메시지 전송 (비동기로 실행)
    handleSendMessage(messageText, threadId, id).catch((err) => {
      console.error("Auto send failed:", err);
      // 에러 발생 시 ref 리셋하여 재시도 가능하게
      autoSendRef.current = false;
      processedLocationKeyRef.current = null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, sending, location.key]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);

    // 1) 스레드 준비 (없으면 새로 만들고 URL 업데이트)
    let tid = threadId;
    if (!tid) {
      const created = await threadRepo.create("loading…", []);
      tid = created.id;
      navigate(`/chat/${tid}`, { replace: true });
    }

    const id = uuid();

    // 2) 유저 메시지 즉시 저장
    const userMsg = {
      id: id,
      role: "user" as const,
      content: text,
      ts: Date.now(),
    };
    await threadRepo.addMessageToThreadById(tid!, userMsg);
    setInput("");

    // 3) Pin-to-Top 모드 활성화
    setIsPinned(true);

    // 4) 메시지 전송 로직 실행
    await handleSendMessage(text, tid!, id);
  };

  const width = isExpanded ? "744px" : "916px";

  return (
    <div
      className={`flex w-[${width}] absolute bottom-8 left-0 right-0 flex-col py-3 pl-3 items-center justify-center rounded-xl border-[1px] transition-all duration-500 border-[rgba(var(--color-chatbox-border-rgb),0.2)] border-solid shadow-[0_2px_20px_0_#badaff] bg-bg-primary/80 backdrop-blur-md`}
    >
      <FilePreviewList
        files={attachedFiles}
        previewUrls={previewUrls}
        onRemove={handleRemoveFile}
      />
      <AutoResizeTextarea
        value={input}
        onChange={setInput}
        placeholder={t("chat.helpMessage")}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && input.trim()) {
            e.preventDefault();
            handleSend();
          }
        }}
        disabled={sending}
      />
      <div className="flex items-center justify-between w-full">
        <div className="flex gap-4 items-center">
          <div className="flex gap-1 items-center cursor-pointer bg-[rgba(var(--color-chatbox-active-rgb),0.05)] p-[6px] rounded-[8px] shadow-[0_0_3px_0_#badaff]">
            <p className="font-noto-sans-kr text-[12px] font-medium text-text-secondary">
              <span className="text-chatbox-active">ChatGPT</span> 5.1 Instant
            </p>
            <IoIosArrowDown className="text-[16px] text-chatbox-active" />
          </div>
          <div
            onClick={handleButtonClick}
            className="text-text-secondary hover:text-primary items-center justify-center text-center text-[16px] hover:bg-sidebar-button-hover rounded-md p-1.5 border-1 border-gray-300 dark:border-gray-500 hover:border-0"
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <MdAttachFile />
          </div>
        </div>
        <div
          onClick={() => input.trim().length > 0 && !sending && handleSend()}
          className={`w-[28px] h-[28px] text-white p-[6px] text-[16px] rounded-[8px] mr-3 flex items-center justify-center ${
            input.trim().length > 0 && !sending
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
