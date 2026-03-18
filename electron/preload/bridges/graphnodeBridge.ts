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
  });
}
