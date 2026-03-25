import { useTranslation } from "react-i18next";
import { TbRefresh } from "react-icons/tb";
import { useEmbeddingModelStore } from "@/store/useEmbeddingModelStore";

export default function ModelUpdateBanner() {
  const { t } = useTranslation();
  const { isDownloading, downloadProgress, downloadFile } =
    useEmbeddingModelStore();

  if (!isDownloading) return null;

  const fileName = downloadFile.split("/").pop() ?? downloadFile;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary border-t border-base-border px-4 py-2.5 flex items-center gap-3 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
      {/* 아이콘 + 제목 */}
      <TbRefresh className="w-4 h-4 text-primary shrink-0 animate-spin" />
      <span className="text-[13px] font-medium text-text-primary whitespace-nowrap">
        {t("modelUpdate.title")}
      </span>

      {/* 파일명 */}
      {fileName && (
        <span className="text-[12px] text-text-tertiary truncate flex-1 min-w-0">
          {fileName}
        </span>
      )}

      {/* 프로그레스 바 + 퍼센트 */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-28 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
        <span className="text-[12px] text-text-secondary w-8 text-right tabular-nums">
          {downloadProgress}%
        </span>
      </div>
    </div>
  );
}
