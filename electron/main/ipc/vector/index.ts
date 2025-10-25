// electron/main/embedding.ts
let _embedder: any = null;

export async function embedTexts(texts: string[]) {
  // 안전망: 혹시 상위에서 env 설정을 놓쳐도 여기서 보강
  process.env.TRANSFORMERS_BACKEND ||= "wasm";

  if (!_embedder) {
    // ⬇ 여기서 동적 import: env 설정 이후에 로드됨
    const { pipeline } = await import("@xenova/transformers");
    _embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }

  const out: any = await _embedder(texts, { pooling: "mean", normalize: true });
  // 최신 버전은 tolist 지원
  return typeof out.tolist === "function"
    ? out.tolist()
    : [Array.from(out.data)];
}
