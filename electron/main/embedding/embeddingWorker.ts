type InitMessage = {
  type: "init";
  modelName: string;
  cacheDir: string;
  executionProviders: string[];
  dtype: "fp32" | "fp16" | "q8" | "int8" | "uint8" | "q4" | "bnb4" | "q4f16"; // ONNX 모델을 메모리에 올릴 때 가중치 정밀도에 관한 옵션
};

type InferRequest = {
  id: string;
  texts: string[];
};

type WorkerResponse =
  | { type: "ready" }
  | { type: "loadError"; error: string }
  | { type: "loadProgress"; file: string; progress: number }
  | {
      type: "inferResult";
      id: string;
      data: Float32Array;
      dims: [number, number];
    }
  | { type: "inferError"; id: string; error: string };

let pipe: any = null;
const port = process.parentPort;

async function loadModel(init: InitMessage) {
  const { modelName, cacheDir, executionProviders, dtype } = init;

  try {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.cacheDir = cacheDir;

    pipe = await pipeline("feature-extraction", modelName, {
      dtype,
      session_options: { executionProviders },
      progress_callback: (p: {
        status: string;
        name?: string;
        progress?: number;
      }) => {
        if (p.status === "progress" && p.name != null && p.progress != null) {
          port.postMessage({
            type: "loadProgress",
            file: p.name,
            progress: p.progress,
          } satisfies WorkerResponse);
        }
      },
    });

    port.postMessage({ type: "ready" } satisfies WorkerResponse);
  } catch (err) {
    port.postMessage({
      type: "loadError",
      error: err instanceof Error ? err.message : String(err),
    } satisfies WorkerResponse);
  }
}

async function runInfer(id: string, texts: string[]) {
  if (!pipe) {
    port.postMessage({
      type: "inferError",
      id,
      error: "Model not loaded yet",
    } satisfies WorkerResponse);
    return;
  }
  try {
    const output = await pipe(texts, { pooling: "mean", normalize: true });

    const data = new Float32Array(output.data as Float32Array);
    const dims: [number, number] = [
      output.dims[0] as number,
      output.dims[1] as number,
    ];

    port.postMessage({
      type: "inferResult",
      id,
      data,
      dims,
    } satisfies WorkerResponse);
  } catch (err) {
    port.postMessage({
      type: "inferError",
      id,
      error: err instanceof Error ? err.message : String(err),
    } satisfies WorkerResponse);
  }
}

// 메시지 수신 (첫 번째 메시지는 init, 이후는 추론 요청)
port.on("message", (event: { data: InitMessage | InferRequest }) => {
  const msg = event.data;
  if ("type" in msg && (msg as InitMessage).type === "init") {
    loadModel(msg as InitMessage);
  } else {
    const req = msg as InferRequest;
    runInfer(req.id, req.texts);
  }
});
