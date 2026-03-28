import { contextBridge, ipcRenderer } from "electron";

export default function exposeGraphNodeBridge() {
  contextBridge.exposeInMainWorld("graphnodeAPI", {
    getPaths: (): Promise<{ home: string; cliNotes: string }> =>
      ipcRenderer.invoke("graphnode:getPaths"),
    getCliInstallStatus: (): Promise<{
      platform: string;
      supported: boolean;
      cliEntryPath: string | null;
      installDir: string;
      commandPath: string;
      isInstalled: boolean;
      pathConfigured: boolean;
      shellConfigPath?: string | null;
    }> => ipcRenderer.invoke("graphnode:getCliInstallStatus"),
    installBundledCli: (): Promise<{
      ok: true;
      platform: string;
      cliEntryPath: string;
      installDir: string;
      commandPath: string;
      pathUpdated: boolean;
      requiresNewTerminal: boolean;
      shellConfigPath?: string | null;
    }> => ipcRenderer.invoke("graphnode:installBundledCli"),
    getSQLiteStatus: (): Promise<{
      databasePath: string;
      bootstrap: {
        state: string;
        lastServerTime: string | null;
        lastBootstrappedAt: string | null;
      } | null;
      cursor: { serverTime: string } | null;
    }> => ipcRenderer.invoke("graphnode:getSQLiteStatus"),
    listSQLiteNotes: (): Promise<
      Array<{
        id: string;
        title: string;
        content: string;
        folderId: string | null;
        createdAt: number;
        updatedAt: number;
      }>
    > => ipcRenderer.invoke("graphnode:listSQLiteNotes"),
    listSQLiteFolders: (): Promise<Array<{ id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number }>> =>
      ipcRenderer.invoke("graphnode:listSQLiteFolders"),
    listSQLiteThreads: (): Promise<Array<{ id: string; title: string; messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; ts: number; temp?: boolean }>; updatedAt: number }>> =>
      ipcRenderer.invoke("graphnode:listSQLiteThreads"),
    getSQLiteNoteById: (
      id: string,
    ): Promise<{
      id: string;
      title: string;
      content: string;
      folderId: string | null;
      createdAt: number;
      updatedAt: number;
    } | null> => ipcRenderer.invoke("graphnode:getSQLiteNoteById", id),
    getSQLiteFolderById: (id: string): Promise<{ id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number } | null> =>
      ipcRenderer.invoke("graphnode:getSQLiteFolderById", id),
    getSQLiteFoldersByParentId: (parentId: string | null): Promise<Array<{ id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number }>> =>
      ipcRenderer.invoke("graphnode:getSQLiteFoldersByParentId", parentId),
    getSQLiteThreadById: (id: string): Promise<{ id: string; title: string; messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; ts: number; temp?: boolean }>; updatedAt: number } | null> =>
      ipcRenderer.invoke("graphnode:getSQLiteThreadById", id),
    searchSQLiteNotes: (
      query: string,
    ): Promise<
      Array<{
        id: string;
        title: string;
        content: string;
        folderId: string | null;
        createdAt: number;
        updatedAt: number;
      }>
    > => ipcRenderer.invoke("graphnode:searchSQLiteNotes", query),
    searchSQLiteThreads: (query: string): Promise<Array<{ id: string; title: string; messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; ts: number; temp?: boolean }>; updatedAt: number }>> =>
      ipcRenderer.invoke("graphnode:searchSQLiteThreads", query),
    upsertSQLiteNote: (note: {
      id: string;
      title: string;
      content: string;
      folderId: string | null;
      createdAt: number;
      updatedAt: number;
    }): Promise<{ ok: true; note: unknown }> =>
      ipcRenderer.invoke("graphnode:upsertSQLiteNote", note),
    upsertSQLiteFolder: (folder: { id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number }): Promise<{ ok: true; folder: unknown }> =>
      ipcRenderer.invoke("graphnode:upsertSQLiteFolder", folder),
    upsertSQLiteThread: (thread: { id: string; title: string; messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; ts: number; temp?: boolean }>; updatedAt: number }): Promise<{ ok: true; thread: unknown }> =>
      ipcRenderer.invoke("graphnode:upsertSQLiteThread", thread),
    bulkUpsertSQLiteNotes: (
      notes: Array<{
        id: string;
        title: string;
        content: string;
        folderId: string | null;
        createdAt: number;
        updatedAt: number;
      }>,
    ): Promise<{ ok: true; count: number }> =>
      ipcRenderer.invoke("graphnode:bulkUpsertSQLiteNotes", notes),
    bulkUpsertSQLiteFolders: (folders: Array<{ id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number }>): Promise<{ ok: true; count: number }> =>
      ipcRenderer.invoke("graphnode:bulkUpsertSQLiteFolders", folders),
    bulkUpsertSQLiteThreads: (threads: Array<{ id: string; title: string; messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; ts: number; temp?: boolean }>; updatedAt: number }>): Promise<{ ok: true; count: number }> =>
      ipcRenderer.invoke("graphnode:bulkUpsertSQLiteThreads", threads),
    deleteSQLiteNote: (id: string): Promise<{ ok: true; id: string }> =>
      ipcRenderer.invoke("graphnode:deleteSQLiteNote", id),
    bulkDeleteSQLiteNotes: (
      ids: string[],
    ): Promise<{ ok: true; count: number }> =>
      ipcRenderer.invoke("graphnode:bulkDeleteSQLiteNotes", ids),
    bulkDeleteSQLiteFolders: (ids: string[]): Promise<{ ok: true; count: number }> =>
      ipcRenderer.invoke("graphnode:bulkDeleteSQLiteFolders", ids),
    bulkDeleteSQLiteThreads: (ids: string[]): Promise<{ ok: true; count: number }> =>
      ipcRenderer.invoke("graphnode:bulkDeleteSQLiteThreads", ids),
    clearSQLiteNotes: (): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:clearSQLiteNotes"),
    clearSQLiteFolders: (): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:clearSQLiteFolders"),
    clearSQLiteThreads: (): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:clearSQLiteThreads"),
    listSQLiteOutboxByEntityId: (entityId: string): Promise<Array<{
      opId: string;
      entityId: string;
      type: string;
      payload: unknown;
      status: "pending" | "processing";
      retryCount: number;
      nextRetryAt: number;
      createdAt: number;
      updatedAt: number;
      lastError?: string;
    }>> => ipcRenderer.invoke("graphnode:listSQLiteOutboxByEntityId", entityId),
    listSQLiteOutboxByEntityIds: (entityIds: string[]): Promise<Array<{
      opId: string;
      entityId: string;
      type: string;
      payload: unknown;
      status: "pending" | "processing";
      retryCount: number;
      nextRetryAt: number;
      createdAt: number;
      updatedAt: number;
      lastError?: string;
    }>> => ipcRenderer.invoke("graphnode:listSQLiteOutboxByEntityIds", entityIds),
    getSQLitePendingOutbox: (entityId: string, type: string): Promise<{
      opId: string;
      entityId: string;
      type: string;
      payload: unknown;
      status: "pending" | "processing";
      retryCount: number;
      nextRetryAt: number;
      createdAt: number;
      updatedAt: number;
      lastError?: string;
    } | null> => ipcRenderer.invoke("graphnode:getSQLitePendingOutbox", entityId, type),
    putSQLiteOutbox: (op: {
      opId: string;
      entityId: string;
      entityType: string;
      type: string;
      payload: unknown;
      status: "pending" | "processing";
      retryCount: number;
      nextRetryAt: number;
      createdAt: number;
      updatedAt: number;
      lastError?: string;
    }): Promise<{ ok: true }> => ipcRenderer.invoke("graphnode:putSQLiteOutbox", op),
    updateSQLiteOutbox: (opId: string, updates: Record<string, unknown>): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke("graphnode:updateSQLiteOutbox", opId, updates),
    deleteSQLiteOutbox: (opId: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:deleteSQLiteOutbox", opId),
    bulkDeleteSQLiteOutbox: (opIds: string[]): Promise<{ ok: true; count: number }> =>
      ipcRenderer.invoke("graphnode:bulkDeleteSQLiteOutbox", opIds),
    deleteSQLiteOutboxByEntityType: (entityType: string): Promise<{ ok: true; count: number }> =>
      ipcRenderer.invoke("graphnode:deleteSQLiteOutboxByEntityType", entityType),
    requeueStaleSQLiteOutbox: (now: number): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:requeueStaleSQLiteOutbox", now),
    listSQLitePendingOutboxDue: (now: number, limit: number): Promise<Array<{
      opId: string;
      entityId: string;
      type: string;
      payload: unknown;
      status: "pending" | "processing";
      retryCount: number;
      nextRetryAt: number;
      createdAt: number;
      updatedAt: number;
      lastError?: string;
    }>> => ipcRenderer.invoke("graphnode:listSQLitePendingOutboxDue", now, limit),
    replaceSQLiteOutboxEntityId: (oldEntityId: string, newEntityId: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:replaceSQLiteOutboxEntityId", oldEntityId, newEntityId),
    listSQLiteTrashedNotes: (): Promise<Array<{
      id: string;
      originalNote: {
        id: string;
        title: string;
        content: string;
        folderId: string | null;
        createdAt: number;
        updatedAt: number;
      };
      deletedAt: number;
      expiresAt: number;
    }>> => ipcRenderer.invoke("graphnode:listSQLiteTrashedNotes"),
    listSQLiteTrashedThreads: (): Promise<Array<{
      id: string;
      originalThread: {
        id: string;
        title: string;
        messages: Array<{ id: string; role: "user" | "assistant" | "system"; content: string; ts: number; temp?: boolean }>;
        updatedAt: number;
      };
      deletedAt: number;
      expiresAt: number;
    }>> => ipcRenderer.invoke("graphnode:listSQLiteTrashedThreads"),
    listSQLiteTrashedFolders: (): Promise<Array<{
      id: string;
      originalFolder: { id: string; name: string; parentId: string | null; createdAt: number; updatedAt: number };
      noteIds: string[];
      deletedAt: number;
      expiresAt: number;
    }>> => ipcRenderer.invoke("graphnode:listSQLiteTrashedFolders"),
    getSQLiteTrashedNoteById: (id: string) =>
      ipcRenderer.invoke("graphnode:getSQLiteTrashedNoteById", id),
    getSQLiteTrashedThreadById: (id: string) =>
      ipcRenderer.invoke("graphnode:getSQLiteTrashedThreadById", id),
    getSQLiteTrashedFolderById: (id: string) =>
      ipcRenderer.invoke("graphnode:getSQLiteTrashedFolderById", id),
    upsertSQLiteTrashedNote: (trashedNote: {
      id: string;
      originalNote: unknown;
      deletedAt: number;
      expiresAt: number;
    }): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:upsertSQLiteTrashedNote", trashedNote),
    upsertSQLiteTrashedThread: (trashedThread: {
      id: string;
      originalThread: unknown;
      deletedAt: number;
      expiresAt: number;
    }): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:upsertSQLiteTrashedThread", trashedThread),
    upsertSQLiteTrashedFolder: (trashedFolder: {
      id: string;
      originalFolder: unknown;
      noteIds: string[];
      deletedAt: number;
      expiresAt: number;
    }): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:upsertSQLiteTrashedFolder", trashedFolder),
    deleteSQLiteTrashedNote: (id: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:deleteSQLiteTrashedNote", id),
    deleteSQLiteTrashedThread: (id: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:deleteSQLiteTrashedThread", id),
    deleteSQLiteTrashedFolder: (id: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:deleteSQLiteTrashedFolder", id),
    clearSQLiteTrash: (): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:clearSQLiteTrash"),
    bulkDeleteExpiredSQLiteTrash: (now: number): Promise<{ ok: true }> =>
      ipcRenderer.invoke("graphnode:bulkDeleteExpiredSQLiteTrash", now),
    exportSQLiteNotesToDirectory: (notes: Array<{
      id: string;
      title: string;
      content: string;
      folderId: string | null;
      createdAt: number;
      updatedAt: number;
    }>): Promise<{ canceled: boolean; directory?: string; count?: number }> =>
      ipcRenderer.invoke("graphnode:exportSQLiteNotesToDirectory", notes),
    exportSQLiteThreadsToDirectory: (threads: Array<{
      id: string;
      title: string;
      messages: Array<{
        id: string;
        role: "user" | "assistant" | "system";
        content: string;
        ts: number;
        temp?: boolean;
      }>;
      updatedAt: number;
    }>): Promise<{ canceled: boolean; directory?: string; filePath?: string; count?: number }> =>
      ipcRenderer.invoke("graphnode:exportSQLiteThreadsToDirectory", threads),
    applyStartupSync: (payload: {
      notes: {
        upserts: Array<{
          id: string;
          title: string;
          content: string;
          folderId: string | null;
          createdAt: number;
          updatedAt: number;
        }>;
        deleteIds: string[];
      };
      folders: {
        upserts: Array<{
          id: string;
          name: string;
          parentId: string | null;
          createdAt: number;
          updatedAt: number;
        }>;
        deleteIds: string[];
      };
      threads: {
        upserts: Array<{
          id: string;
          title: string;
          messages: Array<{
            id: string;
            role: "user" | "assistant" | "system";
            content: string;
            ts: number;
            temp?: boolean;
          }>;
          updatedAt: number;
        }>;
        deleteIds: string[];
      };
      serverTime: string;
    }): Promise<{
      databasePath: string;
      synced: {
        notes: number;
        noteDeletes: number;
        folders: number;
        folderDeletes: number;
        threads: number;
        threadDeletes: number;
      };
    }> => ipcRenderer.invoke("graphnode:applyStartupSync", payload),

    // ── 임베딩 API ──────────────────────────────────────────────────────────

    /** 스레드의 새 Q&A 쌍을 메인 프로세스 임베딩 큐에 추가 */
    enqueueThreadEmbedding: (threadId: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke("embedding:enqueue", threadId),

    /** 텍스트 쿼리로 유사한 Q&A 쌍 검색 */
    searchEmbeddings: (
      queryText: string,
      limit?: number,
    ): Promise<
      Array<{
        threadId: string;
        userMessageId: string;
        assistantMessageId: string;
        score: number;
      }>
    > => ipcRenderer.invoke("embedding:search", queryText, limit),

    /** 임베딩 서비스 상태 조회 */
    getEmbeddingStatus: (): Promise<{
      modelLoaded: boolean;
      pendingCount: number;
      isProcessing: boolean;
      embeddingCount: number;
    }> => ipcRenderer.invoke("embedding:getStatus"),

    /** 기존 스레드 초기 마이그레이션 실행 (최초 1회) */
    runEmbeddingMigration: (): Promise<{ ok: true }> =>
      ipcRenderer.invoke("embedding:runMigration"),

    /** 임베딩 샘플 + 큐 통계 조회 (디버그/인스펙션) */
    inspectEmbeddings: (limit?: number): Promise<{
      status: { modelLoaded: boolean; pendingCount: number; isProcessing: boolean; embeddingCount: number };
      queueStats: Record<string, number>;
      samples: Array<{
        id: string;
        thread_id: string;
        user_message_snippet: string;
        assistant_message_snippet: string;
        model_name: string;
        vector_preview: number[];
        created_at: number;
      }>;
    }> => ipcRenderer.invoke("embedding:inspect", limit),

    /** 임베딩 전체 벡터 조회 (차원 검증용) */
    inspectEmbeddingsFull: (limit?: number): Promise<Array<{
      id: string;
      thread_id: string;
      user_message_snippet: string;
      assistant_message_snippet: string;
      model_name: string;
      dims: number;
      vector: number[];
      created_at: number;
    }>> => ipcRenderer.invoke("embedding:inspectFull", limit),

    /** 노트 임베딩 전체 벡터 조회 (차원 검증용) */
    inspectNoteEmbeddingsFull: (limit?: number): Promise<Array<{
      note_id: string;
      note_title_snippet: string;
      note_content_snippet: string;
      model_name: string;
      dims: number;
      vector: number[];
      embedded_at: number;
    }>> => ipcRenderer.invoke("embedding:inspectNotesFull", limit),

    /** changelog 모델명 메인 프로세스에 전달 */
    setEmbeddingModel: (modelName: string): Promise<{ ok: true }> =>
      ipcRenderer.invoke("embedding:setModel", modelName),

    /** 실행 중인 모델을 교체하고 재시작 (개발 도구용) */
    switchEmbeddingModel: (modelName: string, mode?: "auto" | "coreml" | "cpu"): Promise<{ ok: true }> =>
      ipcRenderer.invoke("embedding:switchModel", modelName, mode ?? "cpu"),

    /** dtype 변경 후 worker 재시작 (개발 도구용) */
    switchEmbeddingDtype: (dtype: string, mode?: "auto" | "coreml" | "cpu"): Promise<{ ok: true }> =>
      ipcRenderer.invoke("embedding:switchDtype", dtype, mode ?? "cpu"),

    /** 모델 로드 + 처리 수동 시작 (개발 도구용, 배치 추론) */
    startEmbeddingService: (mode?: "auto" | "coreml" | "cpu"): Promise<{ ok: true }> =>
      ipcRenderer.invoke("embedding:startService", mode ?? "auto"),

    /** 모델 로드 + 처리 수동 시작 (단일 추론 - 배치 비교용) */
    startEmbeddingServiceSingle: (mode?: "auto" | "coreml" | "cpu"): Promise<{ ok: true }> =>
      ipcRenderer.invoke("embedding:startServiceSingle", mode ?? "auto"),

    /** 모든 임베딩 삭제 (개발 도구용) */
    clearAllEmbeddings: (): Promise<{ ok: true }> =>
      ipcRenderer.invoke("embedding:clearAll"),

    /** 모든 임베딩 초기화 후 전체 재생성 */
    resetAndRegenerateEmbeddings: (): Promise<{ ok: true }> =>
      ipcRenderer.invoke("embedding:resetAndRegenerate"),

    /** 채팅 유사도 검색 (context 포함) */
    searchEmbeddingChats: (
      queryText: string,
      limit?: number,
    ): Promise<
      Array<{
        threadId: string;
        threadTitle: string;
        messageId: string;
        messageSnippet: string;
        score: number;
      }>
    > => ipcRenderer.invoke("embedding:searchChats", queryText, limit),

    /** 노트 유사도 검색 */
    searchEmbeddingNotes: (
      queryText: string,
      limit?: number,
    ): Promise<Array<{ noteId: string; score: number }>> =>
      ipcRenderer.invoke("embedding:searchNotes", queryText, limit),

    /** 임베딩 마이그레이션 진행률 이벤트 구독/해제 */
    onEmbeddingMigrationProgress: (
      callback: (progress: { done: number; total: number }) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        progress: { done: number; total: number },
      ) => callback(progress);
      ipcRenderer.on("embedding:migrationProgress", handler);
      return () =>
        ipcRenderer.removeListener("embedding:migrationProgress", handler);
    },

    /** 임베딩 서비스 상태 변화 구독 (isProcessing, pendingCount 등) */
    onEmbeddingStatusChanged: (
      callback: (status: {
        isProcessing: boolean;
        pendingCount: number;
        embeddingCount: number;
        modelLoaded: boolean;
      }) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        status: {
          isProcessing: boolean;
          pendingCount: number;
          embeddingCount: number;
          modelLoaded: boolean;
        },
      ) => callback(status);
      ipcRenderer.on("embedding:statusChanged", handler);
      return () =>
        ipcRenderer.removeListener("embedding:statusChanged", handler);
    },
  });
}
