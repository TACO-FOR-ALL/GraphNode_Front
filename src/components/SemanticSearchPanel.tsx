// components/SemanticSearchPanel.tsx
import { useState } from "react";
import { useSemanticSearch } from "@/hooks/useSemanticSearch";

export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  try {
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(esc, "ig");
    const parts = text.split(re);
    const matches = text.match(re) || [];
    return (
      <>
        {parts.map((p, i) => (
          <span key={i}>
            {p}
            {i < matches.length && (
              <mark className="bg-yellow-200">{matches[i]}</mark>
            )}
          </span>
        ))}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

type Props = {
  defaultThreadId?: string;
  onJump: (threadId: string, messageId: string) => void; // 라우팅/스크롤 책임
};

export default function SemanticSearchPanel({
  defaultThreadId,
  onJump,
}: Props) {
  const [query, setQuery] = useState("");
  const { hits, loading, error } = useSemanticSearch(query, {
    threadId: defaultThreadId,
    k: 12,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="의미로 검색하기…"
          className="w-full rounded-xl border px-3 py-2 outline-none"
        />
      </div>

      {loading && <div className="p-3 text-sm text-gray-500">검색 중…</div>}
      {error && <div className="p-3 text-sm text-red-600">에러: {error}</div>}

      <div className="flex-1 overflow-y-auto">
        {hits.map((h) => (
          <button
            key={h.id}
            onClick={() => onJump(h.threadId, h.id)}
            className="w-full text-left p-3 hover:bg-gray-50 border-b"
          >
            <div className="text-xs text-gray-500">
              스코어 {h.score.toFixed(3)} · {new Date(h.ts).toLocaleString()}
            </div>
            <div className="text-sm line-clamp-3">
              <Highlight text={h.preview || ""} query={query} />
            </div>
          </button>
        ))}
        {!loading && !error && hits.length === 0 && query && (
          <div className="p-3 text-sm text-gray-500">결과 없음</div>
        )}
      </div>
    </div>
  );
}
