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
        console.warn("🟡 parsed threads = 0, JSON shape might differ");
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
    <div className="max-w-[780px] mx-auto mt-10 mb-10 font-sans">
      <h2 className="text-2xl font-semibold mb-6">
        {t("settings.dropJsonZone.title")}
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
