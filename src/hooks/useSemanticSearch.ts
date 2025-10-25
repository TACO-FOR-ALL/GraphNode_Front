// hooks/useSemanticSearch.ts
import { useEffect, useMemo, useState } from "react";
import { semanticSearch } from "@/managers/vectorManager"; // 네가 올린 함수
import { embedOne } from "@/managers/embed";

export type SemanticHit = {
  id: string;
  threadId: string;
  ts: number;
  preview?: string;
  score: number;
};

export function useSemanticSearch(
  query: string,
  opts?: { threadId?: string; k?: number }
) {
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<SemanticHit[]>([]);
  const [error, setError] = useState<string>("");

  const debounced = useDebounce(query, 200);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!debounced?.trim()) {
        setHits([]);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const qvec = await embedOne(debounced);
        const res = await semanticSearch(qvec, {
          k: opts?.k ?? 12,
          threadId: opts?.threadId,
        });
        if (!cancelled) setHits(res);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, opts?.threadId, opts?.k]);

  return { hits, loading, error };
}

function useDebounce<T>(value: T, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
