import { useEffect, useRef, useState } from "react";
import { FaArrowRight } from "react-icons/fa6";
import uuid from "../../utils/uuid";
import threadRepo from "../../managers/threadRepo";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import AutoResizeTextarea from "../AutoResizeTextArea";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/apiClient";
import { MdAttachFile } from "react-icons/md";
import FilePreviewList from "../FilePreviewList";
import useFileAttachment from "@/hooks/useFileAttachment";
import useDragDrop from "@/hooks/useDragDrop";
import { useTranslation } from "react-i18next";
import { useToastStore } from "@/store/useToastStore";
import { OPENAI_MODEL_DEFAULT, type OpenAIModel } from "@/constants/OPENAI_MODEL";
import ModelSelector from "@/components/common/ModelSelector";
import { playSound } from "@/utils/sound";

export default function ChatSendBox({
  setIsTyping,
}: {
  setIsTyping: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { threadId } = useParams<{ threadId?: string }>();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedModel, setSelectedModel] = useState<OpenAIModel>(OPENAI_MODEL_DEFAULT);
  const autoSendRef = useRef(false);
  const processedLocationKeyRef = useRef<string | null>(null);
  const sendingRef = useRef(false);

  const {
    attachedFiles,
    previewUrls,
    fileInputRef,
    handleButtonClick,
    handleFileChange,
    handleDropFile,
    handleRemoveFile,
    clearFiles,
  } = useFileAttachment();

  const { dragProps } = useDragDrop({
    onFileDrop: handleDropFile,
  });

  // threadId가 변경되면 리셋
  useEffect(() => {
    autoSendRef.current = false;
    processedLocationKeyRef.current = null;
  }, [threadId]);

  const handleSendMessage = async (
    messageText: string,
    targetThreadId: string,
    id: string,
    filesOverride?: File[], // [Fixed] 인자 추가: 외부(Home 등)에서 전달된 파일 강제 사용
    modelOverride?: OpenAIModel, // Home에서 전달된 모델
  ) => {
    if (!messageText || sending || sendingRef.current) return;

    // 첨부파일 우선순위: filesOverride > attachedFiles
    const filesToSend =
      filesOverride && filesOverride.length > 0 ? filesOverride : attachedFiles;

    // 모델 우선순위: modelOverride > selectedModel
    const modelToUse = modelOverride ?? selectedModel;

    // 중복 실행 방지
    sendingRef.current = true;
    setSending(true);

    // 2) UI 타이핑 표시
    setIsTyping(true);
    clearFiles();

    try {
      // =========================================================================================
      // [API Usage Note]
      // 1. 기본 사용법 (api.ai.chat)
      //    - 가장 권장되는 고수준 API입니다.
      //    - 내부적으로 SSE를 사용하며, 'onStream' 콜백을 통해 타이핑 효과(청크 수신)를 쉽게 구현할 수 있습니다.
      //    - 모든 스트림이 완료되면 최종 결과(AIChatResponseDto)를 Promise로 반환합니다.
      //
      // 2. 고급 제어 (api.ai.chatStream)
      //    - SSE 이벤트를 직접 제어해야 하는 경우(예: 커스텀 이벤트 처리 등)에만 사용하는 저수준 API입니다.
      //    - onEvent 콜백을 통해 { event, data } 형태의 Raw 이벤트를 직접 처리해야 합니다.
      //    - 일반적인 챗 기능 구현에는 1번(api.ai.chat)으로 충분합니다.
      // =========================================================================================

      // 어시스턴트 메시지 ID 생성 (스트리밍용)
      const assistantMessageId = uuid();
      let streamingText = "";
      let lastUpdateTime = 0;
      const THROTTLE_INTERVAL = 100; // 100ms마다 한 번만 DB 업데이트

      // 스트리밍 시작 전 빈 어시스턴트 메시지 추가
      await threadRepo.addMessageToThreadById(targetThreadId, {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        ts: Date.now(),
      });

      try {
        await api.ai.chatStream(
          targetThreadId,
          {
            model: "openai",
            id: id,
            chatContent: messageText,
            modelName: modelToUse,
          },
          filesToSend,
          async (event) => {
            switch (event.event) {
              case "chunk":
                // 실시간 타이핑 효과 - 텍스트 청크 받을 때마다
                streamingText += event.data.text;

                // Throttling: 100ms마다 한 번만 DB 업데이트
                const now = Date.now();
                if (now - lastUpdateTime >= THROTTLE_INTERVAL) {
                  lastUpdateTime = now;
                  await threadRepo.updateMessageInThreadById(
                    targetThreadId,
                    assistantMessageId,
                    streamingText,
                  );
                }
                break;

              case "result":
                // 스트리밍 완료 - 최종 응답
                const messages = event.data.messages;
                const title = event.data.title ?? null;

                const assistantText =
                  messages[1]?.content ?? "⚠️ 응답을 파싱할 수 없어요.";

                // 타이틀 업데이트
                if (title) {
                  await threadRepo.updateThreadTitleById(targetThreadId, title);
                  queryClient.invalidateQueries({ queryKey: ["chatThreads"] });
                }

                // 최종 메시지로 업데이트
                await threadRepo.updateMessageInThreadById(
                  targetThreadId,
                  assistantMessageId,
                  assistantText,
                );

                // 스트리밍 완료 - 타이핑 상태 해제
                setIsTyping(false);
                setSending(false);
                sendingRef.current = false;

                // 메시지 수신 완료 사운드
                playSound("message");
                break;

              case "error":
                // 에러 처리
                console.error("SSE Error event:", event.data);

                // API키 미등록 에러 (403) 처리
                if (
                  event.data.statusCode === 403 ||
                  event.data.status === 403
                ) {
                  addToast({
                    message: t("toast.apiKeyRequired"),
                    type: "error",
                    action: {
                      label: t("toast.goToSettings"),
                      onClick: () => navigate("/settings"),
                    },
                  });

                  // 빈 메시지 삭제
                  await threadRepo.deleteMessageFromThreadById(
                    targetThreadId,
                    assistantMessageId,
                  );

                  // 타이핑 상태 해제
                  setIsTyping(false);
                  setSending(false);
                  sendingRef.current = false;
                  return;
                }

                // 기타 에러는 에러 메시지로 업데이트
                await threadRepo.updateMessageInThreadById(
                  targetThreadId,
                  assistantMessageId,
                  `❌ API 오류: ${event.data.message || "unknown_error"}`,
                );

                // 타이핑 상태 해제
                setIsTyping(false);
                setSending(false);
                sendingRef.current = false;
                break;

              case "status":
                // 상태 업데이트
                console.log("Status update:", event.data);

                // phase가 'done'이면 스트리밍 완료
                if (event.data.phase === "done") {
                  // 마지막으로 누적된 텍스트로 최종 업데이트
                  if (streamingText) {
                    await threadRepo.updateMessageInThreadById(
                      targetThreadId,
                      assistantMessageId,
                      streamingText,
                    );
                  }

                  // 타이핑 상태 해제
                  setIsTyping(false);
                  setSending(false);
                  sendingRef.current = false;
                }
                break;
            }
          },
        );
      } catch (streamError: any) {
        // SSE 연결 자체가 실패한 경우 (예: 403 Forbidden)
        console.error("SSE Connection failed:", streamError);
        console.error("Error details:", {
          message: streamError?.message,
          status: streamError?.status,
          statusCode: streamError?.statusCode,
          fullError: streamError,
        });

        // 403 에러 확인 (fetch 레벨 에러) - 더 포괄적으로 체크
        const errorString = String(streamError).toLowerCase();
        const is403Error =
          streamError?.message?.toLowerCase().includes("403") ||
          streamError?.message?.toLowerCase().includes("forbidden") ||
          streamError?.status === 403 ||
          streamError?.statusCode === 403 ||
          errorString.includes("403") ||
          errorString.includes("forbidden");

        console.log("Is 403 error:", is403Error);

        if (is403Error) {
          console.log("Attempting to show 403 toast...");
          addToast({
            message: t("toast.apiKeyRequired"),
            type: "error",
            action: {
              label: t("toast.goToSettings"),
              onClick: () => navigate("/settings"),
            },
          });
          console.log("Toast added");

          // 빈 메시지 삭제
          await threadRepo.deleteMessageFromThreadById(
            targetThreadId,
            assistantMessageId,
          );
        } else {
          // 기타 연결 실패 - 에러 메시지로 업데이트
          await threadRepo.updateMessageInThreadById(
            targetThreadId,
            assistantMessageId,
            `❌ 연결 실패: ${streamError?.message || "알 수 없는 오류"}`,
          );
        }

        // 타이핑 상태 해제
        setIsTyping(false);
        setSending(false);
        sendingRef.current = false;
      }
    } catch (err: any) {
      await threadRepo.addMessageToThreadById(targetThreadId, {
        id: uuid(),
        role: "assistant",
        content: `❌ 오류: ${err?.message || err}`,
        ts: Date.now(),
      });
      // 외부 에러 발생 시 상태 해제
      setIsTyping(false);
      setSending(false);
      sendingRef.current = false;
    }
    // finally 블록 제거 - result/error 이벤트에서 개별적으로 처리
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
      attachedFiles?: File[]; // [Check] 여기서 받은 File[]을 그대로 chat()에 넘기면 됨
      id?: string;
      selectedModel?: OpenAIModel;
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

    // Home에서 전달된 모델이 있으면 UI에도 적용
    if (state.selectedModel) {
      setSelectedModel(state.selectedModel);
    }

    // 메시지 저장 (navigate 전에)
    const messageText = state.initialMessage;
    const id = state.id;
    // location.state 초기화 (다음 렌더링에서 다시 실행되지 않도록)
    // navigate는 비동기이므로 먼저 실행
    navigate(location.pathname, { replace: true, state: {} });

    if (!id) {
      return; // TODO: 에러 처리
    }

    // 자동으로 메시지 전송 (비동기로 실행) - 전달된 모델 사용
    handleSendMessage(messageText, threadId, id, state.attachedFiles, state.selectedModel).catch(
      (err) => {
        console.error("Auto send failed:", err);
        // 에러 발생 시 ref 리셋하여 재시도 가능하게
        autoSendRef.current = false;
        processedLocationKeyRef.current = null;
      },
    );
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

    // 3) 메시지 전송 로직 실행
    await handleSendMessage(text, tid!, id);
  };

  return (
    <div
      {...dragProps}
      className="flex flex-col py-3 pl-3 items-center justify-center rounded-xl border-[1px] transition-all duration-500 border-[rgba(var(--color-chatbox-border-rgb),0.2)] border-solid shadow-[0_2px_20px_0_#badaff] bg-bg-primary/80 backdrop-blur-md"
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
          <ModelSelector value={selectedModel} onChange={setSelectedModel} />
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
