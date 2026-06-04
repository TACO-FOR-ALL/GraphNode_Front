import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoGitNetworkOutline, IoCloudDownloadOutline } from "react-icons/io5";
import { api } from "@/apiClient";
import { unwrapAndMap } from "@/utils/httpResponse";
import { mapGraphSnapshot, mapGraphSummary } from "@/utils/dtoMappers";
import { useToastStore } from "@/store/useToastStore";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportGraphCard({ disabled }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [nodeEdgeRes, summaryRes] = await Promise.all([
        api.graph.getSnapshot(),
        api.graphAi.getSummary(),
      ]);

      const exportData = {
        nodeEdgeData: unwrapAndMap(nodeEdgeRes, mapGraphSnapshot),
        graphSummary: unwrapAndMap(summaryRes, mapGraphSummary),
        exportedAt: new Date().toISOString(),
      };

      downloadBlob(
        new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" }),
        `graph-export-${new Date().toISOString().slice(0, 10)}.json`,
      );

      addToast({
        message: t("settings.dataPrivacy.export.toast.graphSuccess"),
        type: "success",
      });
    } catch (err) {
      addToast({
        message: err instanceof Error ? err.message : t("settings.dataPrivacy.export.toast.graphError"),
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
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
          <IoGitNetworkOutline className="text-base" />
        </div>
        <IoCloudDownloadOutline
          className={`text-lg text-text-tertiary group-hover:text-text-secondary transition-colors ${isExporting ? "animate-pulse" : ""}`}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">
          {isExporting
            ? t("settings.dataPrivacy.export.exporting")
            : t("settings.dataPrivacy.export.graph")}
        </p>
        <p className="text-xs text-text-tertiary mt-0.5">
          {t("settings.dataPrivacy.export.graphHint")}
        </p>
      </div>
    </button>
  );
}
