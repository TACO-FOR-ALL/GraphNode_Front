// electron/main/ipc/embedding.ts
import { ipcMain } from "electron";
import os from "node:os";

let _embedder: any = null;

async function ensureEmbedder() {
  process.env.TRANSFORMERS_BACKEND ||= "wasm";
  if (_embedder) return _embedder;

  console.log("[embed] pipeline import 시작");
  const { pipeline, env } = await import("@xenova/transformers");
  env.backends.onnx.wasm.numThreads = Math.max(
    1,
    Math.min(2, os.cpus().length - 1)
  );
  console.log("[embed] pipeline import 완료, 모델 로드 시작");
  _embedder = await pipeline(
    "feature-extraction",
    "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
  ); // ★ 여기서 '첫 호출'에 모델 다운로드
  console.log("[embed] 모델 로드 완료");
  return _embedder;
}

export default function embeddingIPC() {
  console.log("[IPC] embeddingIPC register");
  ipcMain.handle("embed:texts", async (_e, texts: string[]) => {
    console.log("[IPC] embed:texts 요청", { count: texts?.length });
    const embedder = await ensureEmbedder();
    console.log("[IPC] 임베딩 시작");
    const out: any = await embedder(texts, {
      pooling: "mean",
      normalize: true,
    });
    console.log("[IPC] 임베딩 완료");

    const result =
      typeof out.tolist === "function" ? out.tolist() : [Array.from(out.data)];
    console.log("[IPC] 반환", {
      vectors: result.length,
      dim: result[0]?.length,
    });
    return result;
  });
}
