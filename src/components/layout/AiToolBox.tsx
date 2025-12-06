import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { IoClose } from "react-icons/io5";
import { FaArrowRight } from "react-icons/fa6";
import { IoIosArrowDown } from "react-icons/io";
import { agentChatToNoteStream } from "@/managers/agentClient";
import { noteRepo } from "@/managers/noteRepo";
import { threadRepo } from "@/managers/threadRepo";
import { useNoteGenerationStore } from "@/store/useNoteGenerationStore";
import { useAgentToolBoxStore } from "@/store/useAgentToolBoxStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Note } from "@/types/Note";
import type { ChatThread } from "@/types/Chat";
import MarkdownBubble from "../MarkdownBubble";

type SelectedSource = {
  type: "chat" | "note";
  id: string;
  title: string;
};

export default function AiToolBox({
  setIsOpen,
}: {
  setIsOpen: (isOpen: boolean) => void;
}) {
  const location = useLocation();
  const params = useParams<{ noteId?: string; threadId?: string }>();
  const queryClient = useQueryClient();
  const { phase, setPhase, reset } = useNoteGenerationStore();
  const { response, setResponse } = useAgentToolBoxStore();

  const [selectedSources, setSelectedSources] = useState<SelectedSource[]>([]);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [messages, setMessages] = useState<
    Array<{
      role: "system" | "user";
      content: string;
      status?: "progress" | "completed";
    }>
  >([]);
  const noteCreatedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 작업 중 여부 확인
  const isProcessing = phase !== "idle";

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

  // Send 버튼 클릭
  const handleSend = async () => {
    if (selectedSources.length === 0 || phase !== "idle") return;

    noteCreatedRef.current = false;
    reset();
    setMessages([]);

    try {
      // 선택된 소스들의 내용을 가져와서 합치기
      let allContent: string[] = [];

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

      const combinedContent = allContent.join("\n\n===\n\n");

      // 채팅 메시지 초기화
      setMessages([]);

      // 스트리밍으로 노트 생성
      const noteContent = await agentChatToNoteStream({
        chatText: combinedContent,
        instruction:
          "선택된 채팅과 노트의 중요 내역들을 잘 정리해서 노트로 만들어줘. 핵심 내용을 구조화하고 요약해서 작성해줘.",
        callbacks: {
          onStatus: (event) => {
            setPhase(event.phase as any, event.message);

            // 이전 단계를 완료 상태로 변경하고 새 단계 추가
            setMessages((prev) => {
              const updated = prev.map((msg) => {
                // 마지막 progress 상태 메시지를 completed로 변경
                if (msg.status === "progress") {
                  return {
                    ...msg,
                    status: "completed" as const,
                    content: msg.content.replace(" 중...", " 완료"),
                  };
                }
                return msg;
              });

              // 새 단계 추가
              const phaseMessages: Record<string, string> = {
                analyzing: "단계 1: 채팅 내용 분석 중...",
                summarizing: "단계 2: 핵심 내용 정리 중...",
                writing: "단계 3: 노트 작성 중...",
              };

              const phaseMessage = phaseMessages[event.phase] || event.message;

              return [
                ...updated,
                {
                  role: "system" as const,
                  content: phaseMessage,
                  status: "progress" as const,
                },
              ];
            });
          },
          onResult: async (event) => {
            if (noteCreatedRef.current) return;

            // 마크다운 코드 블록 제거
            const cleanedContent = event.noteContent
              .trim()
              .replace(/^```markdown\s*\n?/i, "")
              .replace(/\n?```\s*$/, "")
              .replace(/^```\s*\n?/, "")
              .replace(/^```md\s*\n?/i, "")
              .trim();

            noteCreatedRef.current = true;

            // 노트 생성 및 저장
            const newNote = await noteRepo.create(cleanedContent);
            queryClient.invalidateQueries({ queryKey: ["notes"] });

            setPhase("done", "노트 생성 완료");
            setMessages((prev) => {
              // 마지막 progress 상태를 completed로 변경
              const updated = prev.map((msg, idx) => {
                if (idx === prev.length - 1 && msg.status === "progress") {
                  return {
                    ...msg,
                    status: "completed" as const,
                    content: msg.content.replace(" 중...", " 완료"),
                  };
                }
                return msg;
              });

              return [
                ...updated,
                {
                  role: "system" as const,
                  content: "노트 생성 완료!",
                  status: "completed" as const,
                },
              ];
            });

            // 완료 후 자동 리셋 (3초 후)
            setTimeout(() => {
              reset();
              setMessages([]);
              noteCreatedRef.current = false;
            }, 3000);
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
      console.error("Failed to create note:", error);
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
    <div className="absolute bottom-9 right-9 z-50 w-96 h-[520px] bg-white rounded-xl shadow-[0_2px_20px_0_#badaff] border-[1px] border-[rgba(var(--color-chatbox-border-rgb),0.2)] flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm text-text-secondary">
          GraphNode AI
        </h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setResponse(null);
          }}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <IoClose className="w-4 h-4 text-text-secondary" />
        </button>
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 설명 텍스트 */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">
            Get started with GraphNode AI
          </h4>
          <p className="text-xs text-text-secondary">
            Search, Analyze your chat and edit or create notes.
          </p>
        </div>

        {/* 채팅 메시지 */}
        {messages.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`text-xs p-2 rounded ${
                  msg.status === "completed"
                    ? "bg-green-50 text-green-700"
                    : msg.status === "progress"
                      ? "bg-gray-100 text-text-secondary"
                      : msg.role === "system"
                        ? "bg-gray-100 text-text-secondary"
                        : "bg-blue-50 text-blue-700"
                }`}
              >
                {msg.status === "progress" && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
                    <span>{msg.content}</span>
                  </div>
                )}
                {msg.status !== "progress" && (
                  <div className="prose prose-sm max-w-none">
                    <MarkdownBubble text={msg.content} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* @ 아이콘 및 선택된 소스 */}
      <div className="space-y-2 p-4 border-t">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() =>
                !isProcessing && setShowSourceDropdown(!showSourceDropdown)
              }
              disabled={isProcessing}
              className={`flex items-center gap-1 px-2 py-1 text-sm border border-gray-300 rounded ${
                isProcessing
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-50"
              }`}
            >
              <span>@</span>
              <IoIosArrowDown className="w-3 h-3" />
            </button>

            {/* 드롭다운 메뉴 */}
            {showSourceDropdown && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 w-48 max-h-64 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto">
                  <div className="p-2 border-b">
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
                            className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded"
                          >
                            {thread.title}
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 px-2">
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
                            className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded"
                          >
                            {note.title}
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 px-2">
                          노트가 없습니다
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 선택된 소스들 */}
          {selectedSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded group hover:bg-blue-100"
            >
              <span>{source.title}</span>
              <button
                onClick={() => removeSource(source.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IoClose className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Send 버튼 */}
      <div className="p-4">
        <button
          onClick={handleSend}
          disabled={selectedSources.length === 0 || isProcessing}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedSources.length > 0 && !isProcessing
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          <span>Send</span>
          <FaArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
