import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { renderAsync } from "docx-preview";
import { api } from "@/apiClient";

type ViewState =
  | { type: "loading" }
  | { type: "pdf"; presignedUrl: string }
  | { type: "docx"; arrayBuffer: ArrayBuffer }
  | { type: "ppt"; presignedUrl: string }
  | { type: "unsupported"; presignedUrl: string }
  | { type: "error" };

export default function FileViewer() {
  const { fileId } = useParams<{ fileId: string }>();
  const { t } = useTranslation("fileViewer");
  const [viewState, setViewState] = useState<ViewState>({ type: "loading" });
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const { data: meta, isLoading } = useQuery({
    queryKey: ["user-file-meta", fileId],
    queryFn: () => api.userFiles.getUserFile(fileId!),
    enabled: !!fileId,
    select: (res) => (res.isSuccess ? res.data : null),
  });

  useEffect(() => {
    if (!meta || !fileId) return;

    let cancelled = false;
    setViewState({ type: "loading" });

    (async () => {
      try {
        const urlRes = await api.userFiles.getUserFilePresignedViewUrl(fileId, {
          disposition: "inline",
        });
        if (!urlRes.isSuccess) {
          if (!cancelled) setViewState({ type: "error" });
          return;
        }
        if (cancelled) return;

        const presignedUrl = urlRes.data.url;

        if (meta.category === "pdf") {
          setViewState({ type: "pdf", presignedUrl });
        } else if (meta.category === "word") {
          const res = await fetch(presignedUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          if (!cancelled) setViewState({ type: "docx", arrayBuffer });
        } else if (meta.category === "ppt") {
          setViewState({ type: "ppt", presignedUrl });
        } else {
          setViewState({ type: "unsupported", presignedUrl });
        }
      } catch {
        if (!cancelled) setViewState({ type: "error" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [meta, fileId]);

  useEffect(() => {
    if (viewState.type !== "docx" || !docxContainerRef.current) return;
    renderAsync(viewState.arrayBuffer, docxContainerRef.current, undefined, {
      className: "docx-viewer",
    });
  }, [viewState]);

  if (isLoading || viewState.type === "loading") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-text-secondary text-[14px]">{t("loading")}</div>
      </div>
    );
  }

  if (viewState.type === "error") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-text-secondary text-[14px]">{t("error")}</div>
      </div>
    );
  }

  if (viewState.type === "pdf") {
    return (
      <div className="h-full w-full bg-bg-secondary">
        <iframe
          key={viewState.presignedUrl}
          src={`${viewState.presignedUrl}#toolbar=0&navpanes=0`}
          className="h-full w-full border-none"
          title={meta?.displayName}
        />
      </div>
    );
  }

  if (viewState.type === "docx") {
    return (
      <div className="h-full overflow-y-auto bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-10 py-10">
          <div ref={docxContainerRef} />
        </div>
      </div>
    );
  }

  if (viewState.type === "ppt") {
    const googleUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(viewState.presignedUrl)}&embedded=true`;
    return (
      <div className="h-full w-full bg-bg-secondary">
        <iframe
          key={viewState.presignedUrl}
          src={googleUrl}
          className="h-full w-full border-none"
          title={meta?.displayName}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-presentation"
        />
      </div>
    );
  }

  if (viewState.type === "unsupported") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="text-text-secondary text-[13px]">
            {t("unsupported")}
          </div>
          <a
            href={viewState.presignedUrl}
            download={meta?.displayName}
            className="px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            {t("download")}
          </a>
        </div>
      </div>
    );
  }

  return null;
}
