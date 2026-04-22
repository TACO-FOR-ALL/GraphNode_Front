import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  noteLinkStore,
  extractHeadings,
  type NoteLinkItem,
  type SuggestionState,
} from "./noteLinkStore";
import { noteRepo } from "@/managers/noteRepo";

export function NoteLinkSuggestionPortal() {
  const [state, setState] = useState<SuggestionState>(() =>
    noteLinkStore.get(),
  );
  const stateRef = useRef<SuggestionState>(state);

  const [leftIndex, setLeftIndex] = useState(0);
  const leftIndexRef = useRef(0);

  const [headings, setHeadings] = useState<string[]>([]);
  const headingsRef = useRef<string[]>([]);

  const [rightIndex, setRightIndex] = useState(0);
  const rightIndexRef = useRef(0);

  const [activePanel, setActivePanel] = useState<"notes" | "headings">("notes");
  const activePanelRef = useRef<"notes" | "headings">("notes");

  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // store 구독
  useEffect(() => {
    return noteLinkStore.subscribe((next) => {
      stateRef.current = next;
      setState(next);
    });
  }, []);

  // items가 바뀌면 (새 세션) 선택 상태 초기화
  useEffect(() => {
    leftIndexRef.current = 0;
    setLeftIndex(0);
    rightIndexRef.current = 0;
    setRightIndex(0);
    activePanelRef.current = "notes";
    setActivePanel("notes");
  }, [state.items]);

  // 포커스된 노트가 바뀌면 해당 노트의 헤딩 목록 로드
  useEffect(() => {
    const note = state.items[leftIndex];
    if (!note) {
      headingsRef.current = [];
      setHeadings([]);
      return;
    }

    let cancelled = false;
    noteRepo.getNoteById(note.noteId).then((n) => {
      if (cancelled) return;
      const h = n ? extractHeadings(n.content) : [];
      headingsRef.current = h;
      setHeadings(h);
      rightIndexRef.current = 0;
      setRightIndex(0);
    });
    return () => {
      cancelled = true;
    };
  }, [leftIndex, state.items]);

  // 키보드 핸들러 등록 (refs로 stale closure 방지)
  useEffect(() => {
    const handler = (event: KeyboardEvent): boolean => {
      const { isActive, items, onSelect } = stateRef.current;
      if (!isActive || items.length === 0) return false;

      if (activePanelRef.current === "notes") {
        if (event.key === "ArrowUp") {
          const next =
            leftIndexRef.current > 0
              ? leftIndexRef.current - 1
              : items.length - 1;
          leftIndexRef.current = next;
          setLeftIndex(next);
          return true;
        }
        if (event.key === "ArrowDown") {
          const next =
            leftIndexRef.current < items.length - 1
              ? leftIndexRef.current + 1
              : 0;
          leftIndexRef.current = next;
          setLeftIndex(next);
          return true;
        }
        if (event.key === "ArrowRight" && headingsRef.current.length > 0) {
          activePanelRef.current = "headings";
          setActivePanel("headings");
          return true;
        }
        if (event.key === "Enter") {
          const item = items[leftIndexRef.current];
          if (item) onSelect?.(item);
          return true;
        }
      } else {
        if (event.key === "ArrowUp") {
          const next =
            rightIndexRef.current > 0
              ? rightIndexRef.current - 1
              : headingsRef.current.length - 1;
          rightIndexRef.current = next;
          setRightIndex(next);
          return true;
        }
        if (event.key === "ArrowDown") {
          const next =
            rightIndexRef.current < headingsRef.current.length - 1
              ? rightIndexRef.current + 1
              : 0;
          rightIndexRef.current = next;
          setRightIndex(next);
          return true;
        }
        if (event.key === "ArrowLeft") {
          activePanelRef.current = "notes";
          setActivePanel("notes");
          return true;
        }
        if (event.key === "Enter") {
          const note = items[leftIndexRef.current];
          const heading = headingsRef.current[rightIndexRef.current];
          if (note && heading) {
            onSelect?.({
              type: "heading",
              noteId: note.noteId,
              noteTitle: note.noteTitle,
              headingText: heading,
            });
          }
          return true;
        }
      }
      return false;
    };

    noteLinkStore.setKeyDownHandler(handler);
    return () => noteLinkStore.setKeyDownHandler(null);
  }, []);

  // 키보드 이동 시 선택된 아이템 스크롤
  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    const items = panel.querySelectorAll<HTMLElement>(".note-link-dropdown-item");
    items[leftIndex]?.scrollIntoView({ block: "nearest" });
  }, [leftIndex]);

  useEffect(() => {
    const panel = rightPanelRef.current;
    if (!panel) return;
    const items = panel.querySelectorAll<HTMLElement>(".note-link-dropdown-item");
    items[rightIndex]?.scrollIntoView({ block: "nearest" });
  }, [rightIndex]);

  // 드롭다운 위치 조정
  useEffect(() => {
    if (!containerRef.current || !state.clientRect) return;
    const rect = state.clientRect();
    if (!rect) return;

    const el = containerRef.current;
    const totalWidth = headings.length > 0 ? 460 : 240;
    const maxHeight = 290;

    let left = rect.left;
    let top = rect.bottom + 4;

    if (left + totalWidth > window.innerWidth) {
      left = Math.max(0, window.innerWidth - totalWidth - 8);
    }
    if (top + maxHeight > window.innerHeight) {
      top = Math.max(0, rect.top - maxHeight - 4);
    }

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  });

  if (!state.isActive || state.items.length === 0) return null;

  const focusedNote = state.items[leftIndex] as
    | (NoteLinkItem & { type: "note" })
    | undefined;

  return createPortal(
    <div
      ref={containerRef}
      className="note-link-dropdown"
      style={{ position: "fixed", zIndex: 9999, display: "flex" }}
    >
      {/* 왼쪽 패널: 노트 목록 */}
      <div className="note-link-panel" ref={leftPanelRef}>
        {state.items.map((item, i) => (
          <button
            key={`${item.noteId}-${i}`}
            className={[
              "note-link-dropdown-item",
              i === leftIndex && activePanel === "notes" ? "selected" : "",
              i === leftIndex && activePanel === "headings" ? "focused" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => state.onSelect?.(item)}
            onMouseEnter={() => {
              leftIndexRef.current = i;
              setLeftIndex(i);
              activePanelRef.current = "notes";
              setActivePanel("notes");
            }}
            type="button"
          >
            <span className="note-link-dropdown-icon">N</span>
            <span className="note-link-dropdown-text">
              {item.type === "note" ? item.noteTitle || "(Untitled)" : ""}
            </span>
            {i === leftIndex && headings.length > 0 && (
              <span className="note-link-panel-arrow">›</span>
            )}
          </button>
        ))}
      </div>

      {/* 오른쪽 패널: 포커스된 노트의 헤딩 목록 */}
      {focusedNote && headings.length > 0 && (
        <div className="note-link-panel note-link-panel-right" ref={rightPanelRef}>
          <div className="note-link-panel-header">{focusedNote.noteTitle}</div>
          {headings.map((heading, i) => (
            <button
              key={`heading-${i}`}
              className={[
                "note-link-dropdown-item",
                i === rightIndex && activePanel === "headings" ? "selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                state.onSelect?.({
                  type: "heading",
                  noteId: focusedNote.noteId,
                  noteTitle: focusedNote.noteTitle,
                  headingText: heading,
                })
              }
              onMouseEnter={() => {
                rightIndexRef.current = i;
                setRightIndex(i);
                activePanelRef.current = "headings";
                setActivePanel("headings");
              }}
              type="button"
            >
              <span className="note-link-dropdown-icon">#</span>
              <span className="note-link-dropdown-text">{heading}</span>
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
