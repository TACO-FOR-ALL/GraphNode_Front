import { ipcMain } from "electron";
import {
  getCliNotesDirectory,
  getGraphNodeHomeDirectory,
} from "@graphnode/paths";
import {
  applyStartupSyncToSQLite,
  bulkDeleteSQLiteNotes,
  bulkDeleteSQLiteFolders,
  bulkDeleteSQLiteThreads,
  bulkUpsertSQLiteNotes,
  bulkUpsertSQLiteFolders,
  bulkUpsertSQLiteThreads,
  clearSQLiteNotes,
  clearSQLiteFolders,
  clearSQLiteThreads,
  deleteSQLiteNote,
  getSQLiteNoteById,
  getSQLiteBootstrapStatus,
  getSQLiteFolderById,
  getSQLiteFoldersByParentId,
  getSQLiteThreadById,
  listSQLiteNotes,
  listSQLiteFolders,
  listSQLiteThreads,
  searchSQLiteNotes,
  searchSQLiteThreads,
  upsertSQLiteNote,
  upsertSQLiteFolder,
  upsertSQLiteThread,
} from "../sqlite/startupSync";
import {
  bulkDeleteSQLiteOutbox,
  deleteSQLiteOutboxByEntityType,
  deleteSQLiteOutbox,
  getSQLitePendingOutbox,
  listSQLiteOutboxByEntityId,
  listSQLiteOutboxByEntityIds,
  listSQLitePendingOutboxDue,
  putSQLiteOutbox,
  replaceSQLiteOutboxEntityId,
  requeueStaleSQLiteOutbox,
  updateSQLiteOutbox,
} from "../sqlite/outbox";
import {
  bulkDeleteExpiredSQLiteTrash,
  clearSQLiteTrash,
  deleteSQLiteTrashedFolder,
  deleteSQLiteTrashedNote,
  deleteSQLiteTrashedThread,
  getSQLiteTrashedFolderById,
  getSQLiteTrashedNoteById,
  getSQLiteTrashedThreadById,
  listSQLiteTrashedFolders,
  listSQLiteTrashedNotes,
  listSQLiteTrashedThreads,
  upsertSQLiteTrashedFolder,
  upsertSQLiteTrashedNote,
  upsertSQLiteTrashedThread,
} from "../sqlite/trash";
import {
  exportSQLiteNotesToDirectory,
  exportSQLiteThreadsToDirectory,
} from "../sqlite/exportData";
import {
  getCliInstallStatus,
  installBundledCli,
} from "../cli/installCli";

export default function graphNodeIPC() {
  ipcMain.handle("graphnode:getPaths", async () => ({
    home: getGraphNodeHomeDirectory(),
    cliNotes: getCliNotesDirectory(),
  }));

  ipcMain.handle("graphnode:getCliInstallStatus", async () =>
    getCliInstallStatus(),
  );
  ipcMain.handle("graphnode:installBundledCli", async () => installBundledCli());
  ipcMain.handle("graphnode:getSQLiteStatus", async () =>
    getSQLiteBootstrapStatus(),
  );
  ipcMain.handle("graphnode:listSQLiteNotes", async () => listSQLiteNotes());
  ipcMain.handle("graphnode:listSQLiteFolders", async () => listSQLiteFolders());
  ipcMain.handle("graphnode:listSQLiteThreads", async () => listSQLiteThreads());
  ipcMain.handle("graphnode:getSQLiteNoteById", async (_, id: string) =>
    getSQLiteNoteById(id),
  );
  ipcMain.handle("graphnode:getSQLiteFolderById", async (_, id: string) =>
    getSQLiteFolderById(id),
  );
  ipcMain.handle("graphnode:getSQLiteFoldersByParentId", async (_, parentId: string | null) =>
    getSQLiteFoldersByParentId(parentId),
  );
  ipcMain.handle("graphnode:getSQLiteThreadById", async (_, id: string) =>
    getSQLiteThreadById(id),
  );
  ipcMain.handle("graphnode:searchSQLiteNotes", async (_, query: string) =>
    searchSQLiteNotes(query),
  );
  ipcMain.handle("graphnode:searchSQLiteThreads", async (_, query: string) =>
    searchSQLiteThreads(query),
  );
  ipcMain.handle("graphnode:upsertSQLiteNote", async (_, note) =>
    upsertSQLiteNote(note),
  );
  ipcMain.handle("graphnode:upsertSQLiteFolder", async (_, folder) =>
    upsertSQLiteFolder(folder),
  );
  ipcMain.handle("graphnode:upsertSQLiteThread", async (_, thread) =>
    upsertSQLiteThread(thread),
  );
  ipcMain.handle("graphnode:bulkUpsertSQLiteNotes", async (_, notes) =>
    bulkUpsertSQLiteNotes(notes),
  );
  ipcMain.handle("graphnode:bulkUpsertSQLiteFolders", async (_, folders) =>
    bulkUpsertSQLiteFolders(folders),
  );
  ipcMain.handle("graphnode:bulkUpsertSQLiteThreads", async (_, threads) =>
    bulkUpsertSQLiteThreads(threads),
  );
  ipcMain.handle("graphnode:deleteSQLiteNote", async (_, id: string) =>
    deleteSQLiteNote(id),
  );
  ipcMain.handle("graphnode:bulkDeleteSQLiteNotes", async (_, ids: string[]) =>
    bulkDeleteSQLiteNotes(ids),
  );
  ipcMain.handle("graphnode:bulkDeleteSQLiteFolders", async (_, ids: string[]) =>
    bulkDeleteSQLiteFolders(ids),
  );
  ipcMain.handle("graphnode:bulkDeleteSQLiteThreads", async (_, ids: string[]) =>
    bulkDeleteSQLiteThreads(ids),
  );
  ipcMain.handle("graphnode:clearSQLiteNotes", async () => clearSQLiteNotes());
  ipcMain.handle("graphnode:clearSQLiteFolders", async () => clearSQLiteFolders());
  ipcMain.handle("graphnode:clearSQLiteThreads", async () => clearSQLiteThreads());
  ipcMain.handle("graphnode:listSQLiteOutboxByEntityId", async (_, entityId: string) =>
    listSQLiteOutboxByEntityId(entityId),
  );
  ipcMain.handle("graphnode:listSQLiteOutboxByEntityIds", async (_, entityIds: string[]) =>
    listSQLiteOutboxByEntityIds(entityIds),
  );
  ipcMain.handle("graphnode:getSQLitePendingOutbox", async (_, entityId: string, type: string) =>
    getSQLitePendingOutbox(entityId, type),
  );
  ipcMain.handle("graphnode:putSQLiteOutbox", async (_, op) =>
    putSQLiteOutbox(op),
  );
  ipcMain.handle("graphnode:updateSQLiteOutbox", async (_, opId: string, updates) =>
    updateSQLiteOutbox(opId, updates),
  );
  ipcMain.handle("graphnode:deleteSQLiteOutbox", async (_, opId: string) =>
    deleteSQLiteOutbox(opId),
  );
  ipcMain.handle("graphnode:bulkDeleteSQLiteOutbox", async (_, opIds: string[]) =>
    bulkDeleteSQLiteOutbox(opIds),
  );
  ipcMain.handle("graphnode:deleteSQLiteOutboxByEntityType", async (_, entityType: string) =>
    deleteSQLiteOutboxByEntityType(entityType),
  );
  ipcMain.handle("graphnode:requeueStaleSQLiteOutbox", async (_, now: number) =>
    requeueStaleSQLiteOutbox(now),
  );
  ipcMain.handle("graphnode:listSQLitePendingOutboxDue", async (_, now: number, limit: number) =>
    listSQLitePendingOutboxDue(now, limit),
  );
  ipcMain.handle("graphnode:replaceSQLiteOutboxEntityId", async (_, oldEntityId: string, newEntityId: string) =>
    replaceSQLiteOutboxEntityId(oldEntityId, newEntityId),
  );
  ipcMain.handle("graphnode:listSQLiteTrashedNotes", async () =>
    listSQLiteTrashedNotes(),
  );
  ipcMain.handle("graphnode:listSQLiteTrashedThreads", async () =>
    listSQLiteTrashedThreads(),
  );
  ipcMain.handle("graphnode:listSQLiteTrashedFolders", async () =>
    listSQLiteTrashedFolders(),
  );
  ipcMain.handle("graphnode:getSQLiteTrashedNoteById", async (_, id: string) =>
    getSQLiteTrashedNoteById(id),
  );
  ipcMain.handle("graphnode:getSQLiteTrashedThreadById", async (_, id: string) =>
    getSQLiteTrashedThreadById(id),
  );
  ipcMain.handle("graphnode:getSQLiteTrashedFolderById", async (_, id: string) =>
    getSQLiteTrashedFolderById(id),
  );
  ipcMain.handle("graphnode:upsertSQLiteTrashedNote", async (_, trashedNote) =>
    upsertSQLiteTrashedNote(trashedNote),
  );
  ipcMain.handle("graphnode:upsertSQLiteTrashedThread", async (_, trashedThread) =>
    upsertSQLiteTrashedThread(trashedThread),
  );
  ipcMain.handle("graphnode:upsertSQLiteTrashedFolder", async (_, trashedFolder) =>
    upsertSQLiteTrashedFolder(trashedFolder),
  );
  ipcMain.handle("graphnode:deleteSQLiteTrashedNote", async (_, id: string) =>
    deleteSQLiteTrashedNote(id),
  );
  ipcMain.handle("graphnode:deleteSQLiteTrashedThread", async (_, id: string) =>
    deleteSQLiteTrashedThread(id),
  );
  ipcMain.handle("graphnode:deleteSQLiteTrashedFolder", async (_, id: string) =>
    deleteSQLiteTrashedFolder(id),
  );
  ipcMain.handle("graphnode:clearSQLiteTrash", async () => clearSQLiteTrash());
  ipcMain.handle("graphnode:bulkDeleteExpiredSQLiteTrash", async (_, now: number) =>
    bulkDeleteExpiredSQLiteTrash(now),
  );
  ipcMain.handle("graphnode:exportSQLiteNotesToDirectory", async (_, notes) =>
    exportSQLiteNotesToDirectory(notes),
  );
  ipcMain.handle("graphnode:exportSQLiteThreadsToDirectory", async (_, threads) =>
    exportSQLiteThreadsToDirectory(threads),
  );
  ipcMain.handle("graphnode:applyStartupSync", async (_, payload) =>
    applyStartupSyncToSQLite(payload),
  );
}
