import "./styles.scss";
import "katex/dist/katex.min.css";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";

import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Mathematics } from "@tiptap/extension-mathematics";
import { Mention } from "@tiptap/extension-mention";
import { TableKit } from "@tiptap/extension-table";
// import { Youtube } from "@tiptap/extension-youtube"; 유튜브 임베딩 지원
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import React, { useState, useEffect, useRef } from "react";
import { common, createLowlight } from "lowlight";
import { noteRepo } from "@/managers/noteRepo";
import { CustomReactNode } from "./CustomReactComponent";
import { useQueryClient } from "@tanstack/react-query";
import { IoMdRefresh } from "react-icons/io";
import { useAgentToolBoxStore } from "@/store/useAgentToolBoxStore";
import { useNoteGenerationStore } from "@/store/useNoteGenerationStore";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";

const lowlight = createLowlight(common);

export default ({ noteId }: { noteId: string | null }) => {
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false); // 에디터 초기화 중 자동 저장 방지
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setIsOpen, setResponse } = useAgentToolBoxStore();
  const { phase } = useNoteGenerationStore();

  const latestMarkdownRef = useRef<string>("");
  const isFlushingRef = useRef(false);
  const initTimerRef = useRef<number | null>(null);
  const lastEditedNoteIdRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);

  // Tiptap Editor 인스턴스 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight: lowlight }),
      Details,
      DetailsSummary,
      DetailsContent,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: "markdown-image",
        },
      }),
      TableKit,
      Highlight,
      Mention.configure({
        HTMLAttributes: {
          class: "mention",
        },
        suggestion: {
          items: ({ query }) => {
            return [
              "Lea Thompson",
              "Cyndi Lauper",
              "Tom Cruise",
              "Madonna",
              "Jerry Hall",
              "Joan Collins",
              "Winona Ryder",
              "Christina Applegate",
            ]
              .filter((item) =>
                item.toLowerCase().startsWith(query.toLowerCase())
              )
              .slice(0, 5);
          },
        },
      }),
      Mathematics,
      CustomReactNode,
      Markdown,
    ],
    content: "",
    contentType: "markdown",
  });

  // noteId가 변경되면 노트 로드 또는 초기화
  useEffect(() => {
    if (!editor) return;

    const loadNote = async () => {
      isDirtyRef.current = false;

      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
      }

      isInitializingRef.current = true;

      try {
        if (noteId) {
          const note = await noteRepo.getNoteById(noteId);

          if (note) {
            editor.commands.setContent(note.content, {
              contentType: "markdown",
            });
            latestMarkdownRef.current = note.content;
            lastEditedNoteIdRef.current = note.id;
            setCurrentNoteId(note.id);
          } else {
            editor.commands.setContent("", { contentType: "markdown" });
            latestMarkdownRef.current = "";
            lastEditedNoteIdRef.current = null;
            setCurrentNoteId(null);
          }
        } else {
          editor.commands.setContent("", { contentType: "markdown" });
          latestMarkdownRef.current = "";
          lastEditedNoteIdRef.current = null;
          setCurrentNoteId(null);
        }

        initTimerRef.current = window.setTimeout(() => {
          isInitializingRef.current = false;
          initTimerRef.current = null;
        }, 300);
      } catch (e) {
        console.error("Failed to load note:", e);
        isInitializingRef.current = false;
      }
    };

    loadNote();

    return () => {
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
      }
    };
  }, [editor, noteId]);

  const flushSave = async () => {
    if (!isDirtyRef.current) return;
    if (isFlushingRef.current) return;
    isFlushingRef.current = true;

    let success = false;

    try {
      const markdown = latestMarkdownRef.current;
      const targetId = lastEditedNoteIdRef.current;

      if (targetId) {
        await noteRepo.updateNoteById(targetId, markdown);
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        success = true;
        return;
      }

      if (markdown.trim().length > 0 && !isInitializingRef.current) {
        const newNote = await noteRepo.create(markdown);
        setCurrentNoteId(newNote.id);
        lastEditedNoteIdRef.current = newNote.id;
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        success = true;
      }
    } finally {
      isFlushingRef.current = false;
      if (success) isDirtyRef.current = false;
    }
  };

  // 에디터 내용 변경 시 자동 저장
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (isInitializingRef.current) return;
      isDirtyRef.current = true;
      setSaveStatus("saving");

      let markdown = "";
      try {
        markdown = editor.getMarkdown();
      } catch (error) {
        console.error("Failed to get markdown:", error);
        return;
      }

      // 최신 마크다운 컨텐츠 업데이트
      latestMarkdownRef.current = markdown;
      lastEditedNoteIdRef.current = currentNoteId;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          let saved = false;

          // ID가 있을 경우 노트 업데이트
          if (currentNoteId) {
            await noteRepo.updateNoteById(currentNoteId, markdown);
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            saved = true;
          }
          // ID가 없을 경우 노트 생성
          else {
            if (markdown.trim().length > 0 && !isInitializingRef.current) {
              const newNote = await noteRepo.create(markdown);
              setCurrentNoteId(newNote.id);
              lastEditedNoteIdRef.current = newNote.id;
              queryClient.invalidateQueries({ queryKey: ["notes"] });
              saved = true;
            }
          }

          // 저장 상태 UI 업데이트
          if (saved) {
            setSaveStatus("saved");
            isDirtyRef.current = false;
            if (savedTimeoutRef.current) {
              clearTimeout(savedTimeoutRef.current);
            }
            savedTimeoutRef.current = setTimeout(() => {
              setSaveStatus(null);
            }, 1500);
          } else {
            setSaveStatus(null);
          }
        } catch (error) {
          console.error("Failed to save note:", error);
          setSaveStatus(null);
        }
      }, 2000);
    };

    editor.on("update", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      void flushSave();
    };
  }, [editor, currentNoteId]);

  useEffect(() => {
    const onPageHide = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      void flushSave();
    };

    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [currentNoteId]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        void flushSave();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [currentNoteId]);

  const { isExpanded } = useSidebarExpandStore();

  return (
    <div
      className={`markdown-parser-demo ${isExpanded ? "ml-4" : "ml-[259px]"} flex justify-start bg-white border-solid border-[1px] border-note-editor-border shadow-[0_2px_4px_-2px_rgba(23,23,23,0.06)] relative`}
    >
      {/* 기존 저장 상태 UI (우측 상단) 그대로 */}
      {saveStatus && (
        <div className="absolute top-1 right-2 flex items-center gap-2 p-2 justify-center">
          {saveStatus === "saving" && (
            <IoMdRefresh className="text-[12px] text-text-secondary animate-spin" />
          )}
          <p className="text-[12px] font-normal font-noto-sans-kr text-text-secondary">
            {saveStatus === "saving" ? "Saving..." : "Saved"}
          </p>
        </div>
      )}
      <div className="editor-container pt-6">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div>Loading editor…</div>
        )}
      </div>
    </div>
  );
};
