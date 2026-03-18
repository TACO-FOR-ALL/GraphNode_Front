import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { getGraphNodeHomeDirectory } from "@graphnode/paths";
import {
  applySQLiteCompatibilityMigrations,
  getDefaultDatabaseLocation,
  readSQLiteSchema,
} from "@graphnode/storage";

type TrashedNoteRow = {
  id: string;
  original_note_json: string;
  deleted_at: number;
  expires_at: number;
};

type TrashedThreadRow = {
  id: string;
  original_thread_json: string;
  deleted_at: number;
  expires_at: number;
};

type TrashedFolderRow = {
  id: string;
  original_folder_json: string;
  note_ids_json: string;
  deleted_at: number;
  expires_at: number;
};

let schemaPromise: Promise<string> | null = null;

function getDatabasePath() {
  return getDefaultDatabaseLocation(getGraphNodeHomeDirectory());
}

async function getSchema() {
  if (!schemaPromise) {
    schemaPromise = readSQLiteSchema();
  }
  return schemaPromise;
}

async function openDatabase() {
  const dbPath = getDatabasePath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(await getSchema());
  applySQLiteCompatibilityMigrations(db);
  return db;
}

function mapTrashedNote(row: TrashedNoteRow) {
  return {
    id: row.id,
    originalNote: JSON.parse(row.original_note_json),
    deletedAt: row.deleted_at,
    expiresAt: row.expires_at,
  };
}

function mapTrashedThread(row: TrashedThreadRow) {
  return {
    id: row.id,
    originalThread: JSON.parse(row.original_thread_json),
    deletedAt: row.deleted_at,
    expiresAt: row.expires_at,
  };
}

function mapTrashedFolder(row: TrashedFolderRow) {
  return {
    id: row.id,
    originalFolder: JSON.parse(row.original_folder_json),
    noteIds: JSON.parse(row.note_ids_json),
    deletedAt: row.deleted_at,
    expiresAt: row.expires_at,
  };
}

export async function listSQLiteTrashedNotes() {
  const db = await openDatabase();
  try {
    const rows = db.prepare(
      `SELECT * FROM trashed_notes ORDER BY deleted_at DESC`,
    ).all() as TrashedNoteRow[];
    return rows.map(mapTrashedNote);
  } finally {
    db.close();
  }
}

export async function listSQLiteTrashedThreads() {
  const db = await openDatabase();
  try {
    const rows = db.prepare(
      `SELECT * FROM trashed_threads ORDER BY deleted_at DESC`,
    ).all() as TrashedThreadRow[];
    return rows.map(mapTrashedThread);
  } finally {
    db.close();
  }
}

export async function listSQLiteTrashedFolders() {
  const db = await openDatabase();
  try {
    const rows = db.prepare(
      `SELECT * FROM trashed_folders ORDER BY deleted_at DESC`,
    ).all() as TrashedFolderRow[];
    return rows.map(mapTrashedFolder);
  } finally {
    db.close();
  }
}

export async function getSQLiteTrashedNoteById(id: string) {
  const db = await openDatabase();
  try {
    const row = db.prepare(
      `SELECT * FROM trashed_notes WHERE id = ? LIMIT 1`,
    ).get(id) as TrashedNoteRow | undefined;
    return row ? mapTrashedNote(row) : null;
  } finally {
    db.close();
  }
}

export async function getSQLiteTrashedThreadById(id: string) {
  const db = await openDatabase();
  try {
    const row = db.prepare(
      `SELECT * FROM trashed_threads WHERE id = ? LIMIT 1`,
    ).get(id) as TrashedThreadRow | undefined;
    return row ? mapTrashedThread(row) : null;
  } finally {
    db.close();
  }
}

export async function getSQLiteTrashedFolderById(id: string) {
  const db = await openDatabase();
  try {
    const row = db.prepare(
      `SELECT * FROM trashed_folders WHERE id = ? LIMIT 1`,
    ).get(id) as TrashedFolderRow | undefined;
    return row ? mapTrashedFolder(row) : null;
  } finally {
    db.close();
  }
}

export async function upsertSQLiteTrashedNote(trashedNote: {
  id: string;
  originalNote: unknown;
  deletedAt: number;
  expiresAt: number;
}) {
  const db = await openDatabase();
  try {
    db.prepare(
      `INSERT INTO trashed_notes (id, original_note_json, deleted_at, expires_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         original_note_json = excluded.original_note_json,
         deleted_at = excluded.deleted_at,
         expires_at = excluded.expires_at`,
    ).run(
      trashedNote.id,
      JSON.stringify(trashedNote.originalNote),
      trashedNote.deletedAt,
      trashedNote.expiresAt,
    );
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function upsertSQLiteTrashedThread(trashedThread: {
  id: string;
  originalThread: unknown;
  deletedAt: number;
  expiresAt: number;
}) {
  const db = await openDatabase();
  try {
    db.prepare(
      `INSERT INTO trashed_threads (id, original_thread_json, deleted_at, expires_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         original_thread_json = excluded.original_thread_json,
         deleted_at = excluded.deleted_at,
         expires_at = excluded.expires_at`,
    ).run(
      trashedThread.id,
      JSON.stringify(trashedThread.originalThread),
      trashedThread.deletedAt,
      trashedThread.expiresAt,
    );
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function upsertSQLiteTrashedFolder(trashedFolder: {
  id: string;
  originalFolder: unknown;
  noteIds: string[];
  deletedAt: number;
  expiresAt: number;
}) {
  const db = await openDatabase();
  try {
    db.prepare(
      `INSERT INTO trashed_folders (id, original_folder_json, note_ids_json, deleted_at, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         original_folder_json = excluded.original_folder_json,
         note_ids_json = excluded.note_ids_json,
         deleted_at = excluded.deleted_at,
         expires_at = excluded.expires_at`,
    ).run(
      trashedFolder.id,
      JSON.stringify(trashedFolder.originalFolder),
      JSON.stringify(trashedFolder.noteIds),
      trashedFolder.deletedAt,
      trashedFolder.expiresAt,
    );
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function deleteSQLiteTrashedNote(id: string) {
  const db = await openDatabase();
  try {
    db.prepare(`DELETE FROM trashed_notes WHERE id = ?`).run(id);
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function deleteSQLiteTrashedThread(id: string) {
  const db = await openDatabase();
  try {
    db.prepare(`DELETE FROM trashed_threads WHERE id = ?`).run(id);
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function deleteSQLiteTrashedFolder(id: string) {
  const db = await openDatabase();
  try {
    db.prepare(`DELETE FROM trashed_folders WHERE id = ?`).run(id);
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function clearSQLiteTrash() {
  const db = await openDatabase();
  try {
    db.exec(`
      DELETE FROM trashed_notes;
      DELETE FROM trashed_threads;
      DELETE FROM trashed_folders;
    `);
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function bulkDeleteExpiredSQLiteTrash(now: number) {
  const db = await openDatabase();
  try {
    db.exec("BEGIN");
    db.prepare(`DELETE FROM trashed_notes WHERE expires_at < ?`).run(now);
    db.prepare(`DELETE FROM trashed_threads WHERE expires_at < ?`).run(now);
    db.prepare(`DELETE FROM trashed_folders WHERE expires_at < ?`).run(now);
    db.exec("COMMIT");
    return { ok: true };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}
