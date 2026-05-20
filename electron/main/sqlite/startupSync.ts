import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getGraphNodeHomeDirectory } from "@graphnode/paths";
import {
  applySQLiteCompatibilityMigrations,
  SQLITE_BOOTSTRAP_STATE_KEY,
  SQLITE_SYNC_CURSOR_KEY,
  createBootstrapMeta,
  readSQLiteSchema,
} from "@graphnode/storage";
import { getActiveUserId } from "./activeUser";

type SyncedNote = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
};

type SyncedFolder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
};

type SyncedThread = {
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
};

type SQLiteThreadMessage = SyncedThread["messages"][number];

type SQLiteFolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: number;
  updated_at: number;
};

type SQLiteThreadRow = {
  id: string;
  title: string;
  updated_at: number;
  deleted_at?: number | null;
};

type SQLiteLegacyThreadRow = SQLiteThreadRow & {
  messages_json: string;
};

type SQLiteThreadMessageRow = {
  id: string;
  thread_id: string;
  message_index: number;
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
  temp: number;
};

type SQLiteMetaRow = {
  value_json: string;
};

type SQLiteNoteRow = {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  created_at: number;
  updated_at: number;
};

type SQLiteNoteInput = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type SQLiteStartupSyncPayload = {
  notes: { upserts: SyncedNote[]; deleteIds: string[] };
  folders: { upserts: SyncedFolder[]; deleteIds: string[] };
  threads: { upserts: SyncedThread[]; deleteIds: string[] };
  serverTime: string;
};

function sortFoldersTopologically<T extends { id: string; parentId: string | null }>(folders: T[]): T[] {
  const map = new Map(folders.map((f) => [f.id, f]));
  const result: T[] = [];
  const visited = new Set<string>();

  function visit(folder: T) {
    if (visited.has(folder.id)) return;
    if (folder.parentId && map.has(folder.parentId)) {
      visit(map.get(folder.parentId)!);
    }
    visited.add(folder.id);
    result.push(folder);
  }

  for (const folder of folders) visit(folder);
  return result;
}

let startupSchemaPromise: Promise<string> | null = null;

function getDatabasePath() {
  const userId = getActiveUserId();
  if (!userId) throw new Error("No active user. SQLite cannot be opened before login.");
  return path.join(getGraphNodeHomeDirectory(), "users", userId, "graphnode.db");
}

async function getSchema() {
  if (!startupSchemaPromise) {
    startupSchemaPromise = readSQLiteSchema();
  }

  return startupSchemaPromise;
}

async function openDatabase() {
  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(await getSchema());
  applySQLiteCompatibilityMigrations(db);
  migrateLegacyThreadMessages(db);
  return db;
}

function mapSQLiteNote(row: SQLiteNoteRow) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    folderId: row.folder_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSQLiteFolder(row: SQLiteFolderRow) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSQLiteThread(row: SQLiteThreadRow) {
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function mapSQLiteThreadMessage(row: SQLiteThreadMessageRow): SQLiteThreadMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    ts: row.ts,
    ...(row.temp ? { temp: true } : {}),
  };
}

function hasLegacyMessagesJsonColumn(db: DatabaseSync) {
  const columns = db.prepare(`PRAGMA table_info(threads)`).all() as Array<{
    name: string;
  }>;

  return columns.some((column) => column.name === "messages_json");
}

function prepareThreadUpsertStatement(
  db: DatabaseSync,
  includeLegacyMessagesJson = hasLegacyMessagesJsonColumn(db),
) {
  if (includeLegacyMessagesJson) {
    return db.prepare(`
      INSERT INTO threads (id, title, updated_at, deleted_at, messages_json)
      VALUES (?, ?, ?, NULL, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        updated_at = excluded.updated_at,
        deleted_at = NULL,
        messages_json = excluded.messages_json
    `);
  }

  return db.prepare(`
    INSERT INTO threads (id, title, updated_at, deleted_at)
    VALUES (?, ?, ?, NULL)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      updated_at = excluded.updated_at,
      deleted_at = NULL
  `);
}

function runThreadUpsert(
  stmt: ReturnType<DatabaseSync["prepare"]>,
  thread: SyncedThread,
  includeLegacyMessagesJson: boolean,
) {
  if (includeLegacyMessagesJson) {
    stmt.run(
      thread.id,
      thread.title,
      thread.updatedAt,
      JSON.stringify(thread.messages),
    );
    return;
  }

  stmt.run(thread.id, thread.title, thread.updatedAt);
}

function replaceThreadMessages(
  db: DatabaseSync,
  threadId: string,
  messages: SQLiteThreadMessage[],
) {
  db.prepare(`DELETE FROM thread_messages WHERE thread_id = ?`).run(threadId);

  const insertMessage = db.prepare(`
    INSERT INTO thread_messages (id, thread_id, message_index, role, content, ts, temp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  messages.forEach((message, index) => {
    insertMessage.run(
      message.id,
      threadId,
      index,
      message.role,
      message.content,
      message.ts,
      message.temp ? 1 : 0,
    );
  });
}

function migrateLegacyThreadMessages(db: DatabaseSync) {
  if (!hasLegacyMessagesJsonColumn(db)) {
    return;
  }

  const legacyRows = db.prepare(`
    SELECT t.id, t.title, t.updated_at, t.deleted_at, t.messages_json
    FROM threads t
    WHERE NOT EXISTS (
      SELECT 1
      FROM thread_messages tm
      WHERE tm.thread_id = t.id
    )
      AND t.messages_json IS NOT NULL
  `).all() as SQLiteLegacyThreadRow[];

  if (legacyRows.length === 0) {
    return;
  }

  db.exec("BEGIN");

  try {
    for (const row of legacyRows) {
      const messages = JSON.parse(row.messages_json) as SQLiteThreadMessage[];
      replaceThreadMessages(db, row.id, messages);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function getThreadMessages(db: DatabaseSync, threadId: string): SQLiteThreadMessage[] {
  const rows = db.prepare(`
    SELECT id, thread_id, message_index, role, content, ts, temp
    FROM thread_messages
    WHERE thread_id = ?
    ORDER BY message_index ASC
  `).all(threadId) as SQLiteThreadMessageRow[];

  return rows.map(mapSQLiteThreadMessage);
}

function mapSQLiteThreadWithMessages(db: DatabaseSync, row: SQLiteThreadRow) {
  return {
    ...mapSQLiteThread(row),
    messages: getThreadMessages(db, row.id),
  };
}

export async function applyStartupSyncToSQLite(
  payload: SQLiteStartupSyncPayload,
) {
  const db = await openDatabase();

  try {
    db.exec("BEGIN");

    const upsertNote = db.prepare(`
      INSERT INTO notes (id, title, content, folder_id, created_at, updated_at, deleted_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        content = excluded.content,
        folder_id = excluded.folder_id,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        deleted_at = NULL
    `);
    const deleteNote = db.prepare(`
      UPDATE notes
      SET deleted_at = ?
      WHERE id = ?
    `);

    payload.notes.upserts.forEach((note) => {
      upsertNote.run(
        note.id,
        note.title,
        note.content,
        note.folderId,
        note.createdAt,
        note.updatedAt,
      );
    });
    payload.notes.deleteIds.forEach((id) => {
      deleteNote.run(Date.now(), id);
    });

    const upsertFolder = db.prepare(`
      INSERT INTO folders (id, name, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        parent_id = excluded.parent_id,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
    `);
    const deleteFolder = db.prepare(`DELETE FROM folders WHERE id = ?`);

    sortFoldersTopologically(payload.folders.upserts).forEach((folder) => {
      upsertFolder.run(
        folder.id,
        folder.name,
        folder.parentId,
        folder.createdAt,
        folder.updatedAt,
      );
    });
    payload.folders.deleteIds.forEach((id) => {
      deleteFolder.run(id);
    });

    const includeLegacyMessagesJson = hasLegacyMessagesJsonColumn(db);
    const upsertThread = prepareThreadUpsertStatement(
      db,
      includeLegacyMessagesJson,
    );
    const deleteThread = db.prepare(`
      UPDATE threads
      SET deleted_at = ?
      WHERE id = ?
    `);

    payload.threads.upserts.forEach((thread) => {
      runThreadUpsert(upsertThread, thread, includeLegacyMessagesJson);
      replaceThreadMessages(db, thread.id, thread.messages);
    });
    payload.threads.deleteIds.forEach((id) => {
      deleteThread.run(Date.now(), id);
    });

    const upsertMeta = db.prepare(`
      INSERT INTO app_meta (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `);

    upsertMeta.run(
      SQLITE_SYNC_CURSOR_KEY,
      JSON.stringify({ serverTime: payload.serverTime }),
      Date.now(),
    );
    upsertMeta.run(
      SQLITE_BOOTSTRAP_STATE_KEY,
      JSON.stringify(
        createBootstrapMeta({
          state: "bootstrapped",
          lastServerTime: payload.serverTime,
          lastBootstrappedAt: new Date().toISOString(),
        }),
      ),
      Date.now(),
    );

    db.exec("COMMIT");

    return {
      databasePath: getDatabasePath(),
      synced: {
        notes: payload.notes.upserts.length,
        noteDeletes: payload.notes.deleteIds.length,
        folders: payload.folders.upserts.length,
        folderDeletes: payload.folders.deleteIds.length,
        threads: payload.threads.upserts.length,
        threadDeletes: payload.threads.deleteIds.length,
      },
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export async function getSQLiteBootstrapStatus() {
  const db = await openDatabase();

  try {
    const bootstrapRow = db
      .prepare(
        `
          SELECT value_json
          FROM app_meta
          WHERE key = ?
        `,
      )
      .get(SQLITE_BOOTSTRAP_STATE_KEY) as SQLiteMetaRow | undefined;

    const cursorRow = db
      .prepare(
        `
          SELECT value_json
          FROM app_meta
          WHERE key = ?
        `,
      )
      .get(SQLITE_SYNC_CURSOR_KEY) as SQLiteMetaRow | undefined;

    return {
      databasePath: getDatabasePath(),
      bootstrap: bootstrapRow ? JSON.parse(bootstrapRow.value_json) : null,
      cursor: cursorRow ? JSON.parse(cursorRow.value_json) : null,
    };
  } finally {
    db.close();
  }
}

export async function listSQLiteNotes() {
  const db = await openDatabase();

  try {
    const rows = db
      .prepare(
        `
          SELECT id, title, content, folder_id, created_at, updated_at
          FROM notes
          WHERE deleted_at IS NULL
          ORDER BY updated_at DESC
        `,
      )
      .all() as SQLiteNoteRow[];

    return rows.map(mapSQLiteNote);
  } finally {
    db.close();
  }
}

export async function getSQLiteNoteById(id: string) {
  const db = await openDatabase();

  try {
    const row = db
      .prepare(
        `
          SELECT id, title, content, folder_id, created_at, updated_at
          FROM notes
          WHERE id = ? AND deleted_at IS NULL
        `,
      )
      .get(id) as SQLiteNoteRow | undefined;

    return row ? mapSQLiteNote(row) : null;
  } finally {
    db.close();
  }
}

export async function searchSQLiteNotes(query: string) {
  const db = await openDatabase();

  try {
    const rows = db
      .prepare(
        `
          SELECT id, title, content, folder_id, created_at, updated_at
          FROM notes
          WHERE deleted_at IS NULL
            AND LOWER(content) LIKE '%' || LOWER(?) || '%'
          ORDER BY updated_at DESC
        `,
      )
      .all(query) as SQLiteNoteRow[];

    return rows.map(mapSQLiteNote);
  } finally {
    db.close();
  }
}

export async function upsertSQLiteNote(note: SQLiteNoteInput) {
  const db = await openDatabase();

  try {
    db.prepare(
      `
        INSERT INTO notes (id, title, content, folder_id, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          content = excluded.content,
          folder_id = excluded.folder_id,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = NULL
      `,
    ).run(
      note.id,
      note.title,
      note.content,
      note.folderId,
      note.createdAt,
      note.updatedAt,
    );

    return {
      ok: true,
      note,
    };
  } finally {
    db.close();
  }
}

export async function bulkUpsertSQLiteNotes(notes: SQLiteNoteInput[]) {
  const db = await openDatabase();

  try {
    db.exec("BEGIN");
    const stmt = db.prepare(
      `
        INSERT INTO notes (id, title, content, folder_id, created_at, updated_at, deleted_at)
        VALUES (?, ?, ?, ?, ?, ?, NULL)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          content = excluded.content,
          folder_id = excluded.folder_id,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          deleted_at = NULL
      `,
    );

    for (const note of notes) {
      stmt.run(
        note.id,
        note.title,
        note.content,
        note.folderId,
        note.createdAt,
        note.updatedAt,
      );
    }

    db.exec("COMMIT");
    return { ok: true, count: notes.length };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export async function deleteSQLiteNote(id: string) {
  const db = await openDatabase();

  try {
    db.prepare(
      `
        UPDATE notes
        SET deleted_at = ?
        WHERE id = ?
      `,
    ).run(Date.now(), id);

    return { ok: true, id };
  } finally {
    db.close();
  }
}

export async function bulkDeleteSQLiteNotes(ids: string[]) {
  const db = await openDatabase();

  try {
    db.exec("BEGIN");
    const stmt = db.prepare(
      `
        UPDATE notes
        SET deleted_at = ?
        WHERE id = ?
      `,
    );

    for (const id of ids) {
      stmt.run(Date.now(), id);
    }

    db.exec("COMMIT");
    return { ok: true, count: ids.length };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export async function clearSQLiteNotes() {
  const db = await openDatabase();

  try {
    db.exec(`DELETE FROM notes`);
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function listSQLiteFolders() {
  const db = await openDatabase();
  try {
    const rows = db.prepare(`SELECT id, name, parent_id, created_at, updated_at FROM folders ORDER BY updated_at DESC`).all() as SQLiteFolderRow[];
    return rows.map(mapSQLiteFolder);
  } finally {
    db.close();
  }
}

export async function getSQLiteFolderById(id: string) {
  const db = await openDatabase();
  try {
    const row = db.prepare(`SELECT id, name, parent_id, created_at, updated_at FROM folders WHERE id = ?`).get(id) as SQLiteFolderRow | undefined;
    return row ? mapSQLiteFolder(row) : null;
  } finally {
    db.close();
  }
}

export async function getSQLiteFoldersByParentId(parentId: string | null) {
  const db = await openDatabase();
  try {
    const rows = parentId === null
      ? (db.prepare(`SELECT id, name, parent_id, created_at, updated_at FROM folders WHERE parent_id IS NULL ORDER BY updated_at DESC`).all() as SQLiteFolderRow[])
      : (db.prepare(`SELECT id, name, parent_id, created_at, updated_at FROM folders WHERE parent_id = ? ORDER BY updated_at DESC`).all(parentId) as SQLiteFolderRow[]);
    return rows.map(mapSQLiteFolder);
  } finally {
    db.close();
  }
}

export async function upsertSQLiteFolder(folder: SyncedFolder) {
  const db = await openDatabase();
  try {
    db.prepare(`INSERT INTO folders (id, name, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        parent_id = excluded.parent_id,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at`).run(folder.id, folder.name, folder.parentId, folder.createdAt, folder.updatedAt);
    return { ok: true, folder };
  } finally {
    db.close();
  }
}

export async function bulkUpsertSQLiteFolders(folders: SyncedFolder[]) {
  const db = await openDatabase();
  try {
    db.exec("BEGIN");
    const stmt = db.prepare(`INSERT INTO folders (id, name, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        parent_id = excluded.parent_id,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at`);
    for (const folder of folders) stmt.run(folder.id, folder.name, folder.parentId, folder.createdAt, folder.updatedAt);
    db.exec("COMMIT");
    return { ok: true, count: folders.length };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export async function bulkDeleteSQLiteFolders(ids: string[]) {
  const db = await openDatabase();
  try {
    db.exec("BEGIN");
    const stmt = db.prepare(`DELETE FROM folders WHERE id = ?`);
    for (const id of ids) stmt.run(id);
    db.exec("COMMIT");
    return { ok: true, count: ids.length };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export async function clearSQLiteFolders() {
  const db = await openDatabase();
  try {
    db.exec(`DELETE FROM folders`);
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function listSQLiteThreads() {
  const db = await openDatabase();
  try {
    const rows = db.prepare(`SELECT id, title, updated_at FROM threads WHERE deleted_at IS NULL ORDER BY updated_at DESC`).all() as SQLiteThreadRow[];
    return rows.map((row) => mapSQLiteThreadWithMessages(db, row));
  } finally {
    db.close();
  }
}

export async function getSQLiteThreadById(id: string) {
  const db = await openDatabase();
  try {
    const row = db.prepare(`SELECT id, title, updated_at FROM threads WHERE id = ? AND deleted_at IS NULL`).get(id) as SQLiteThreadRow | undefined;
    return row ? mapSQLiteThreadWithMessages(db, row) : null;
  } finally {
    db.close();
  }
}

export async function searchSQLiteThreads(query: string) {
  const db = await openDatabase();
  try {
    const rows = db.prepare(`
      SELECT DISTINCT t.id, t.title, t.updated_at
      FROM threads t
      JOIN thread_messages tm ON tm.thread_id = t.id
      WHERE t.deleted_at IS NULL
        AND (
          LOWER(t.title) LIKE '%' || LOWER(?) || '%'
          OR LOWER(tm.content) LIKE '%' || LOWER(?) || '%'
        )
      ORDER BY t.updated_at DESC
    `).all(query, query) as SQLiteThreadRow[];

    return rows.map((row) => mapSQLiteThreadWithMessages(db, row));
  } finally {
    db.close();
  }
}

export async function upsertSQLiteThread(thread: SyncedThread) {
  const db = await openDatabase();
  try {
    const includeLegacyMessagesJson = hasLegacyMessagesJsonColumn(db);
    const stmt = prepareThreadUpsertStatement(db, includeLegacyMessagesJson);
    runThreadUpsert(stmt, thread, includeLegacyMessagesJson);
    replaceThreadMessages(db, thread.id, thread.messages);
    return { ok: true, thread };
  } finally {
    db.close();
  }
}

export async function bulkUpsertSQLiteThreads(threads: SyncedThread[]) {
  const db = await openDatabase();
  try {
    db.exec("BEGIN");
    const includeLegacyMessagesJson = hasLegacyMessagesJsonColumn(db);
    const stmt = prepareThreadUpsertStatement(db, includeLegacyMessagesJson);
    for (const thread of threads) {
      runThreadUpsert(stmt, thread, includeLegacyMessagesJson);
      replaceThreadMessages(db, thread.id, thread.messages);
    }
    db.exec("COMMIT");
    return { ok: true, count: threads.length };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export async function bulkDeleteSQLiteThreads(ids: string[]) {
  const db = await openDatabase();
  try {
    db.exec("BEGIN");
    const stmt = db.prepare(`UPDATE threads SET deleted_at = ? WHERE id = ?`);
    const deletedAt = Date.now();
    for (const id of ids) stmt.run(deletedAt, id);
    db.exec("COMMIT");
    return { ok: true, count: ids.length };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export async function clearSQLiteThreads() {
  const db = await openDatabase();
  try {
    db.exec(`DELETE FROM thread_messages`);
    db.exec(`DELETE FROM threads`);
    return { ok: true };
  } finally {
    db.close();
  }
}
