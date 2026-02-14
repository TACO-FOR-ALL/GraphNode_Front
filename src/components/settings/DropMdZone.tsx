import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Status } from "../../types/FileUploadStatus";
import { readMdContent } from "@/utils/readMdContent";
import { Note } from "@/types/Note";
import uuid from "@/utils/uuid";
import { noteRepo } from "@/managers/noteRepo";
import useDragDrop from "@/hooks/useDragDrop";
import {
  IoDocumentText,
  IoCloudUpload,
  IoCheckmarkCircle,
  IoAlertCircle,
} from "react-icons/io5";

export default function DropMdZone() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [progress, setProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);

  const {
    mutate: importMds,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
  } = useMutation<void, Error, File[]>({
    mutationKey: ["import-markdowns"],
    mutationFn: async (files) => {
      const results = [];

      for (const file of files) {
        try {
          const textContent = await readMdContent(file);
          results.push({
            id: uuid(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            content: textContent,
            folderId: null,
            createdAt: file.lastModified,
            updatedAt: file.lastModified,
          } as Note);
        } catch (e) {
          // TODO: 오류처리
          console.error(`Failed to read file ${file.name}`, e);
        }
      }

      // 로컬 및 서버 저장 (TODO: 저장 실패 로직 추가 필요)
      noteRepo.upsertMany(results);
      // await api.note
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
    },

    onError: (err) => {
      console.warn("Import error:", err);
      setIsParsing(false);
    },

    onSettled: () => {
      setIsParsing(false);
    },
  });

  // 상태 라벨(기존 status 대체)
  const status: Status = isPending
    ? "reading"
    : isSuccess
      ? "done"
      : isError
        ? "error"
        : "idle";

  const { dragProps, isOver } = useDragDrop({
    onFileDrop: (rawFiles) => {
      setProgress(0);
      reset();

      const validFiles = rawFiles.filter((file) =>
        file.name.toLowerCase().endsWith(".md"),
      );

      if (validFiles.length === 0) {
        alert(t("settings.dropMdZone.errorMessage.notMd"));
        return;
      }

      if (validFiles.length < rawFiles.length) {
        alert(t("settings.dropMdZone.errorMessage.exceptOther"));
      }

      importMds(validFiles);
    },
  });

  return (
    <div
      {...dragProps}
      className={`
        relative w-full rounded-xl border-2 border-dashed p-6
        transition-all duration-200 cursor-pointer
        ${
          isOver
            ? "border-primary bg-primary/5 dark:bg-primary/10"
            : "border-text-tertiary/50 bg-bg-secondary hover:border-text-tertiary hover:bg-bg-tertiary/50"
        }
        ${status === "done" ? "border-green-500 bg-green-50 dark:bg-green-900/20" : ""}
        ${status === "error" ? "border-red-500 bg-red-50 dark:bg-red-900/20" : ""}
      `}
    >
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
            <IoDocumentText className="text-2xl" />
          )}
        </div>

        {/* Title & Description */}
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary mb-1">
            {status === "done"
              ? t("settings.dropJsonZone.done")
              : status === "error"
                ? t("settings.dropJsonZone.error")
                : t(
                    "settings.dropMdZone.description",
                    "Drop your markdown files here",
                  )}
          </p>
          <p className="text-xs text-text-secondary">
            {status === "idle" &&
              t("settings.dropMdZone.maxSize", "Multiple files supported")}
            {status === "reading" &&
              !isParsing &&
              t("settings.dropJsonZone.uploading", { progress })}
            {isParsing && t("settings.dropJsonZone.parsing")}
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

        {/* File Type Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-bg-tertiary rounded-full">
          <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wide">
            Markdown
          </span>
        </div>
      </div>
    </div>
  );
}
