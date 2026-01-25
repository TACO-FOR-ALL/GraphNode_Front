// TODO: 리펙토링 시급함
import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { IoClose } from "react-icons/io5";
import { FaArrowRight } from "react-icons/fa6";
import { IoIosArrowDown, IoIosClose } from "react-icons/io";
import { agentChatStream } from "@/managers/agentClient";
import { noteRepo } from "@/managers/noteRepo";
import { threadRepo } from "@/managers/threadRepo";
import { useNoteGenerationStore } from "@/store/useNoteGenerationStore";
import { useAgentToolBoxStore } from "@/store/useAgentToolBoxStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Note } from "@/types/Note";
import type { ChatThread } from "@/types/Chat";
import logo from "@/assets/icons/logo.svg";
import AgentAutoResizeTextarea from "../AgentAutoResizeTextArea";
import { RiFileInfoFill } from "react-icons/ri";
import { FaPen } from "react-icons/fa";
import { useTranslation } from "react-i18next";

type SelectedSource = {
  type: "chat" | "note";
  id: string;
  title: string;
};

export default function AiAgentChatBox({
  setIsOpen,
}: {
  setIsOpen: (isOpen: boolean) => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams<{ noteId?: string; threadId?: string }>();
  const queryClient = useQueryClient();
  const { phase, setPhase, reset } = useNoteGenerationStore();
  const { response, setResponse } = useAgentToolBoxStore();

  const [input, setInput] = useState("");
  const [selectedSources, setSelectedSources] = useState<SelectedSource[]>([]);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Array<{
      role: "system" | "user";
      content: string;
      status?: "progress" | "completed";
    }>
  >([]);
  const noteCreatedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const userMessageRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastUserMsgIdxRef = useRef<number>(-1);

  // 메시지가 추가되면 스크롤 처리
  useEffect(() => {
    if (messages.length === 0) {
      lastUserMsgIdxRef.current = -1;
      return;
    }

    const lastMsg = messages[messages.length - 1];

    // 새 유저 메시지가 추가되었을 때 → 유저 메시지를 상단으로
    if (lastMsg?.role === "user") {
      // 마지막 유저 메시지 인덱스 업데이트
      lastUserMsgIdxRef.current = messages.length - 1;
      setTimeout(() => {
        userMessageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    } else {
      // 시스템 메시지가 추가되었을 때 → 맨 아래로 스크롤
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 50);
    }
  }, [messages]);

  // 작업 중 여부 확인 (done과 error는 처리 완료 상태)
  const isProcessing =
    phase !== "idle" && phase !== "done" && phase !== "error";

  // response가 변경되면 messages에 추가
  useEffect(() => {
    if (response) {
      setMessages([
        {
          role: "system",
          content: response,
        },
      ]);
    }
  }, [response, setResponse]);

  // Path에서 현재 파일 추출
  useEffect(() => {
    const path = location.pathname;

    // path에서 직접 추출 (params가 제대로 작동하지 않을 수 있음)
    const pathParts = path.split("/").filter(Boolean);
    const currentNoteId =
      pathParts[0] === "notes" && pathParts[1] ? pathParts[1] : null;
    const currentThreadId =
      pathParts[0] === "chat" && pathParts[1] ? pathParts[1] : null;

    // Note 추출
    const noteId = params.noteId || currentNoteId;
    if (noteId) {
      noteRepo
        .getNoteById(noteId)
        .then((note) => {
          if (note) {
            setSelectedSources((prev) => {
              // 이미 해당 note가 선택되어 있는지 확인
              const exists = prev.some(
                (s) => s.type === "note" && s.id === note.id
              );
              if (!exists) {
                // 없으면 추가
                return [
                  ...prev,
                  {
                    type: "note" as const,
                    id: note.id,
                    title: note.title,
                  },
                ];
              }
              // 있으면 그대로 유지
              return prev;
            });
          }
        })
        .catch((err) => {
          console.error("Failed to load note:", err);
        });
    }

    // Chat 추출
    const threadId = params.threadId || currentThreadId;
    if (threadId) {
      threadRepo
        .getThreadById(threadId)
        .then((thread) => {
          if (thread) {
            setSelectedSources((prev) => {
              // 이미 해당 thread가 선택되어 있는지 확인
              const exists = prev.some(
                (s) => s.type === "chat" && s.id === thread.id
              );
              if (!exists) {
                // 없으면 추가
                return [
                  ...prev,
                  {
                    type: "chat" as const,
                    id: thread.id,
                    title: thread.title,
                  },
                ];
              }
              // 있으면 그대로 유지
              return prev;
            });
          }
        })
        .catch((err) => {
          console.error("Failed to load thread:", err);
        });
    }
  }, [location.pathname, params.noteId, params.threadId]);

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSourceDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 선택된 소스 제거
  const removeSource = (id: string) => {
    setSelectedSources((prev) => prev.filter((s) => s.id !== id));
  };

  // Chat/Note 선택 추가
  const addSource = (type: "chat" | "note", id: string, title: string) => {
    setSelectedSources((prev) => {
      if (!prev.some((s) => s.id === id)) {
        return [...prev, { type, id, title }];
      }
      return prev;
    });
    setShowSourceDropdown(false);
  };

  // Send 버튼 클릭 (messageOverride로 직접 메시지를 전달할 수 있음)
  const handleSend = async (messageOverride?: string) => {
    const userMessage = (messageOverride ?? input).trim();
    if (!userMessage || isProcessing) return;

    noteCreatedRef.current = false;
    reset();

    // 유저 메시지 추가 + 응답 대기 중 표시
    setMessages((prev) => [
      ...prev,
      { role: "user" as const, content: userMessage },
      {
        role: "system" as const,
        content: "응답을 생성하고 있습니다...",
        status: "progress" as const,
      },
    ]);
    setInput("");

    try {
      // 선택된 소스들의 내용을 가져와서 합치기
      let contextText = "";

      if (selectedSources.length > 0) {
        const allContent: string[] = [];

        for (const source of selectedSources) {
          if (source.type === "chat") {
            const thread = await threadRepo.getThreadById(source.id);
            if (thread) {
              const chatText = thread.messages
                .map((msg) => {
                  const role = msg.role === "user" ? "사용자" : "AI";
                  return `**${role}**:\n${msg.content}`;
                })
                .join("\n\n---\n\n");
              allContent.push(`[${source.title}]\n${chatText}`);
            }
          } else if (source.type === "note") {
            const note = await noteRepo.getNoteById(source.id);
            if (note) {
              allContent.push(`[${source.title}]\n${note.content}`);
            }
          }
        }

        contextText = allContent.join("\n\n===\n\n");
      }

      // 스트리밍 응답 시작
      setPhase("analyzing", "요청 분석 중...");

      let fullAnswer = "";

      const result = await agentChatStream({
        userMessage,
        contextText: contextText || undefined,
        callbacks: {
          onStatus: (event) => {
            setPhase(event.phase as any, event.message);
          },
          onChunk: (event) => {
            fullAnswer += event.text;
            // 스트리밍 중 메시지 업데이트
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (
                lastMsg?.role === "system" &&
                lastMsg?.status === "progress"
              ) {
                // 마지막 메시지가 progress면 내용 업데이트
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, content: fullAnswer },
                ];
              } else {
                // 새 시스템 메시지 추가
                return [
                  ...prev,
                  {
                    role: "system" as const,
                    content: fullAnswer,
                    status: "progress" as const,
                  },
                ];
              }
            });
          },
          onResult: async (event) => {
            setPhase("done", "완료");

            // 최종 메시지 업데이트
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.role === "system") {
                return [
                  ...prev.slice(0, -1),
                  {
                    ...lastMsg,
                    content: event.answer,
                    status: "completed" as const,
                  },
                ];
              }
              return [
                ...prev,
                {
                  role: "system" as const,
                  content: event.answer,
                  status: "completed" as const,
                },
              ];
            });

            // 노트 생성 모드인 경우 노트 저장
            if (event.mode === "note" && event.noteContent) {
              if (noteCreatedRef.current) return;
              noteCreatedRef.current = true;

              const cleanedContent = event.noteContent
                .trim()
                .replace(/^```markdown\s*\n?/i, "")
                .replace(/\n?```\s*$/, "")
                .replace(/^```\s*\n?/, "")
                .replace(/^```md\s*\n?/i, "")
                .trim();

              await noteRepo.create(cleanedContent);
              queryClient.invalidateQueries({ queryKey: ["notes"] });

              setMessages((prev) => [
                ...prev,
                {
                  role: "system" as const,
                  content: "📝 노트가 생성되었습니다!",
                  status: "completed" as const,
                },
              ]);
            }
          },
          onError: (event) => {
            setPhase("error", event.message);
            setMessages((prev) => [
              ...prev,
              {
                role: "system",
                content: `오류: ${event.message}`,
              },
            ]);
          },
        },
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      setPhase("error", error instanceof Error ? error.message : String(error));
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `오류 발생: ${error instanceof Error ? error.message : String(error)}`,
        },
      ]);
    }
  };

  // Chat/Note 목록 가져오기
  const { data: allNotes } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: () => noteRepo.getAllNotes(),
  });

  const { data: allThreads } = useQuery<ChatThread[]>({
    queryKey: ["chatThreads"],
    queryFn: () => threadRepo.getThreadList(),
  });

  return (
    <div className="absolute bottom-9 right-9 z-50 w-96 h-[520px] bg-bg-primary rounded-xl shadow-[0_2px_20px_0_#badaff] border-[1px] border-[rgba(var(--color-chatbox-border-rgb),0.2)] flex flex-col overflow-hidden p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-center gap-2">
          <img src={logo} alt="logo" className="w-3 h-3" />
          <span className="text-[12px] font-medium text-text-primary">GraphNode AI Agent</span>
        </div>
        <IoIosClose
          onClick={() => setIsOpen(false)}
          className="text-xl text-text-secondary"
        />
      </div>

      {/* body */}
      <section
        ref={sectionRef}
        className={`flex flex-col h-full py-5 ${messages.length > 0 ? "overflow-y-auto items-start justify-start" : "items-start justify-end"}`}
      >
        {messages.length === 0 ? (
          <>
            <p className="text-[30px] font-medium mb-1 text-text-primary">
              {t("aiAgentChatBox.title")}
            </p>
            <p className="text-[20px] font-medium mb-3 text-text-primary">
              {t("aiAgentChatBox.subtitle")}
            </p>
            <div
              onClick={() => {
                if (selectedSources.length === 0) {
                  setAlertMessage(t("aiAgentChatBox.selectSourceFirst"));
                  setTimeout(() => setAlertMessage(null), 3000);
                  return;
                }
                const sourceNames = selectedSources
                  .map((s) => s.title)
                  .join(", ");
                handleSend(`Summarize this content: ${sourceNames}`);
              }}
              className="w-full mb-2 flex items-center justify-start gap-2 px-[10px] py-2 rounded-full group hover:bg-sidebar-button-hover cursor-pointer"
            >
              <RiFileInfoFill className="w-4 h-4 text-text-primary group-hover:text-primary" />
              <p className="text-[14px] font-medium text-text-primary group-hover:text-primary">
                {t("aiAgentChatBox.summary")}
              </p>
            </div>
            <div
              onClick={() => {
                if (selectedSources.length === 0) {
                  setAlertMessage(t("aiAgentChatBox.selectSourceFirst"));
                  setTimeout(() => setAlertMessage(null), 3000);
                  return;
                }
                const sourceNames = selectedSources
                  .map((s) => s.title)
                  .join(", ");
                handleSend(`Make a note of: ${sourceNames}`);
              }}
              className="w-full flex items-center justify-start gap-2 px-[10px] py-2 rounded-full group hover:bg-sidebar-button-hover cursor-pointer"
            >
              <FaPen className="w-3 h-3 text-text-primary group-hover:text-primary" />
              <p className="text-[14px] font-medium text-text-primary group-hover:text-primary">
                {t("aiAgentChatBox.note")}
              </p>
            </div>
            {alertMessage && selectedSources.length === 0 && (
              <div className="mt-2 px-3 py-2 bg-frame-bar-red/10 text-frame-bar-red text-[12px] rounded-lg">
                {alertMessage}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            {messages.map((msg, idx) => {
              // 마지막 유저 메시지인지 확인
              let isLastUserMessage = false;
              if (msg.role === "user") {
                isLastUserMessage = true;
                for (let i = idx + 1; i < messages.length; i++) {
                  if (messages[i].role === "user") {
                    isLastUserMessage = false;
                    break;
                  }
                }
              }

              return (
                <div
                  key={idx}
                  ref={isLastUserMessage ? userMessageRef : null}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] ${
                      msg.role === "user"
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-bg-tertiary text-text-primary rounded-bl-none"
                    }`}
                  >
                    {msg.role === "system" && msg.status === "progress" && (
                      <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse mr-2" />
                    )}
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </section>

      <div className="flex flex-col border-solid border-[1px] border-text-placeholder rounded-[16px] py-2 px-[10px]">
        {/* context 선택 영역 */}
        <div className="flex items-center gap-[6px] mb-2">
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() =>
                !isProcessing && setShowSourceDropdown(!showSourceDropdown)
              }
              className={`flex items-center gap-1 text-[10px] px-2 py-[4px] pb-[5px] border-[1px] text-text-secondary border-text-placeholder rounded-full ${
                isProcessing
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-bg-tertiary"
              }`}
            >
              @
            </div>

            {/* 드롭다운 메뉴 */}
            {showSourceDropdown && (
              <div className="absolute bottom-full left-0 mt-1 bg-bg-primary border border-base-border rounded shadow-lg z-10 w-48 max-h-64 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <div className="p-2 border-b border-base-border">
                    <p className="text-xs font-semibold text-text-secondary mb-1">
                      Chat
                    </p>
                    <div className="space-y-1">
                      {allThreads && allThreads.length > 0 ? (
                        allThreads.map((thread) => (
                          <button
                            key={thread.id}
                            onClick={() =>
                              addSource("chat", thread.id, thread.title)
                            }
                            className="w-full text-left px-2 py-1 text-xs hover:bg-bg-tertiary rounded text-text-primary"
                          >
                            {thread.title}
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-text-tertiary px-2">
                          채팅이 없습니다
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-text-secondary mb-1">
                      Note
                    </p>
                    <div className="space-y-1">
                      {allNotes && allNotes.length > 0 ? (
                        allNotes.map((note) => (
                          <button
                            key={note.id}
                            onClick={() =>
                              addSource("note", note.id, note.title)
                            }
                            className="w-full text-left px-2 py-1 text-xs hover:bg-bg-tertiary rounded text-text-primary"
                          >
                            {note.title}
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-text-tertiary px-2">
                          노트가 없습니다
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {selectedSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center relative gap-1 border-[1px] px-2 py-[6px] text-[10px] border-text-placeholder text-text-secondary rounded-full group"
            >
              <div
                onClick={() => removeSource(source.id)}
                className="absolute top-0 right-0 hidden group-hover:flex items-center justify-center bg-text-secondary z-10 rounded-full h-full aspect-square opacity-70"
              >
                <IoClose className="w-3 h-3 text-white" />
              </div>
              <span className="truncate max-w-[70px]">{source.title}</span>
            </div>
          ))}
        </div>
        <AgentAutoResizeTextarea
          value={input}
          onChange={(value) => {
            setInput(value);
          }}
          placeholder="Ask, Search, or make anything..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && input.trim()) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isProcessing}
        />
        {/* 인스턴스 선택 및 보내기 버튼 */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-1 items-center cursor-pointer">
            <p className="font-noto-sans-kr text-[12px] font-medium text-text-secondary">
              <span className="text-chatbox-active">ChatGPT</span> 5.1 Instant
            </p>
            <IoIosArrowDown className="text-[16px] text-chatbox-active" />
          </div>
          <div
            onClick={() => !isProcessing && input.trim() && handleSend()}
            className={`w-5 h-5 flex items-center justify-center rounded-full text-white cursor-pointer ${input.length === 0 || isProcessing ? "bg-text-placeholder" : "bg-primary"}`}
          >
            {isProcessing ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaArrowRight className="w-3 h-3" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
