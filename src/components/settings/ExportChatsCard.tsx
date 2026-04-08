import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoChatbubblesOutline, IoCloudDownloadOutline } from "react-icons/io5";
import { threadRepo } from "@/managers/threadRepo";
import { useToastStore } from "@/store/useToastStore";
import { isElectron } from "@/utils/platform";
import { api } from "@/apiClient";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function exportChatsWeb(threads: unknown[]) {
  const payload = { exportedAt: new Date().toISOString(), threads };
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    "conversations.json",
  );
}

export default function ExportChatsCard({ disabled }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let threads;

      if (isElectron()) {
        threads = await threadRepo.getThreadList();
        const result = await window.graphnodeAPI.exportSQLiteThreadsToDirectory(threads);
        if (result.canceled) {
          addToast({ message: t("settings.dataPrivacy.export.toast.cancelled"), type: "info" });
          return;
        }
      } else {
        // list()는 메시지 없는 요약만 반환 — 각 대화를 개별 조회해야 전체 메시지 포함
        // threadRepo를 거치지 않고 API 직접 호출 (toThread 매핑 에러 방지)
        const listResult = await api.conversations.list();
        if (!listResult.isSuccess) throw new Error("Failed to fetch conversations");
        const full = await Promise.all(
          listResult.data.map((s: { id: string }) =>
            api.conversations.get(s.id).then((r) => (r.isSuccess ? r.data : null))
          )
        );
        threads = full.filter(Boolean);
        exportChatsWeb(threads);
      }

      addToast({
        message: t("settings.dataPrivacy.export.toast.chatsSuccess", { count: threads.length }),
        type: "success",
      });
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : t("settings.dataPrivacy.export.toast.chatsError"),
        type: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || disabled}
      className="group flex flex-col gap-3 flex-1 p-4 bg-bg-secondary hover:bg-bg-tertiary border border-transparent hover:border-text-tertiary/20 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20 transition-colors">
          <IoChatbubblesOutline className="text-base" />
        </div>
        <IoCloudDownloadOutline
          className={`text-lg text-text-tertiary group-hover:text-text-secondary transition-colors ${isExporting ? "animate-pulse" : ""}`}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">
          {isExporting
            ? t("settings.dataPrivacy.export.exporting", "Exporting...")
            : t("settings.dataPrivacy.export.chats", "Export Chats")}
        </p>
        <p className="text-xs text-text-tertiary mt-0.5">
          {t("settings.dataPrivacy.export.chatsHint", "JSON files")}
        </p>
      </div>
    </button>
  );
}
