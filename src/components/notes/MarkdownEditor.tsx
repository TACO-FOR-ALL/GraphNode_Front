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
import extractTitleFromMarkdown from "@/utils/extractTitleFromMarkdown";
import { useQueryClient } from "@tanstack/react-query";
import { IoMdRefresh } from "react-icons/io";

const lowlight = createLowlight(common);

export default ({ noteId }: { noteId: string | null }) => {
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false); // 에디터 초기화 중 자동 저장 방지
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<"saving" | "saved" | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      if (noteId) {
        try {
          isInitializingRef.current = true;
          const note = await noteRepo.getNoteById(noteId);
          if (note) {
            isInitializingRef.current = true;
            editor.commands.setContent(note.content, {
              contentType: "markdown",
            });
            setCurrentNoteId(note.id);
            // 에디터 안정화를 위한 지연
            setTimeout(() => {
              isInitializingRef.current = false;
            }, 300);
          }
        } catch (error) {
          console.error("Failed to load note:", error);
        } finally {
          isInitializingRef.current = false;
        }
      } else {
        setCurrentNoteId(null);
        editor.commands.setContent("", { contentType: "markdown" });
      }
    };

    loadNote();
  }, [editor, noteId]);

  // 에디터 내용 변경 시 자동 저장
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (isInitializingRef.current) return;
      setSaveStatus("saving");

      let markdown = "";
      try {
        markdown = editor.getMarkdown();
      } catch (error) {
        console.error("Failed to get markdown:", error);
        return;
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          let saved = false;

          // DB에 노트 저장
          // update note
          if (currentNoteId) {
            await noteRepo.updateNoteById(currentNoteId, markdown);
            queryClient.invalidateQueries({ queryKey: ["notes"] });
            saved = true;
          }
          // create new note
          else {
            if (markdown.trim().length > 0 && !isInitializingRef.current) {
              const newNote = await noteRepo.create(markdown);
              setCurrentNoteId(newNote.id);
              queryClient.invalidateQueries({ queryKey: ["notes"] });
              saved = true;
            }
          }

          // 저장 상태 UI 업데이트
          if (saved) {
            setSaveStatus("saved");
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
      }
    };
  }, [editor, currentNoteId]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="markdown-parser-demo bg-white border-solid border-[1px] border-note-editor-border shadow-[0_2px_4px_-2px_rgba(23,23,23,0.06)] relative">
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
      <div className="editor-container">
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div>Loading editor…</div>
        )}
      </div>
    </div>
  );
};
