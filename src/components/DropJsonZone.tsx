import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import threadRepo from "../managers/threadRepo";
import { parseConversations } from "../utils/parseConversations";
import { toMarkdownFromUnknown } from "../utils/toMarkdown";
import { ChatMessage } from "../types/Chat";
import type { Status } from "../types/FileUploadStatus";
import readJsonWithProgress from "@/utils/readJsonWithProgress";
import { api } from "@/apiClient";
import { IoChatbubbles, IoCloudUpload, IoCheckmarkCircle, IoAlertCircle } from "react-icons/io5";

export default function DropJsonZone() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [isOver, setIsOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const latestProgress = useRef(0);
  latestProgress.current = progress;

  const {
    mutate: importJson,
    isPending,
    isSuccess,
    isError,
    error,
    reset,
  } = useMutation<void, Error, File>({
    // 리턴 값이 있다면 void 대신 리턴 값 타입 사용 + return data
    mutationKey: ["import-conversations"],
    mutationFn: async (file) => {
      // 1) 확장자 체크
      if (!file.name?.toLowerCase().endsWith(".json")) {
        throw new Error(t("settings.dropJsonZone.errorMessage.notJson"));
      }
      setProgress(0);

      // 2) 읽기
      const text = await readJsonWithProgress(
        file as any,
        (p: number) => setProgress(p),
        t,
      );

      // 3) 파싱(UX를 위해 미세 딜레이 유지)
      setIsParsing(true);
      await new Promise((r) => setTimeout(r, 50));
      const data = JSON.parse(text);

      // 4) 변환
      const threads = await parseConversations(data);
      if (!threads?.length) {
        // 비정상/빈 데이터 경고이지만 실패로 보진 않음
        console.warn("parsed threads = 0, JSON shape might differ");
      }

      // 5) content 강제 정규화
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

      // 6) 로컬 및 서버 저장 (TODO: 저장 실패 로직 추가 필요)
      if (normalized.length) {
        threadRepo.upsertMany(normalized);
        await api.conversations.bulkCreate({
          conversations: normalized.map((n) => ({
            id: n.id,
            title: n.title,
            messages: n.messages,
          })),
        });
      }
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatThreads"] });
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

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(true);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsOver(false);
      setProgress(0);
      reset();

      const files = Array.from(e.dataTransfer.files || []);
      if (!files.length) return;

      // 첫 파일만
      importJson(files[0]);
    },
    [importJson, reset],
  );

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
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
            {status === "reading" && !isParsing && t("settings.dropJsonZone.uploading", { progress })}
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
            JSON
          </span>
        </div>
      </div>
    </div>
  );
}
