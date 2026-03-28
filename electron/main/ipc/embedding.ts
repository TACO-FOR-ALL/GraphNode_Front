import { ipcMain, BrowserWindow } from "electron";
import { embeddingService } from "../embedding/embeddingService";

function broadcast(channel: string, payload: unknown) {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  });
}

export default function embeddingIPC() {
  // 서비스 상태 변화 → 모든 렌더러 창에 push
  embeddingService.onStatusChange((status) => {
    broadcast("embedding:statusChanged", status);
  });
  /** changelog.json 기반 모델명 설정 (렌더러 시작 시 1회 호출) */
  ipcMain.handle("embedding:setModel", (_event, modelName: string) => {
    embeddingService.setModelName(modelName);
    return { ok: true };
  });

  /** 실행 중인 모델을 교체하고 재시작 (개발 도구용) */
  ipcMain.handle("embedding:switchModel", async (_event, modelName: string, mode: "auto" | "coreml" | "cpu" = "cpu") => {
    await embeddingService.switchModel(modelName, mode);
    return { ok: true };
  });

  /** dtype 변경 후 worker 재시작 (개발 도구용) */
  ipcMain.handle("embedding:switchDtype", async (_event, dtype: string, mode: "auto" | "coreml" | "cpu" = "cpu") => {
    await embeddingService.switchDtype(dtype, mode);
    return { ok: true };
  });

  /** 모델 로드 + 처리 수동 시작 (개발 도구용, 배치 추론) */
  ipcMain.handle("embedding:startService", async (_event, mode: "auto" | "coreml" | "cpu" = "auto") => {
    await embeddingService.startProcessing(mode);
    return { ok: true };
  });

  /** 모델 로드 + 처리 수동 시작 (단일 추론 - 배치 비교용) */
  ipcMain.handle("embedding:startServiceSingle", async (_event, mode: "auto" | "coreml" | "cpu" = "auto") => {
    await embeddingService.startProcessingSingle(mode);
    return { ok: true };
  });

  /** 스레드의 새 Q&A 쌍을 큐에 추가 */
  ipcMain.handle("embedding:enqueue", async (_event, threadId: string) => {
    await embeddingService.enqueueThread(threadId);
    return { ok: true };
  });

  /** 유사도 검색 */
  ipcMain.handle(
    "embedding:search",
    async (_event, queryText: string, limit?: number) => {
      return await embeddingService.searchSimilar(queryText, limit);
    },
  );

  /** 서비스 상태 조회 */
  ipcMain.handle("embedding:getStatus", async () => {
    return await embeddingService.getStatus();
  });

  /** 임베딩 전체 벡터 조회 (차원 검증용) */
  ipcMain.handle("embedding:inspectFull", async (_event, limit: number = 5) => {
    const { DatabaseSync } = await import("node:sqlite");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { getGraphNodeHomeDirectory } = await import("@graphnode/paths");
    const { getDefaultDatabaseLocation, readSQLiteSchema, applySQLiteCompatibilityMigrations } = await import("@graphnode/storage");
    const embDb = await import("../sqlite/embedding");

    const dbPath = getDefaultDatabaseLocation(getGraphNodeHomeDirectory());
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const conn = new DatabaseSync(dbPath);
    conn.exec(await readSQLiteSchema());
    applySQLiteCompatibilityMigrations(conn);
    try {
      return embDb.getEmbeddingsFull(limit, conn);
    } finally {
      conn.close();
    }
  });

  ipcMain.handle("embedding:inspectNotesFull", async (_event, limit: number = 5) => {
    const { DatabaseSync } = await import("node:sqlite");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { getGraphNodeHomeDirectory } = await import("@graphnode/paths");
    const { getDefaultDatabaseLocation, readSQLiteSchema, applySQLiteCompatibilityMigrations } = await import("@graphnode/storage");
    const embDb = await import("../sqlite/embedding");

    const dbPath = getDefaultDatabaseLocation(getGraphNodeHomeDirectory());
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const conn = new DatabaseSync(dbPath);
    conn.exec(await readSQLiteSchema());
    applySQLiteCompatibilityMigrations(conn);
    try {
      return embDb.getNoteEmbeddingsFull(limit, conn);
    } finally {
      conn.close();
    }
  });

  /** 임베딩 샘플 + 큐 통계 조회 (디버그/인스펙션용) */
  ipcMain.handle("embedding:inspect", async (_event, limit: number = 20) => {
    const { DatabaseSync } = await import("node:sqlite");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { getGraphNodeHomeDirectory } = await import("@graphnode/paths");
    const { getDefaultDatabaseLocation, readSQLiteSchema, applySQLiteCompatibilityMigrations } = await import("@graphnode/storage");
    const embDb = await import("../sqlite/embedding");

    const dbPath = getDefaultDatabaseLocation(getGraphNodeHomeDirectory());
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const conn = new DatabaseSync(dbPath);
    conn.exec(await readSQLiteSchema());
    applySQLiteCompatibilityMigrations(conn);
    try {
      return {
        status: await embeddingService.getStatus(),
        queueStats: embDb.getQueueStats(conn),
        samples: embDb.getEmbeddingSamples(limit, conn),
      };
    } finally {
      conn.close();
    }
  });

  /** 모든 임베딩 삭제 (개발 도구용, note_embeddings 포함) */
  ipcMain.handle("embedding:clearAll", async () => {
    const { DatabaseSync } = await import("node:sqlite");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { getGraphNodeHomeDirectory } = await import("@graphnode/paths");
    const { getDefaultDatabaseLocation, readSQLiteSchema, applySQLiteCompatibilityMigrations } = await import("@graphnode/storage");

    const dbPath = getDefaultDatabaseLocation(getGraphNodeHomeDirectory());
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const conn = new DatabaseSync(dbPath);
    conn.exec(await readSQLiteSchema());
    applySQLiteCompatibilityMigrations(conn);
    try {
      conn.exec(`DELETE FROM chat_embeddings; DELETE FROM embedding_queue; DELETE FROM note_embeddings;`);
      return { ok: true };
    } finally {
      conn.close();
    }
  });

  /** 모든 임베딩 초기화 후 전체 재생성 */
  ipcMain.handle("embedding:resetAndRegenerate", async () => {
    await embeddingService.resetAndRegenerate();
    return { ok: true };
  });

  /** 노트 임베딩 실행 (변경된 노트만) */
  ipcMain.handle("embedding:embedNotes", async () => {
    await embeddingService.embedNotes();
    return { ok: true };
  });

  /** 채팅 유사도 검색 (thread title + matched message snippet 포함) */
  ipcMain.handle(
    "embedding:searchChats",
    async (_event, queryText: string, limit?: number) => {
      const results = await embeddingService.searchSimilar(queryText, limit ?? 5);
      if (results.length === 0) return [];

      const { DatabaseSync } = await import("node:sqlite");
      const fs = await import("node:fs");
      const path = await import("node:path");
      const { getGraphNodeHomeDirectory } = await import("@graphnode/paths");
      const { getDefaultDatabaseLocation, readSQLiteSchema, applySQLiteCompatibilityMigrations } = await import("@graphnode/storage");

      const dbPath = getDefaultDatabaseLocation(getGraphNodeHomeDirectory());
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      const conn = new DatabaseSync(dbPath);
      conn.exec(await readSQLiteSchema());
      applySQLiteCompatibilityMigrations(conn);
      try {
        return results.map((r) => {
          const thread = conn.prepare(
            `SELECT id, title FROM threads WHERE id = ? AND deleted_at IS NULL`,
          ).get(r.threadId) as { id: string; title: string } | undefined;

          const msg = conn.prepare(
            `SELECT id, content FROM thread_messages WHERE id = ?`,
          ).get(r.userMessageId) as { id: string; content: string } | undefined;

          return {
            threadId: r.threadId,
            threadTitle: thread?.title ?? "",
            messageId: r.userMessageId,
            messageSnippet: (msg?.content ?? "").slice(0, 150),
            score: r.score,
          };
        }).filter((r) => r.threadTitle !== "");
      } finally {
        conn.close();
      }
    },
  );

  /** 노트 유사도 검색 */
  ipcMain.handle(
    "embedding:searchNotes",
    async (_event, queryText: string, limit?: number) => {
      return await embeddingService.searchSimilarNotes(queryText, limit);
    },
  );

  /**
   * 기존 스레드 일괄 마이그레이션 (한 번만 실행).
   * 렌더러에서 진행률을 받고 싶으면 sender를 통해 이벤트를 push.
   */
  ipcMain.handle("embedding:runMigration", async (event) => {
    await embeddingService.runInitialMigration((done, total) => {
      // 렌더러로 진행률 전송 (창이 살아있을 때만)
      if (!event.sender.isDestroyed()) {
        event.sender.send("embedding:migrationProgress", { done, total });
      }
    });
    return { ok: true };
  });
}
