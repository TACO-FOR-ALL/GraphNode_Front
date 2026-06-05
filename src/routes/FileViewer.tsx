import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import mammoth from "mammoth";
import { api } from "@/apiClient";

const DEMO_URLS: Record<string, string> = {
  pdf: "https://cdn.jsdelivr.net/gh/Yoy0z-maps/test@main/swj2950.pdf",
  word: "https://media.githubusercontent.com/media/Yoy0z-maps/test/main/%E4%B8%AD%E5%9B%BD%E5%8F%A4%E4%BB%A3%E9%99%B6%E7%93%B7.docx",
  ppt: "REPLACE_WITH_PPTX_URL",
};

type ViewState =
  | { type: "loading" }
  | { type: "pdf"; blobUrl: string }
  | { type: "docx"; html: string }
  | { type: "error" };

export default function FileViewer() {
  const { fileId } = useParams<{ fileId: string }>();
  const [viewState, setViewState] = useState<ViewState>({ type: "loading" });

  const { data: meta, isLoading } = useQuery({
    queryKey: ["user-file-meta", fileId],
    queryFn: () => api.userFiles.getUserFile(fileId!),
    enabled: !!fileId,
    select: (res) => (res.isSuccess ? res.data : null),
  });

  useEffect(() => {
    if (!meta) return;

    let cancelled = false;
    let objectUrl: string | null = null;
    setViewState({ type: "loading" });

    const rawUrl = DEMO_URLS[meta.category] ?? DEMO_URLS["pdf"];

    (async () => {
      try {
        const res = await fetch(rawUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        if (cancelled) return;

        if (meta.category === "word") {
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (!cancelled) setViewState({ type: "docx", html: result.value });
        } else {
          const blob = new Blob([arrayBuffer], { type: "application/pdf" });
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) setViewState({ type: "pdf", blobUrl: objectUrl });
        }
      } catch {
        if (!cancelled) setViewState({ type: "error" });
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [meta]);

  if (isLoading || viewState.type === "loading") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-text-secondary text-[14px]">불러오는 중...</div>
      </div>
    );
  }

  if (viewState.type === "error") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-text-secondary text-[14px]">
          파일을 불러올 수 없습니다.
        </div>
      </div>
    );
  }

  if (viewState.type === "pdf") {
    return (
      <iframe
        key={viewState.blobUrl}
        src={`${viewState.blobUrl}#toolbar=0&navpanes=0`}
        className="h-full w-full border-none"
        title={meta?.displayName}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-sidebar-expanded-background">
      <div className="max-w-3xl mx-auto px-10 py-10">
        <div
          className="prose prose-sm max-w-none text-text-primary"
          dangerouslySetInnerHTML={{ __html: viewState.html }}
        />
      </div>
    </div>
  );
}
