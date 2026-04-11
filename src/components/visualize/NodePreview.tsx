import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { IoIosClose } from "react-icons/io";
import { MdOpenInFull } from "react-icons/md";
import { FiExternalLink, FiMessageCircle, FiFileText } from "react-icons/fi";
import { FiRefreshCw } from "react-icons/fi";
import MarkdownBubble from "../MarkdownBubble";
import { useThreadsStore } from "@/store/useThreadStore";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";
import logo from "@/assets/icons/logo.svg";
import { api } from "@/apiClient";
import { unwrapResponse } from "@/utils/httpResponse";
import { noteRepo } from "@/managers/noteRepo";
import type { Note } from "@/types/Note";

const PAGE = 10;

export default function NodePreview({
  nodeId,
  sourceType,
  onClose,
  onExpand,
}: {
  nodeId: string;
  sourceType?: "chat" | "markdown" | "notion";
  onClose: () => void;
  onExpand: () => void;
}) {
  console.log(sourceType);
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const userScrolledRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  const isNote = sourceType === "markdown";

  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [microDataStatus, setMicroDataStatus] = useState<
    "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  >("PENDING");

  // 노트 전용 상태
  const [note, setNote] = useState<Note | null>(null);

  // 드래그 관련 상태
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });

  const applyTransform = () => {
    const el = modalRef.current;
    if (!el) return;
    const { x, y } = positionRef.current;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };

  // 드래그 이벤트 핸들러
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      positionRef.current = {
        x: positionRef.current.x + deltaX,
        y: positionRef.current.y + deltaY,
      };

      dragStartPos.current = { x: e.clientX, y: e.clientY };
      applyTransform();
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (modalRef.current && !isExpanding) {
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      setIsDragging(true);
    }
  };

  const { threads, refreshThread } = useThreadsStore();
  const { isExpanded } = useSidebarExpandStore();
  const thread = threads[nodeId];

  const userMaxWidth = isExpanded ? "708px" : "880px";
  const assistantMaxWidth = isExpanded ? "696px" : "868px";

  // microscope 상태 조회 (채팅 노드 전용)
  useEffect(() => {
    if (isNote) return;
    (async () => {
      try {
        const workspace = unwrapResponse(
          await api.microscope.getLatestWorkspaceByNodeId(nodeId),
        );
        const firstDoc = workspace.documents?.[0];
        setMicroDataStatus(firstDoc?.status ?? "PENDING");
      } catch {
        setMicroDataStatus("PENDING");
      }
    })();
  }, [nodeId, isNote]);

  // 채팅 로드
  useEffect(() => {
    if (isNote || !nodeId) return;

    (async () => {
      setIsLoading(true);
      setVisibleCount(PAGE);
      userScrolledRef.current = false;
      isInitialLoadRef.current = true;
      positionRef.current = { x: 0, y: 0 };
      if (modalRef.current) {
        modalRef.current.style.transform = "translate(0px, 0px)";
      }

      try {
        await refreshThread(nodeId);
      } finally {
        setIsLoading(false);
      }

      requestAnimationFrame(() => {
        if (wrapRef.current && isInitialLoadRef.current) {
          wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
          isInitialLoadRef.current = false;
        }
      });
    })();
  }, [nodeId, isNote, refreshThread]);

  // 노트 로드
  useEffect(() => {
    if (!isNote || !nodeId) return;

    (async () => {
      setIsLoading(true);
      positionRef.current = { x: 0, y: 0 };
      if (modalRef.current) {
        modalRef.current.style.transform = "translate(0px, 0px)";
      }
      try {
        const fetched = await noteRepo.getNoteById(nodeId);
        setNote(fetched);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [nodeId, isNote]);

  const allMessages = thread?.messages ?? [];
  const isDeleted = !isNote && !isLoading && allMessages.length === 0;
  const total = allMessages.length;
  const startIndex = Math.max(0, total - visibleCount);
  const visible = allMessages.slice(startIndex);

  useEffect(() => {
    if (isNote) return;
    const el = wrapRef.current;
    if (!el) return;

    const handleScroll = () => {
      userScrolledRef.current = true;
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isNote]);

  useEffect(() => {
    if (isNote) return;
    const el = wrapRef.current;
    if (!el) return;

    if (userScrolledRef.current && !isInitialLoadRef.current) {
      return;
    }

    const distanceFromBottom =
      el.scrollHeight - (el.scrollTop + el.clientHeight);
    const nearBottom = distanceFromBottom < 120;

    if (nearBottom && isInitialLoadRef.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
        isInitialLoadRef.current = false;
      });
    }
  }, [total, isNote]);

  const loadingRef = useRef(false);

  useEffect(() => {
    if (isNote) return;
    const el = wrapRef.current;
    const sentinel = topSentinelRef.current;
    if (!el || !sentinel) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (loadingRef.current) return;

        const topVisible = entries.some((e) => e.isIntersecting);
        if (!topVisible) return;
        if (startIndex === 0) return;

        if (!userScrolledRef.current) return;
        if (el.scrollTop > 40) return;

        loadingRef.current = true;

        const prevHeight = el.scrollHeight;
        const add = Math.min(PAGE, startIndex);
        setVisibleCount((c) => c + add);

        requestAnimationFrame(() => {
          const newHeight = el.scrollHeight;
          el.scrollTop += newHeight - prevHeight;
          loadingRef.current = false;
        });
      },
      { root: el, threshold: 0.01 },
    );

    io.observe(sentinel);
    return () => io.disconnect();
  }, [startIndex, nodeId, isNote]);

  const handleExpand = () => {
    setIsExpanding(true);
    setTimeout(() => {
      onExpand();
      if (isNote) {
        navigate(`/note/${nodeId}`);
      } else {
        navigate(`/chat/${nodeId}`);
      }
    }, 400);
  };

  const handleViewDetail = () => {
    if (isNote) {
      navigate(`/note/${nodeId}`);
    } else {
      navigate(`/microscope/${nodeId}`, {
        state: { nodeTitle: thread?.title ?? undefined },
      });
    }
    onClose();
  };

  const handleAnalyze = async () => {
    if (microDataStatus === "PROCESSING") return;
    setMicroDataStatus("PROCESSING");
    try {
      await api.microscope.ingestFromConversation(nodeId);
    } catch (e) {
      console.error(e);
      setMicroDataStatus("FAILED");
    }
  };

  return (
    <div
      ref={modalRef}
      className={`absolute z-[100] bg-bg-primary dark:bg-bg-primary rounded-xl shadow-lg border border-base-border flex flex-col overflow-hidden transition-all duration-300 ease-out ${
        isExpanding
          ? "w-screen h-screen top-0 left-0 rounded-none p-0"
          : "top-6 left-8 w-[420px] h-[520px]"
      }`}
      style={{
        boxShadow:
          "0 4px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      {/* 헤더 - 드래그 가능 */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b border-base-border bg-bg-secondary/50 ${
          isExpanding ? "hidden" : "cursor-move"
        }`}
        onMouseDown={handleHeaderMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            {isNote ? (
              <FiFileText size={16} className="text-primary" />
            ) : (
              <FiMessageCircle size={16} className="text-primary" />
            )}
          </div>
          <span className="text-[13px] font-semibold text-text-primary">
            {isNote
              ? t("visualize.nodePreview.noteTitle")
              : t("visualize.nodePreview.chatTitle")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleViewDetail}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors group"
            title={t("visualize.nodePreview.viewDetail")}
          >
            <FiExternalLink
              size={16}
              className="text-text-secondary group-hover:text-primary transition-colors"
            />
          </button>
          <button
            onClick={handleExpand}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors group"
          >
            <MdOpenInFull
              size={16}
              className="text-text-secondary group-hover:text-primary transition-colors"
            />
          </button>
          <button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors group"
          >
            <IoIosClose
              size={20}
              className="text-text-secondary group-hover:text-primary transition-colors"
            />
          </button>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div
        className={`flex-1 min-h-0 flex flex-col transition-all duration-300 ease-out ${
          isExpanding ? "pt-16" : ""
        }`}
        style={
          isExpanding
            ? {
                width: isExpanded ? "744px" : "916px",
                margin: "0 auto",
                transition: "width 0.5s ease",
              }
            : {}
        }
      >
        <div
          ref={wrapRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "var(--color-text-tertiary) transparent",
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : isNote ? (
            note ? (
              <div className="text-text-primary text-[13px]">
                {note.title && (
                  <h2 className="text-[15px] font-semibold mb-3 text-text-primary">
                    {note.title}
                  </h2>
                )}
                <MarkdownBubble text={note.content} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-text-tertiary text-[13px]">
                  {t("visualize.nodePreview.noteNotFound")}
                </p>
              </div>
            )
          ) : isDeleted ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-text-tertiary text-[13px]">
                {t("visualize.nodePreview.deletedConversation")}
              </p>
            </div>
          ) : (
            <>
              <div ref={topSentinelRef} />
              {visible.map((m) => {
                const isUser = m.role === "user";

                return (
                  <div
                    key={m.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"} items-start mb-4`}
                    title={new Date(m.ts).toLocaleString()}
                  >
                    {isUser ? (
                      <div
                        className={`flex items-start gap-2 ${isExpanding ? "ml-20" : "ml-8"} min-w-0`}
                        style={{ maxWidth: isExpanding ? userMaxWidth : "85%" }}
                      >
                        <div
                          className={`text-text-primary bg-bg-secondary rounded-2xl rounded-tr-sm px-3 py-2 ${
                            isExpanding ? "text-sm" : "text-[13px]"
                          } break-words min-w-0`}
                          style={{
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            overflowX: "hidden",
                          }}
                        >
                          {m.content}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex items-start gap-2 min-w-0 overflow-hidden"
                        style={{
                          maxWidth: isExpanding ? assistantMaxWidth : "85%",
                        }}
                      >
                        <img
                          src={logo}
                          alt="Assistant"
                          className="flex-shrink-0 w-6 h-6"
                        />
                        <div
                          className={`bg-bg-tertiary/50 dark:bg-bg-tertiary/30 border border-base-border rounded-2xl rounded-tl-sm px-3 py-2 min-w-0 overflow-hidden ${
                            isExpanding ? "text-sm" : "text-[13px]"
                          }`}
                        >
                          <div className="text-text-primary min-w-0 overflow-hidden">
                            <MarkdownBubble text={m.content} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div aria-hidden="true" className="h-2" />
            </>
          )}
        </div>
      </div>

      {/* 하단 액션 바 */}
      {!isExpanding && (
        <div className="px-4 py-3 border-t border-base-border bg-bg-secondary/30">
          {isNote ? (
            <button
              onClick={handleViewDetail}
              className="w-full py-2.5 px-4 bg-primary text-white rounded-lg font-medium text-[13px] hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <FiExternalLink size={14} />
              {t("visualize.nodePreview.openNote")}
            </button>
          ) : (
            <button
              onClick={
                microDataStatus === "COMPLETED"
                  ? handleViewDetail
                  : handleAnalyze
              }
              disabled={microDataStatus === "PROCESSING"}
              className="w-full py-2.5 px-4 bg-primary text-white rounded-lg font-medium text-[13px] hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {microDataStatus === "PROCESSING" ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : microDataStatus === "COMPLETED" ? (
                <FiExternalLink size={14} />
              ) : (
                <FiRefreshCw size={14} />
              )}
              {microDataStatus === "PROCESSING"
                ? t("visualize.nodePreview.analyzing")
                : microDataStatus === "COMPLETED"
                  ? t("visualize.nodePreview.viewAnalysis")
                  : t("visualize.nodePreview.analyzeWithMicroscope")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
