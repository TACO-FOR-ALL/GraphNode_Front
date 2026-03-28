import { utilityProcess, UtilityProcess } from "electron";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { getGraphNodeHomeDirectory } from "@graphnode/paths";
import {
  applySQLiteCompatibilityMigrations,
  getDefaultDatabaseLocation,
  readSQLiteSchema,
} from "@graphnode/storage";
import * as db from "../sqlite/embedding";

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type EmbeddingServiceStatus = {
  modelLoaded: boolean;
  pendingCount: number;
  isProcessing: boolean;
  embeddingCount: number;
};

export type SimilarResult = db.SimilarResult;

// 자식 프로세스 → 메인 메시지 타입
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

// ─── 설정 ────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL_NAME = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const POLL_INTERVAL_MS = 30_000; // 30초

// 모델별 추론 설정
// recycleAfter: N개 처리 후 worker 재시작 → ONNX 누적 메모리 해제. 0 = 재시작 안 함
const MODEL_CONFIGS: Record<string, { batchSize: number; maxTextLen: number; recycleAfter: number }> = {
  "Xenova/bge-m3":                               { batchSize: 1, maxTextLen: 500,  recycleAfter: 8 },
  "Xenova/multilingual-e5-base":                 { batchSize: 2, maxTextLen: 1000, recycleAfter: 0 },
  "Xenova/paraphrase-multilingual-MiniLM-L12-v2":{ batchSize: 10, maxTextLen: 2000, recycleAfter: 0 },
};
const DEFAULT_MODEL_CONFIG = { batchSize: 3, maxTextLen: 1000, recycleAfter: 0 };

function getModelConfig(modelName: string) {
  return MODEL_CONFIGS[modelName] ?? DEFAULT_MODEL_CONFIG;
}

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

/** 실행 모드 문자열을 ONNX executionProviders 배열로 변환 */
async function modeToProviders(
  mode: "auto" | "coreml" | "cpu",
): Promise<string[]> {
  if (mode === "coreml") return ["coreml", "cpu"];
  if (mode === "cpu") return ["cpu"];
  // auto: RAM 기반 결정
  const os = await import("node:os");
  const totalMemGB = os.totalmem() / 1024 ** 3;
  return totalMemGB >= 12 ? ["coreml", "cpu"] : ["cpu"];
}

// ─── 스키마 캐시 ─────────────────────────────────────────────────────────────

let schemaPromise: Promise<string> | null = null;
function getSchema() {
  if (!schemaPromise) schemaPromise = readSQLiteSchema();
  return schemaPromise;
}

// ─── EmbeddingService ────────────────────────────────────────────────────────

export type EmbeddingStatusEvent = {
  isProcessing: boolean;
  pendingCount: number;
  embeddingCount: number;
  modelLoaded: boolean;
  currentModel: string;
  downloadProgress?: { file: string; progress: number } | null;
};

class EmbeddingService {
  private worker: UtilityProcess | null = null;
  private modelLoaded = false;
  private pendingRequests = new Map<
    string,
    {
      resolve: (result: { data: Float32Array; dims: [number, number] }) => void;
      reject: (err: Error) => void;
    }
  >();
  private requestCounter = 0;
  private isRunning = false;
  private modelName = DEFAULT_MODEL_NAME;
  private dtype = "fp16";

  setModelName(name: string) {
    if (this.modelLoaded) return; // 이미 로드된 경우 무시 (재시작 필요)
    this.modelName = name;
    console.log(`[EmbeddingService] Model set to: ${name}`);
  }

  /** dtype 변경 후 worker 재시작 (개발 도구용) */
  async switchDtype(dtype: string, mode: "auto" | "coreml" | "cpu" = "cpu"): Promise<void> {
    this.dtype = dtype;
    console.log(`[EmbeddingService] Switching dtype to: ${dtype}`);
    const providers = await modeToProviders(mode);
    if (this.worker) {
      await this.restartWorker(providers);
    } else {
      await this.loadModel(providers);
    }
    this.scheduleProcessing();
  }

  /** 실행 중인 모델을 교체하고 재시작 (개발 도구용) */
  async switchModel(name: string, mode: "auto" | "coreml" | "cpu" = "cpu"): Promise<void> {
    this.modelName = name;
    this.consecutiveCrashes = 0;
    console.log(`[EmbeddingService] Switching model to: ${name}`);
    const providers = await modeToProviders(mode);
    if (this.worker) {
      await this.restartWorker(providers);
    } else {
      await this.loadModel(providers);
    }
    this.scheduleProcessing();
  }
  private isProcessing = false;
  private isMigrating = false;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private downloadProgress: { file: string; progress: number } | null = null;
  private lastProviders: string[] = ["cpu"];
  private consecutiveCrashes = 0;
  private static readonly MAX_CRASHES = 2;
  private statusCallback: ((status: EmbeddingStatusEvent) => void) | null =
    null;

  onStatusChange(cb: (status: EmbeddingStatusEvent) => void) {
    this.statusCallback = cb;
  }

  private pushDownloadProgress(file: string, progress: number): void {
    this.downloadProgress = { file, progress };
    this.statusCallback?.({
      isProcessing: this.isProcessing,
      pendingCount: 0,
      embeddingCount: 0,
      modelLoaded: false,
      currentModel: this.modelName,
      downloadProgress: this.downloadProgress,
    });
  }

  private async pushStatus(): Promise<void> {
    if (!this.statusCallback) return;
    try {
      const conn = await this.openDb();
      try {
        this.statusCallback({
          isProcessing: this.isProcessing,
          pendingCount: db.getPendingCount(conn),
          embeddingCount: db.getEmbeddingCount(conn),
          modelLoaded: this.modelLoaded,
          currentModel: this.modelName,
          downloadProgress: this.downloadProgress,
        });
      } finally {
        conn.close();
      }
    } catch {
      // push 실패는 무시
    }
  }

  // ── 생명주기 ──────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    this.isRunning = true;

    // 비정상 종료로 stuck된 잡 복구
    const conn = await this.openDb();
    try {
      db.resetStuckJobs(conn);
    } finally {
      conn.close();
    }

    // 테스트 중 자동 실행 비활성화 - 개발 도구에서 수동 실행
    // this.loadModel()
    //   .then(() => this.scheduleProcessing())
    //   .catch((err) =>
    //     console.error("[EmbeddingService] Model load failed:", err),
    //   );
  }

  /** 개발 도구에서 수동으로 모델 로드 + 처리 시작 (배치 추론)
   * @param mode "auto" = RAM 기반 자동 선택, "coreml" = CoreML 강제, "cpu" = CPU 전용 강제
   * 이미 모델이 로드된 경우 재시작 없이 처리만 재개
   */
  async startProcessing(
    mode: "auto" | "coreml" | "cpu" = "auto",
  ): Promise<void> {
    if (this.modelLoaded) {
      // 이미 로드됨 → 처리만 재개 (worker 재시작 불필요)
      this.scheduleProcessing();
      return;
    }
    const providers = await modeToProviders(mode);
    await this.loadModel(providers);
    this.scheduleProcessing();
  }

  /** 개발 도구에서 수동으로 모델 로드 + 처리 시작 (단일 추론 - 배치 비교용) */
  async startProcessingSingle(
    mode: "auto" | "coreml" | "cpu" = "auto",
  ): Promise<void> {
    if (this.modelLoaded) {
      this.processQueueSingle();
      return;
    }
    const providers = await modeToProviders(mode);
    await this.loadModel(providers);
    this.processQueueSingle();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    // 대기 중인 추론 요청 전부 reject
    for (const [, { reject }] of this.pendingRequests) {
      reject(new Error("EmbeddingService stopped"));
    }
    this.pendingRequests.clear();

    // Worker 종료
    if (this.worker) {
      this.worker.kill();
      this.worker = null;
      this.modelLoaded = false;
    }

    // 앱 종료 시 processing 상태 잡을 pending으로 되돌림
    const conn = await this.openDb();
    try {
      db.resetStuckJobs(conn);
    } finally {
      conn.close();
    }
  }

  // ── 모델 로드 (Worker Thread) ──────────────────────────────────────────────

  /** Worker를 종료하고 새 실행 모드로 재시작 */
  private async restartWorker(executionProviders: string[]): Promise<void> {
    if (this.worker) {
      for (const [, { reject }] of this.pendingRequests) {
        reject(new Error("Worker restarting"));
      }
      this.pendingRequests.clear();
      this.worker.kill();
      this.worker = null;
      this.modelLoaded = false;
    }
    await this.loadModel(executionProviders);
  }

  private async loadModel(executionProviders?: string[]): Promise<void> {
    const cacheDir = path.join(getGraphNodeHomeDirectory(), "models");
    fs.mkdirSync(cacheDir, { recursive: true });

    // executionProviders가 없으면 RAM 기반 자동 선택
    if (!executionProviders) {
      const os = await import("node:os");
      const totalMemGB = os.totalmem() / 1024 ** 3;
      const useCoreML = totalMemGB >= 12;
      executionProviders = useCoreML ? ["coreml", "cpu"] : ["cpu"];
      const modeLabel = useCoreML
        ? "CoreML + CPU (GPU/ANE 활성화)"
        : "CPU only";
      console.log(
        `[EmbeddingService] Loading model in worker thread: ${this.modelName} | RAM: ${totalMemGB.toFixed(1)}GB | Mode: ${modeLabel} (auto)`,
      );
    } else {
      const modeLabel = executionProviders.includes("coreml")
        ? "CoreML + CPU (강제)"
        : "CPU only (강제)";
      console.log(
        `[EmbeddingService] Loading model in worker thread: ${this.modelName} | Mode: ${modeLabel}`,
      );
    }

    // OOM 방지: 선택된 dtype으로 메모리 절감 (기본 fp16)
    const dtype = this.dtype;
    this.lastProviders = executionProviders;

    return new Promise((resolve, reject) => {
      const workerPath = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "embeddingWorker.js",
      );

      // utilityProcess: 별도 OS 프로세스로 실행 → ONNX 크래시가 메인 프로세스에 전파되지 않음
      // --max-old-space-size: V8 힙 제한 확장 (기본 ~2GB → 8GB), 대형 모델 OOM 방지
      this.worker = utilityProcess.fork(workerPath, [], {
        execArgv: ["--max-old-space-size=8192"],
      });

      // 첫 메시지로 초기화 데이터 전송 (workerData 대체)
      this.worker.postMessage({
        type: "init",
        modelName: this.modelName,
        cacheDir,
        executionProviders,
        dtype,
      });

      this.worker.on("message", (msg: WorkerResponse) => {
        if (msg.type === "ready") {
          this.modelLoaded = true;
          this.downloadProgress = null;
          console.log("[EmbeddingService] Worker model ready");
          this.pushStatus();
          resolve();
        } else if (msg.type === "loadError") {
          this.downloadProgress = null;
          reject(new Error(msg.error));
        } else if (msg.type === "loadProgress") {
          this.pushDownloadProgress(msg.file, msg.progress);
        } else if (msg.type === "inferResult") {
          const pending = this.pendingRequests.get(msg.id);
          if (pending) {
            this.pendingRequests.delete(msg.id);
            pending.resolve({ data: msg.data, dims: msg.dims });
          }
        } else if (msg.type === "inferError") {
          const pending = this.pendingRequests.get(msg.id);
          if (pending) {
            this.pendingRequests.delete(msg.id);
            pending.reject(new Error(msg.error));
          }
        }
      });

      const thisWorker = this.worker;
      thisWorker.on("exit", (code) => {
        // 이미 새 워커로 교체된 경우 구 워커의 exit 이벤트 무시 (recycling 레이스 컨디션 방지)
        if (this.worker !== thisWorker) return;

        const crashed = code !== 0 && code !== null;
        if (crashed) {
          this.consecutiveCrashes++;
          console.error(
            `[EmbeddingService] Worker process exited with code ${code} (crash #${this.consecutiveCrashes})`,
          );
          if (this.consecutiveCrashes >= EmbeddingService.MAX_CRASHES) {
            console.error(
              `[EmbeddingService] Model "${this.modelName}" crashed ${this.consecutiveCrashes} times consecutively. ` +
              `Stopping inference — this model may be incompatible with the current environment.`,
            );
          }
        }
        // 로드 중 종료된 경우 reject
        if (!this.modelLoaded) {
          reject(new Error(`Worker process exited unexpectedly (code ${code})`));
        }
        // 대기 중인 추론 요청 전부 reject
        for (const [, { reject: rej }] of this.pendingRequests) {
          rej(new Error("Worker process exited"));
        }
        this.pendingRequests.clear();
        this.modelLoaded = false;
        this.worker = null;
      });
    });
  }

  /** Worker에 추론 요청 전송 → Promise로 결과 수신 */
  private runInference(
    texts: string[],
  ): Promise<{ data: Float32Array; dims: [number, number] }> {
    if (!this.worker || !this.modelLoaded)
      return Promise.reject(new Error("Worker not ready"));
    const id = String(++this.requestCounter);
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({ id, texts });
    });
  }

  // ── Q&A 쌍 추출 ──────────────────────────────────────────────────────────

  /**
   * 메시지 배열에서 Q&A 쌍을 추출.
   * - system 메시지 무시
   * - 연속된 user 메시지들 → 마지막 user ID를 기준으로 하나의 Q
   * - 연속된 assistant 메시지들 → 마지막 assistant만 A
   * - 끝이 user로 끝나면 skip (아직 응답 없음)
   */
  extractQAPairs(messages: db.MessageRow[]): db.QAPair[] {
    const pairs: db.QAPair[] = [];
    const filtered = messages
      .filter((m) => m.role !== "system")
      .sort((a, b) => a.ts - b.ts);

    let i = 0;
    while (i < filtered.length) {
      // 연속된 user 메시지 수집
      const userMsgs: db.MessageRow[] = [];
      while (i < filtered.length && filtered[i].role === "user") {
        userMsgs.push(filtered[i]);
        i++;
      }

      // 연속된 assistant 메시지 수집
      const asstMsgs: db.MessageRow[] = [];
      while (i < filtered.length && filtered[i].role === "assistant") {
        asstMsgs.push(filtered[i]);
        i++;
      }

      // 둘 다 있어야 쌍으로 인정
      if (userMsgs.length === 0 || asstMsgs.length === 0) continue;

      const lastAsst = asstMsgs[asstMsgs.length - 1];
      // 빈 content는 스트리밍 미완료 → skip
      if (!lastAsst.content.trim()) continue;

      const combinedQ = userMsgs.map((m) => m.content).join("\n");
      pairs.push({
        userMessageId: userMsgs[userMsgs.length - 1].id,
        assistantMessageId: lastAsst.id,
        combinedText: `Q: ${combinedQ}\nA: ${lastAsst.content}`,
      });
    }

    return pairs;
  }

  // ── 큐 추가 ───────────────────────────────────────────────────────────────

  /**
   * 스레드의 새 Q&A 쌍을 큐에 추가.
   * 이미 임베딩됐거나 큐에 있는 쌍은 무시.
   */
  async enqueueThread(threadId: string): Promise<void> {
    const conn = await this.openDb();
    try {
      const messages = db.getThreadMessages(threadId, conn);
      const pairs = this.extractQAPairs(messages);
      if (pairs.length === 0) return;

      // 이미 처리된 쌍 제외
      const existingKeys = new Set(
        db
          .getExistingEmbeddingPairs(threadId, conn)
          .map((p) => `${p.user_message_id}:${p.assistant_message_id}`),
      );
      const queuedKeys = new Set(
        db
          .getQueuedPairs(threadId, conn)
          .map((p) => `${p.user_message_id}:${p.assistant_message_id}`),
      );

      const newPairs = pairs.filter(
        (p) =>
          !existingKeys.has(`${p.userMessageId}:${p.assistantMessageId}`) &&
          !queuedKeys.has(`${p.userMessageId}:${p.assistantMessageId}`),
      );

      if (newPairs.length > 0) {
        db.enqueueJobs(threadId, newPairs, conn);
        console.log(
          `[EmbeddingService] Enqueued ${newPairs.length} jobs for thread ${threadId}`,
        );
        // 즉시 처리 신호
        this.signalProcess();
      }
    } finally {
      conn.close();
    }
  }

  // ── 큐 처리 ───────────────────────────────────────────────────────────────

  private scheduleProcessing(): void {
    if (!this.isRunning) return;
    this.processQueue().finally(() => {
      if (this.isRunning) {
        this.pollTimer = setTimeout(
          () => this.scheduleProcessing(),
          POLL_INTERVAL_MS,
        );
      }
    });
  }

  /** 외부에서 즉시 처리를 트리거 */
  private signalProcess(): void {
    if (this.isProcessing || !this.modelLoaded || !this.isRunning) return;
    // pollTimer 리셋하고 즉시 처리
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.scheduleProcessing();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.modelLoaded) return;
    if (this.consecutiveCrashes >= EmbeddingService.MAX_CRASHES) {
      console.warn(`[EmbeddingService] Skipping processQueue — model "${this.modelName}" exceeded crash limit`);
      return;
    }
    this.isProcessing = true;
    const { batchSize, recycleAfter } = getModelConfig(this.modelName);
    const startTime = Date.now();
    let totalProcessed = 0;
    let processedSinceRecycle = 0;
    this.pushStatus();

    try {
      while (this.isRunning) {
        // worker 재시작 구간 도달 시 메모리 해제 후 재로드
        if (recycleAfter > 0 && processedSinceRecycle >= recycleAfter) {
          console.log(`[EmbeddingService] Recycling worker after ${processedSinceRecycle} items (memory reset)`);
          await this.restartWorker(this.lastProviders);
          processedSinceRecycle = 0;
          if (!this.modelLoaded) break;
        }

        // 배치 dequeue
        const conn = await this.openDb();
        let jobs: db.EmbeddingQueueRow[];
        try {
          jobs = db.dequeueJobs(batchSize, conn);
          if (jobs.length === 0) break;
          db.markJobsProcessing(
            jobs.map((j) => j.id),
            conn,
          );
        } finally {
          conn.close();
        }

        // 배치 추론: utilityProcess에 위임 (메인 이벤트 루프 비블로킹)
        try {
          const texts = jobs.map((j) => j.combined_text);
          const { data, dims } = await this.runInference(texts);
          const embeddingDim = dims[1];

          const conn2 = await this.openDb();
          try {
            for (let i = 0; i < jobs.length; i++) {
              if (!this.isRunning) break;
              const job = jobs[i];
              const slice = data.slice(
                i * embeddingDim,
                (i + 1) * embeddingDim,
              );
              const embedding = Buffer.from(slice.buffer);
              db.saveEmbedding(
                {
                  id: `${job.thread_id}:${job.user_message_id}:${job.assistant_message_id}`,
                  threadId: job.thread_id,
                  userMessageId: job.user_message_id,
                  assistantMessageId: job.assistant_message_id,
                  embedding,
                  modelName: this.modelName,
                  createdAt: Date.now(),
                },
                conn2,
              );
              db.markJobDone(job.id, conn2);
            }
          } finally {
            conn2.close();
          }
          totalProcessed += jobs.length;
          processedSinceRecycle += jobs.length;
          this.consecutiveCrashes = 0; // 성공 시 크래시 카운트 리셋
        } catch (err) {
          // worker 재시작/크래시로 인한 실패는 penalty 없이 requeue
          const isWorkerIssue = !this.modelLoaded ||
            (err instanceof Error &&
              (err.message === "Worker not ready" || err.message === "Worker restarting"));
          console.error(`[EmbeddingService] Batch inference failed (${isWorkerIssue ? "worker issue - requeue" : "real error"}):`, err);
          const conn2 = await this.openDb();
          try {
            for (const job of jobs) {
              if (isWorkerIssue) {
                db.requeueJobWithoutPenalty(job.id, conn2);
              } else {
                db.markJobFailed(job.id, conn2);
              }
            }
          } finally {
            conn2.close();
          }
          if (!this.modelLoaded) break;
        }

        // 배치마다 pendingCount 업데이트 (UI 실시간 반영)
        this.pushStatus();
      }
    } finally {
      this.isProcessing = false;
      this.pushStatus();
      if (totalProcessed > 0) {
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
          `[EmbeddingService] Done: ${totalProcessed} items in ${elapsedSec}s (avg ${(Number(elapsedSec) / totalProcessed).toFixed(2)}s/item)`,
        );
      }
    }
  }

  /** 단일 추론 모드 - 한 번에 1개씩 처리 (배치 추론과 성능 비교용) */
  private async processQueueSingle(): Promise<void> {
    if (this.isProcessing || !this.modelLoaded) return;
    this.isProcessing = true;
    const startTime = Date.now();
    let totalProcessed = 0;
    console.log(
      "[EmbeddingService] Starting SINGLE inference mode (1 item per forward pass)",
    );
    this.pushStatus();

    try {
      while (this.isRunning) {
        const conn = await this.openDb();
        let jobs: db.EmbeddingQueueRow[];
        try {
          jobs = db.dequeueJobs(1, conn);
          if (jobs.length === 0) break;
          db.markJobsProcessing([jobs[0].id], conn);
        } finally {
          conn.close();
        }

        try {
          const job = jobs[0];
          const { data, dims } = await this.runInference([job.combined_text]);
          const embeddingDim = dims[1];
          const slice = data.slice(0, embeddingDim);
          const embedding = Buffer.from(slice.buffer);

          const conn2 = await this.openDb();
          try {
            db.saveEmbedding(
              {
                id: `${job.thread_id}:${job.user_message_id}:${job.assistant_message_id}`,
                threadId: job.thread_id,
                userMessageId: job.user_message_id,
                assistantMessageId: job.assistant_message_id,
                embedding,
                modelName: this.modelName,
                createdAt: Date.now(),
              },
              conn2,
            );
            db.markJobDone(job.id, conn2);
          } finally {
            conn2.close();
          }
          totalProcessed++;
        } catch (err) {
          const isWorkerIssue = !this.modelLoaded ||
            (err instanceof Error &&
              (err.message === "Worker not ready" || err.message === "Worker restarting"));
          console.error("[EmbeddingService] Single inference failed:", err);
          const conn2 = await this.openDb();
          try {
            if (isWorkerIssue) {
              db.requeueJobWithoutPenalty(jobs[0].id, conn2);
            } else {
              db.markJobFailed(jobs[0].id, conn2);
            }
          } finally {
            conn2.close();
          }
          if (!this.modelLoaded) break;
        }

        this.pushStatus();
      }
    } finally {
      this.isProcessing = false;
      this.pushStatus();
      if (totalProcessed > 0) {
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
          `[EmbeddingService] Single mode done: ${totalProcessed} items in ${elapsedSec}s (avg ${(Number(elapsedSec) / totalProcessed).toFixed(2)}s/item)`,
        );
      }
    }
  }

  // ── 초기 마이그레이션 (기존 370개 스레드) ────────────────────────────────

  /**
   * 앱 최초 실행 시 기존 모든 스레드의 Q&A 쌍을 큐에 일괄 추가.
   * 이미 완료됐으면 skip.
   * @param onProgress (done, total) 콜백
   */
  async runInitialMigration(
    onProgress?: (done: number, total: number) => void,
  ): Promise<void> {
    // 동시 실행 방지 (React StrictMode 등으로 중복 호출될 수 있음)
    if (this.isMigrating) return;
    this.isMigrating = true;

    try {
      await this._runInitialMigration(onProgress);
    } finally {
      this.isMigrating = false;
    }
  }

  private async _runInitialMigration(
    onProgress?: (done: number, total: number) => void,
  ): Promise<void> {
    const conn = await this.openDb();
    try {
      if (db.isMigrationDone(conn)) {
        console.log("[EmbeddingService] Initial migration already done");
        return;
      }
    } finally {
      conn.close();
    }

    console.log("[EmbeddingService] Starting initial migration...");

    const conn2 = await this.openDb();
    let threadIds: string[];
    try {
      threadIds = db.getAllThreadIds(conn2);
    } finally {
      conn2.close();
    }

    const total = threadIds.length;
    let done = 0;

    // 배치 단위(10개씩) 처리 - 앱 사용에 영향 최소화
    const MIGRATION_BATCH = 10;
    for (let i = 0; i < threadIds.length; i += MIGRATION_BATCH) {
      const batch = threadIds.slice(i, i + MIGRATION_BATCH);
      const conn3 = await this.openDb();
      try {
        for (const threadId of batch) {
          const messages = db.getThreadMessages(threadId, conn3);
          const pairs = this.extractQAPairs(messages);
          if (pairs.length > 0) {
            db.enqueueJobs(threadId, pairs, conn3);
          }
          done++;
          onProgress?.(done, total);
        }
      } finally {
        conn3.close();
      }
      // 다른 작업에 CPU 양보
      await new Promise((r) => setTimeout(r, 50));
    }

    const conn4 = await this.openDb();
    try {
      db.setMigrationDone(conn4);
    } finally {
      conn4.close();
    }

    console.log(
      `[EmbeddingService] Initial migration complete: ${total} threads queued`,
    );

    // 처리 시작
    this.signalProcess();
  }

  // ── 노트 임베딩 ───────────────────────────────────────────────────────────

  /**
   * 앱 시작 시 변경된 노트만 임베딩.
   * note.updatedAt > note_embeddings.embedded_at 인 것만 처리.
   */
  async embedNotes(): Promise<void> {
    if (!this.modelLoaded) return;

    const { listSQLiteNotes } = await import("../sqlite/startupSync");
    const notes = await listSQLiteNotes();
    if (notes.length === 0) return;

    const conn = await this.openDb();
    const toEmbed: typeof notes = [];
    try {
      for (const note of notes) {
        const existing = db.getNoteEmbedding(note.id, conn);
        if (!existing || note.updatedAt > existing.embedded_at) {
          toEmbed.push(note);
        }
      }
    } finally {
      conn.close();
    }

    if (toEmbed.length === 0) return;
    console.log(`[EmbeddingService] Embedding ${toEmbed.length} notes...`);

    // 배치 처리 (utilityProcess 경유)
    const { batchSize: noteBatchSize, maxTextLen } = getModelConfig(this.modelName);
    for (let i = 0; i < toEmbed.length; i += noteBatchSize) {
      if (!this.isRunning) break;
      const batch = toEmbed.slice(i, i + noteBatchSize);
      const texts = batch.map((n) => `${n.title}\n${n.content}`.slice(0, maxTextLen));
      try {
        const { data, dims } = await this.runInference(texts);
        const embeddingDim = dims[1];
        const conn2 = await this.openDb();
        try {
          for (let j = 0; j < batch.length; j++) {
            const slice = data.slice(j * embeddingDim, (j + 1) * embeddingDim);
            db.saveNoteEmbedding(
              {
                noteId: batch[j].id,
                embedding: Buffer.from(slice.buffer),
                modelName: this.modelName,
                embeddedAt: Date.now(),
              },
              conn2,
            );
          }
        } finally {
          conn2.close();
        }
      } catch (err) {
        console.error("[EmbeddingService] Note batch embedding failed:", err);
      }
    }
    console.log(`[EmbeddingService] Note embedding done`);
  }

  // ── 초기화 + 재생성 ───────────────────────────────────────────────────────

  /**
   * 모든 임베딩 삭제 후 chat 마이그레이션 재실행 + 노트 재임베딩.
   */
  async resetAndRegenerate(): Promise<void> {
    const conn = await this.openDb();
    try {
      conn.exec(`DELETE FROM chat_embeddings; DELETE FROM embedding_queue;`);
      db.clearNoteEmbeddings(conn);
      conn
        .prepare(
          `DELETE FROM app_meta WHERE key = 'embedding.initial_migration.done'`,
        )
        .run();
    } finally {
      conn.close();
    }

    this.isMigrating = false;

    await this.runInitialMigration();
    await this.embedNotes();
  }

  // ── 유사도 검색 ───────────────────────────────────────────────────────────

  async searchSimilar(
    queryText: string,
    limit = 10,
  ): Promise<db.SimilarResult[]> {
    if (!this.modelLoaded) throw new Error("Embedding model not loaded yet");

    const { data } = await this.runInference([queryText]);
    const queryVec = data;

    const conn = await this.openDb();
    try {
      const rows = db.getAllEmbeddings(conn);
      return rows
        .map((row) => ({
          threadId: row.thread_id,
          userMessageId: row.user_message_id,
          assistantMessageId: row.assistant_message_id,
          score: db.cosineSimilarity(
            queryVec,
            db.bufferToFloat32Array(row.embedding),
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } finally {
      conn.close();
    }
  }

  async searchSimilarNotes(
    queryText: string,
    limit = 5,
  ): Promise<Array<{ noteId: string; score: number }>> {
    if (!this.modelLoaded) throw new Error("Embedding model not loaded yet");

    const { data } = await this.runInference([queryText]);
    const queryVec = data;

    const conn = await this.openDb();
    try {
      const rows = db.getAllNoteEmbeddings(conn);
      return rows
        .map((row) => ({
          noteId: row.note_id,
          score: db.cosineSimilarity(
            queryVec,
            db.bufferToFloat32Array(row.embedding),
          ),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } finally {
      conn.close();
    }
  }

  // ── 상태 조회 ─────────────────────────────────────────────────────────────

  async getStatus(): Promise<EmbeddingServiceStatus> {
    const conn = await this.openDb();
    try {
      return {
        modelLoaded: this.modelLoaded,
        pendingCount: db.getPendingCount(conn),
        isProcessing: this.isProcessing,
        embeddingCount: db.getEmbeddingCount(conn),
      };
    } finally {
      conn.close();
    }
  }

  // ── DB 헬퍼 ───────────────────────────────────────────────────────────────

  private async openDb(): Promise<DatabaseSync> {
    const dbPath = getDefaultDatabaseLocation(getGraphNodeHomeDirectory());
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const conn = new DatabaseSync(dbPath);
    conn.exec(await getSchema());
    applySQLiteCompatibilityMigrations(conn);
    return conn;
  }
}

export const embeddingService = new EmbeddingService();
