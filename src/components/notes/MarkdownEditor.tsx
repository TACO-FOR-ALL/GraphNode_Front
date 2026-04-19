import "./styles.scss";
import "katex/dist/katex.min.css";

import { useCurrentHightlightStore } from "@/store/useCurrentHighlight";

import {
  Details,
  DetailsContent,
  DetailsSummary,
} from "@tiptap/extension-details";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { MarkdownLink } from "./MarkdownLink";
import { NoteCodeBlock } from "./NoteCodeBlock";
import { TaskList } from "@tiptap/extension-list";
import { NoteTaskItem } from "./NoteTaskItem";
import { Mathematics } from "@tiptap/extension-mathematics";
import { Mention } from "@tiptap/extension-mention";
import { TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
// import { Youtube } from "@tiptap/extension-youtube"; 유튜브 임베딩 지원
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState, useEffect, useRef } from "react";
import { common, createLowlight } from "lowlight";
import { noteRepo } from "@/managers/noteRepo";
import { CustomReactNode } from "./CustomReactComponent";
import { useQueryClient } from "@tanstack/react-query";
import { IoMdRefresh } from "react-icons/io";
import { useImageCompression } from "@/hooks/useImageCompression";
import useDragDrop from "@/hooks/useDragDrop";
import { useToastStore } from "@/store/useToastStore";
import { useTranslation } from "react-i18next";
import normalizeMathMarkdown from "@/utils/normalizeMathMarkdown";
import normalizeTableMarkdown from "@/utils/normalizeTableMarkdown";
import { NoteTable } from "./NoteTable";

const lowlight = createLowlight(common);

export default ({ noteId }: { noteId: string | null }) => {
  const { t } = useTranslation();
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false); // 에디터 초기화 중 자동 저장 방지
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const latestMarkdownRef = useRef<string>("");
  const isFlushingRef = useRef(false);
  const initTimerRef = useRef<number | null>(null);
  const lastEditedNoteIdRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);
  const tableReparseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { currentHighlight } = useCurrentHightlightStore();
  const { compressImage, isCompressing } = useImageCompression();
  const { addToast } = useToastStore();

  // 하이라이트 테마 CSS 로드
  useEffect(() => {
    const oldStyle = document.getElementById("hljs-editor-style");
    if (oldStyle) oldStyle.remove();

    const oldOverride = document.getElementById("hljs-override-style");
    if (oldOverride) oldOverride.remove();

    // Vite base path 고려
    const basePath = import.meta.env.BASE_URL || "/";
    let cssPath = `${basePath}hljs-styles/${currentHighlight}.css`;
    if (currentHighlight.startsWith("base16-")) {
      const themeName = currentHighlight.replace("base16-", "");
      cssPath = `${basePath}hljs-styles/base16/${themeName}.css`;
    }

    fetch(cssPath)
      .then((res) => {
        if (!res.ok) throw new Error("CSS not found");
        return res.text();
      })
      .then((css) => {
        const style = document.createElement("style");
        style.id = "hljs-editor-style";
        style.textContent = css;
        document.head.appendChild(style);

        // 테마 로드 후 기본 텍스트 색상 오버라이드
        const overrideStyle = document.createElement("style");
        overrideStyle.id = "hljs-override-style";
        overrideStyle.textContent = `
          .hljs { color: var(--color-codeblock-text) !important; }
        `;
        document.head.appendChild(overrideStyle);
      })
      .catch((err) => console.warn("Failed to load highlight theme:", err));

    return () => {
      const style = document.getElementById("hljs-editor-style");
      if (style) style.remove();
      const override = document.getElementById("hljs-override-style");
      if (override) override.remove();
    };
  }, [currentHighlight]);

  // Tiptap Editor 인스턴스 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: false,
      }),
      NoteCodeBlock.configure({
        lowlight: lowlight,
        HTMLAttributes: {
          class: "hljs",
        },
      }),
      MarkdownLink.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
      Details,
      DetailsSummary,
      DetailsContent,
      TaskList,
      NoteTaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: "markdown-image",
        },
      }),
      NoteTable,
      TableRow,
      TableHeader,
      TableCell,
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
                item.toLowerCase().startsWith(query.toLowerCase()),
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
        // 다른 노트로 이동 시 대기 중인 테이블 재파싱 취소
        if (tableReparseTimeoutRef.current) {
          clearTimeout(tableReparseTimeoutRef.current);
          tableReparseTimeoutRef.current = null;
        }

        if (noteId) {
          const note = await noteRepo.getNoteById(noteId);

          if (note) {
            const normalizedContent = normalizeTableMarkdown(
              normalizeMathMarkdown(note.content),
            );
            editor.commands.setContent(normalizedContent, {
              contentType: "markdown",
            });
            latestMarkdownRef.current = normalizedContent;
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
        markdown = normalizeTableMarkdown(editor.getMarkdown());
      } catch (error) {
        console.error("Failed to get markdown:", error);
        return;
      }

      // 최신 마크다운 컨텐츠 업데이트
      latestMarkdownRef.current = markdown;
      lastEditedNoteIdRef.current = currentNoteId;

      // 변환되지 않은 마크다운 테이블(단락으로 저장된 파이프 행) 감지
      let hasPotentialTable = false;
      editor.state.doc.forEach((node) => {
        if (node.type.name === "paragraph" && /^\|.+\|/.test(node.textContent)) {
          hasPotentialTable = true;
        }
      });

      if (hasPotentialTable) {
        if (tableReparseTimeoutRef.current) {
          clearTimeout(tableReparseTimeoutRef.current);
        }
        tableReparseTimeoutRef.current = setTimeout(() => {
          tableReparseTimeoutRef.current = null;
          if (isInitializingRef.current) return;

          let currentMarkdown = "";
          try {
            currentMarkdown = editor.getMarkdown();
          } catch {
            return;
          }

          const normalized = normalizeTableMarkdown(currentMarkdown);
          if (normalized === currentMarkdown) return;

          const selectionFrom = editor.state.selection.from;

          isInitializingRef.current = true;
          editor.commands.setContent(normalized, { contentType: "markdown" });
          latestMarkdownRef.current = normalized;

          const docSize = editor.state.doc.content.size;
          try {
            editor.commands.setTextSelection(Math.min(selectionFrom, docSize));
          } catch {
            // ignore
          }

          setTimeout(() => {
            isInitializingRef.current = false;
          }, 100);
        }, 300);
      } else if (tableReparseTimeoutRef.current) {
        clearTimeout(tableReparseTimeoutRef.current);
        tableReparseTimeoutRef.current = null;
      }

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
      // 테이블 재파싱 타임아웃은 여기서 취소하지 않음.
      // currentNoteId가 null→newId로 바뀌면(새 노트 저장) 이 cleanup이 실행되는데,
      // 그 시점에 취소하면 400ms 재파싱이 소멸돼 테이블 변환이 안 됨.
      // 대신 loadNote(noteId 변경 시)에서 취소한다.

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

  // 이미지 드롭 핸들러
  const handleImageDrop = async (files: File[]) => {
    if (!editor) return;

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      addToast({
        message: t("notes.image.onlyImageFiles"),
        type: "error",
      });
      return;
    }

    try {
      for (const file of imageFiles) {
        const base64 = await compressImage(file);
        editor.commands.setImage({ src: base64 });
      }

      addToast({
        message: t("notes.image.added", { count: imageFiles.length }),
        type: "success",
      });
    } catch (error) {
      console.error("Failed to compress image:", error);
      addToast({
        message: t("notes.image.compressionFailed"),
        type: "error",
      });
    }
  };

  // 드래그 앤 드롭 훅 사용
  const { dragProps, isOver } = useDragDrop({
    onFileDrop: handleImageDrop,
  });

  // 클립보드 붙여넣기 이벤트
  useEffect(() => {
    if (!editor || !editor.view) return;

    // editor.view.dom 접근을 try-catch로 안전하게 처리
    let editorElement: HTMLElement;
    try {
      editorElement = editor.view.dom;
      if (!editorElement) return;
    } catch {
      // view가 아직 마운트되지 않은 경우 - 무시
      return;
    }

    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith("image/"),
      );

      if (imageItems.length === 0) return;

      event.preventDefault();

      try {
        for (const item of imageItems) {
          const file = item.getAsFile();
          if (!file) continue;

          const base64 = await compressImage(file);
          editor.commands.setImage({ src: base64 });
        }

        addToast({
          message: t("notes.image.added", { count: imageItems.length }),
          type: "success",
        });
      } catch (error) {
        console.error("Failed to compress pasted image:", error);
        addToast({
          message: t("notes.image.pasteFailed"),
          type: "error",
        });
      }
    };

    editorElement.addEventListener("paste", handlePaste);

    return () => {
      // cleanup 시에도 안전하게 체크
      try {
        if (editor.view?.dom) {
          editor.view.dom.removeEventListener("paste", handlePaste);
        }
      } catch (error) {
        // Cleanup 중 에러 무시
        console.warn("Failed to remove paste listener:", error);
      }
    };
  }, [editor, compressImage, addToast, t]);

  return (
    <div
      data-testid="note-editor"
      className={`markdown-parser-demo mx-auto flex justify-start bg-bg-secondary border-solid border-[1px] border-note-editor-border shadow-[0_2px_4px_-2px_rgba(23,23,23,0.06)] relative ${isOver ? "ring-2 ring-primary ring-opacity-50" : ""}`}
      {...dragProps}
    >
      {/* 저장 상태 UI */}
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

      {/* 드래그 오버레이 */}
      {isOver && (
        <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-bg-primary rounded-lg px-4 py-2 shadow-lg">
            <p className="text-primary font-medium">
              {t("notes.image.dropHere")}
            </p>
          </div>
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
