import { db } from "@/db/chat.db";
import { MessageVector } from "@/types/Chat";

export async function upsertVectors(
  rows: {
    id: string;
    threadId: string;
    ts: number;
    model: string;
    vec: number[];
    preview?: string;
  }[]
) {
  const mapped = rows.map((r) => ({
    id: r.id,
    threadId: r.threadId,
    ts: r.ts,
    model: r.model,
    dim: r.vec.length,
    vec: new Float32Array(r.vec).buffer,
    preview: r.preview,
  }));
  await db.vectors.bulkPut(mapped);
}

// 삭제/수정 시 동기화
export async function deleteVectorsByIds(ids: string[]) {
  await db.vectors.bulkDelete(ids);
}

function cosine(a: Float32Array, b: Float32Array) {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i],
      y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

export async function semanticSearch(
  queryVec: number[],
  opts?: { k?: number; threadId?: string; limitScan?: number }
) {
  const k = opts?.k ?? 10;

  // 1) 후보 벡터 로드 (필터링으로 스캔 범위 줄이기)
  let candidates: MessageVector[];
  if (opts?.threadId) {
    candidates = await db.vectors
      .where("threadId")
      .equals(opts.threadId)
      .toArray();
  } else {
    // 아주 많으면 전체 스캔은 느릴 수 → 최신 ts 상위 N만 스캔하거나, 샘플링 옵션
    const limit = opts?.limitScan ?? 50000; // 안전 장치
    candidates = await db.vectors
      .orderBy("ts")
      .reverse()
      .limit(limit)
      .toArray();
  }

  // 2) 메모리에서 점수화
  const q = new Float32Array(queryVec);
  const scored = candidates.map((c) => {
    const v = new Float32Array(c.vec);
    return {
      id: c.id,
      threadId: c.threadId,
      ts: c.ts,
      preview: c.preview,
      score: cosine(q, v),
    };
  });

  // 3) 상위 k 정렬 반환
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
