import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import changelog from "@/data/changelog.json";

type ChangelogEntry = {
  date: string;
  model?: string;
  title: Record<string, string>;
  features: Record<string, string[]>;
  improvements: Record<string, string[]>;
};

// changelog.json에서 최신 버전의 model 필드를 반환
export function getChangelogModelName(): string | null {
  const entries = changelog as Record<string, ChangelogEntry>;

  // semver 내림차순 정렬 후 model 필드가 있는 첫 번째 항목 반환
  const sortedVersions = Object.keys(entries).sort((a, b) => {
    const [aMajor, aMinor, aPatch] = a.split(".").map(Number);
    const [bMajor, bMinor, bPatch] = b.split(".").map(Number);
    if (bMajor !== aMajor) return bMajor - aMajor;
    if (bMinor !== aMinor) return bMinor - aMinor;
    return bPatch - aPatch;
  });

  for (const version of sortedVersions) {
    const entry = entries[version];
    if (entry.model) return entry.model;
  }
  return null;
}

// singleton: 로드된 pipeline 캐싱
let cachedPipeline: FeatureExtractionPipeline | null = null;
let cachedModelName: string | null = null;

// 모델 다운로드 및 warmup
export async function downloadModel(
  modelName: string,
  onProgress: (file: string, progress: number) => void,
): Promise<void> {
  if (cachedPipeline && cachedModelName === modelName) return;

  cachedPipeline = null;
  cachedModelName = null;

  const pipe = await pipeline("feature-extraction", modelName, {
    progress_callback: (data: {
      status: string;
      file?: string;
      progress?: number;
    }) => {
      if (data.status === "progress") {
        onProgress(data.file ?? "", data.progress ?? 0);
      }
    },
  });

  cachedPipeline = pipe;
  cachedModelName = modelName;
}

// 현재 로드된 pipeline으로 임베딩 생성
export async function getEmbedding(text: string): Promise<number[]> {
  if (!cachedPipeline) {
    throw new Error("Embedding model not loaded. Call downloadModel first.");
  }
  const output = await cachedPipeline(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

// Cache Storage에서 구 모델 파일 삭제
export async function removeModel(modelName: string): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    const cache = await caches.open("transformers-cache");
    const keys = await cache.keys();
    const modelSlug = modelName.split("/").pop() ?? modelName;

    for (const req of keys) {
      if (req.url.includes(modelSlug)) {
        await cache.delete(req);
      }
    }
  } catch (e) {
    console.warn("Failed to remove old model from cache:", e);
  }
}
