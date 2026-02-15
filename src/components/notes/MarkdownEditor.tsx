import "./styles.scss";
import "katex/dist/katex.min.css";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { useCurrentHightlightStore } from "@/store/useCurrentHighlight";

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
import { useState, useEffect, useRef } from "react";
import { common, createLowlight } from "lowlight";
import { noteRepo } from "@/managers/noteRepo";
import { CustomReactNode } from "./CustomReactComponent";
import { useQueryClient } from "@tanstack/react-query";
import { IoMdRefresh } from "react-icons/io";
import { useSidebarExpandStore } from "@/store/useSidebarExpandStore";
import { useImageCompression } from "@/hooks/useImageCompression";
import useDragDrop from "@/hooks/useDragDrop";
import { useToastStore } from "@/store/useToastStore";
import { useTranslation } from "react-i18next";

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
      }),
      CodeBlockLowlight.configure({
        lowlight: lowlight,
        HTMLAttributes: {
          class: "hljs",
        },
      }),
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
    } catch (error) {
      // view가 아직 마운트되지 않은 경우
      console.warn("Editor view not yet mounted:", error);
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
      className={`markdown-parser-demo ${isExpanded ? "ml-4" : "ml-[259px]"} flex justify-start bg-bg-primary border-solid border-[1px] border-note-editor-border shadow-[0_2px_4px_-2px_rgba(23,23,23,0.06)] relative ${isOver ? "ring-2 ring-primary ring-opacity-50" : ""}`}
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
            <p className="text-primary font-medium">{t("notes.image.dropHere")}</p>
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
