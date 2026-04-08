import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IoBookOutline, IoCloudDownloadOutline } from "react-icons/io5";
import { noteRepo } from "@/managers/noteRepo";
import { useToastStore } from "@/store/useToastStore";
import { isElectron } from "@/utils/platform";

function slugifyFileName(input: string, fallback: string) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return normalized || fallback;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportNotesWeb(notes: Array<{ id: string; title: string; content: string }>) {
  if ("showDirectoryPicker" in window) {
    const dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
    for (const note of notes) {
      const fileName = `${slugifyFileName(note.title, note.id)}-${note.id.slice(0, 8)}.md`;
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(note.content);
      await writable.close();
    }
  } else {
    for (const note of notes) {
      const fileName = `${slugifyFileName(note.title, note.id)}-${note.id.slice(0, 8)}.md`;
      downloadBlob(new Blob([note.content], { type: "text/markdown" }), fileName);
      await new Promise((r) => setTimeout(r, 120));
    }
  }
}

export default function ExportNotesCard({ disabled }: { disabled?: boolean }) {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const notes = await noteRepo.getAllNotes();

      if (isElectron()) {
        const result = await window.graphnodeAPI.exportSQLiteNotesToDirectory(notes);
        if (result.canceled) {
          addToast({ message: t("settings.dataPrivacy.export.toast.cancelled"), type: "info" });
          return;
        }
      } else {
        await exportNotesWeb(notes);
      }

      addToast({
        message: t("settings.dataPrivacy.export.toast.notesSuccess", { count: notes.length }),
        type: "success",
      });
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      addToast({
        message: err instanceof Error ? err.message : t("settings.dataPrivacy.export.toast.notesError"),
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
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20 transition-colors">
          <IoBookOutline className="text-base" />
        </div>
        <IoCloudDownloadOutline
          className={`text-lg text-text-tertiary group-hover:text-text-secondary transition-colors ${isExporting ? "animate-pulse" : ""}`}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">
          {isExporting
            ? t("settings.dataPrivacy.export.exporting", "Exporting...")
            : t("settings.dataPrivacy.export.notes", "Export Notes")}
        </p>
        <p className="text-xs text-text-tertiary mt-0.5">
          {t("settings.dataPrivacy.export.notesHint", "Markdown files")}
        </p>
      </div>
    </button>
  );
}
