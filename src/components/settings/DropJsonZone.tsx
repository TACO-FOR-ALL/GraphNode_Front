import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastStore } from "@/store/useToastStore";
import threadRepo from "../../managers/threadRepo";
import { parseConversations } from "../../utils/parseConversations";
import { toMarkdownFromUnknown } from "../../utils/toMarkdown";
import { ChatMessage } from "../../types/Chat";
import type { Status } from "../../types/FileUploadStatus";
import readJsonWithProgress from "@/utils/readJsonWithProgress";
import { readZipConversations } from "@/utils/readZipConversations";
import { api } from "@/apiClient";
import { unwrapResponse } from "@/utils/httpResponse";
import useDragDrop from "@/hooks/useDragDrop";
import {
  IoChatbubbles,
  IoCloudUpload,
  IoCheckmarkCircle,
  IoAlertCircle,
} from "react-icons/io5";

export default function DropJsonZone() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { addToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [zipFileCount, setZipFileCount] = useState<number | null>(null);
  const latestProgress = useRef(0);
  latestProgress.current = progress;

  const {
    mutate: importFile,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
  } = useMutation<void, Error, File>({
    mutationKey: ["import-conversations"],
    mutationFn: async (file) => {
      setProgress(0);
      setZipFileCount(null);

      const isZip = file.name.toLowerCase().endsWith(".zip");
      const isJson = file.name.toLowerCase().endsWith(".json");

      if (!isZip && !isJson) {
        throw new Error(t("settings.dropJsonZone.errorMessage.notJson"));
      }

      // ── ZIP 처리 ─────────────────────────────────────────────────
      if (isZip) {
        const entries = await readZipConversations(file, (p) => setProgress(p));

        if (entries.length === 0) {
          throw new Error(
            t("settings.dropJsonZone.errorMessage.noConversationJson"),
          );
        }

        setZipFileCount(entries.length);
        setIsParsing(true);
        await new Promise((r) => setTimeout(r, 50));

        // 모든 매칭 파일 파싱 → 스레드 합산
        const allThreads = entries.flatMap(({ text }) => {
          try {
            return parseConversations(JSON.parse(text)) ?? [];
          } catch {
            return [];
          }
        });

        const normalized = allThreads.map((th) => ({
          ...th,
          messages: th.messages.map((m: ChatMessage) => ({
            ...m,
            content:
              typeof m.content === "string"
                ? m.content
                : toMarkdownFromUnknown(m.content),
          })),
        }));

        if (normalized.length) {
          const ids = normalized.map((n) => n.id);
          await threadRepo.upsertMany(normalized);
          try {
            unwrapResponse(
              await api.conversations.bulkCreate({
                conversations: normalized.map((n) => ({
                  id: n.id,
                  title: n.title,
                  messages: n.messages.map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    createdAt: new Date(m.ts).toISOString(),
                  })),
                })),
              }),
            );
          } catch (e) {
            await threadRepo.deleteMany(ids);
            throw e;
          }
        }
        return;
      }

      // ── JSON 처리 (기존 로직) ────────────────────────────────────
      const text = await readJsonWithProgress(
        file as any,
        (p: number) => setProgress(p),
        t,
      );

      setIsParsing(true);
      await new Promise((r) => setTimeout(r, 50));
      const data = JSON.parse(text);

      const threads = parseConversations(data);
      if (!threads?.length) {
        console.warn("parsed threads = 0, JSON shape might differ");
      }

      const normalized = (threads || []).map((th) => ({
        ...th,
        messages: th.messages.map((m: ChatMessage) => ({
          ...m,
          content:
            typeof m.content === "string"
              ? m.content
              : toMarkdownFromUnknown(m.content),
        })),
      }));

      if (normalized.length) {
        const ids = normalized.map((n) => n.id);
        await threadRepo.upsertMany(normalized);
        try {
          unwrapResponse(
            await api.conversations.bulkCreate({
              conversations: normalized.map((n) => ({
                id: n.id,
                title: n.title,
                messages: n.messages.map((m) => ({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  createdAt: new Date(m.ts).toISOString(),
                })),
              })),
            }),
          );
        } catch (e) {
          await threadRepo.deleteMany(ids);
          throw e;
        }
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatThreads"] });
      addToast({
        message: t("settings.dropJsonZone.toast.success"),
        type: "success",
      });
    },

    onError: (err) => {
      console.warn("Import error:", err);
      setIsParsing(false);
      addToast({
        message: err.message || t("settings.dropJsonZone.toast.error"),
        type: "error",
      });
    },

    onSettled: () => {
      setIsParsing(false);
    },
  });

  const status: Status = isPending
    ? "reading"
    : isSuccess
      ? "done"
      : isError
        ? "error"
        : "idle";

  const handleFiles = (files: File[]) => {
    setProgress(0);
    reset();
    importFile(files[0]);
  };

  const { dragProps, isOver } = useDragDrop({ onFileDrop: handleFiles });

  return (
    <div
      {...dragProps}
      onClick={() => fileInputRef.current?.click()}
      className={`
        relative w-full rounded-xl border-2 border-dashed p-6
        transition-all duration-200 cursor-pointer flex-1
        ${
          isOver
            ? "border-primary bg-primary/5 dark:bg-primary/10"
            : "border-text-tertiary/50 bg-bg-secondary hover:border-text-tertiary hover:bg-bg-tertiary/50"
        }
        ${status === "done" ? "border-green-500 bg-green-50 dark:bg-green-900/20" : ""}
        ${status === "error" ? "border-red-500 bg-red-50 dark:bg-red-900/20" : ""}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.zip"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) handleFiles(files);
          e.target.value = "";
        }}
      />
      <div className="flex flex-col items-center gap-3">
        {/* Icon */}
        <div
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-colors duration-200
            ${
              status === "done"
                ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                : status === "error"
                  ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                  : isOver
                    ? "bg-primary/10 text-primary"
                    : "bg-bg-tertiary text-text-secondary"
            }
          `}
        >
          {status === "done" ? (
            <IoCheckmarkCircle className="text-2xl" />
          ) : status === "error" ? (
            <IoAlertCircle className="text-2xl" />
          ) : isOver ? (
            <IoCloudUpload className="text-2xl" />
          ) : (
            <IoChatbubbles className="text-2xl" />
          )}
        </div>

        {/* Title & Description */}
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary mb-1">
            {status === "done"
              ? t("settings.dropJsonZone.done")
              : status === "error"
                ? t("settings.dropJsonZone.error")
                : t("settings.dropJsonZone.description")}
          </p>
          <p className="text-xs text-text-secondary">
            {status === "idle" && t("settings.dropJsonZone.maxSize")}
            {status === "reading" && !isParsing && (
              <>
                {zipFileCount !== null
                  ? t("settings.dropJsonZone.uploadingZip", { progress })
                  : t("settings.dropJsonZone.uploading", { progress })}
              </>
            )}
            {isParsing && (
              <>
                {zipFileCount !== null
                  ? t("settings.dropJsonZone.parsingZip", { count: zipFileCount })
                  : t("settings.dropJsonZone.parsing")}
              </>
            )}
            {status === "error" && error?.message}
          </p>
        </div>

        {/* Progress Bar */}
        {(status === "reading" || isParsing) && (
          <div className="w-full max-w-[200px] h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-150 ease-out"
              style={{
                width: isParsing ? "100%" : `${progress}%`,
              }}
            />
          </div>
        )}

        {/* File Type Badges */}
        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-1 bg-bg-tertiary rounded-full text-[10px] font-medium text-text-secondary uppercase tracking-wide">
            JSON
          </span>
          <span className="px-2.5 py-1 bg-bg-tertiary rounded-full text-[10px] font-medium text-text-secondary uppercase tracking-wide">
            ZIP
          </span>
        </div>
      </div>
    </div>
  );
}
