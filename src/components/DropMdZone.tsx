import { useTranslation } from "react-i18next";
import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Status } from "../types/FileUploadStatus";
import { readMdContent } from "@/utils/readMdContent";
import { contentTracing } from "electron";
import { Note } from "@/types/Note";
import uuid from "@/utils/uuid";
import { noteRepo } from "@/managers/noteRepo";
import { api } from "@/apiClient";

export default function DropMdZone() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [isOver, setIsOver] = useState(false);
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
          const date = new Date(file.lastModified);
          results.push({
            id: uuid(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            content: textContent,
            folderId: null,
            createdAt: date,
            updatedAt: date,
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

      const rawFiles = Array.from(e.dataTransfer.files || []);
      if (!rawFiles.length) return;

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
    [importMds, reset],
  );

  return (
    <div className="max-w-[780px] mx-auto mt-10 mb-10 font-sans">
      <h2 className="text-2xl font-semibold mb-6">
        {t("settings.dropMdZone.title")}
      </h2>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          border-2 border-dashed border-gray-400 rounded-2xl p-9 text-center
          transition-colors duration-150 select-none
          ${isOver ? "bg-blue-50" : "bg-gray-50"}
        `}
      >
        <p className="m-0">{t("settings.dropJsonZone.description")}</p>
        <small className="text-gray-500 text-sm">
          {t("settings.dropJsonZone.maxSize")}
        </small>

        {/* 진행률 & 상태 */}
        {status !== "idle" && (
          <div className="mt-4">
            <div className="text-xs text-gray-600 mb-1.5">
              {status === "reading" && !isParsing && (
                <>{t("settings.dropJsonZone.uploading", { progress })}</>
              )}
              {isParsing && <>{t("settings.dropJsonZone.parsing")}</>}
              {status === "done" && !isParsing && (
                <>{t("settings.dropJsonZone.done")}</>
              )}
              {status === "error" && <>{t("settings.dropJsonZone.error")}</>}
            </div>

            {/* 진행률 바 */}
            {(status === "reading" || isParsing) && (
              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-150 ease-out"
                  style={{
                    width: isParsing
                      ? "100%" // 파싱 중이면 꽉 찬 상태로 유지
                      : `${progress}%`, // 파일 읽는 중이면 실제 진행률
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {isError && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600">
          {error?.message}
        </div>
      )}
    </div>
  );
}
