import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getGraphNodeHomeDirectory } from "@graphnode/paths";
import {
  SQLITE_BOOTSTRAP_STATE_KEY,
  SQLITE_SYNC_CURSOR_KEY,
} from "./sync-bootstrap";
import { getDefaultDatabaseLocation, readSQLiteSchema } from "./sqlite-plan";

interface SQLiteBootstrapMeta {
  state: string;
  lastServerTime: string | null;
  lastBootstrappedAt: string | null;
}

interface SQLiteCursorMeta {
  cursor: string | null;
}

export interface SQLiteNoteRecord {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SQLiteStatus {
  databasePath: string;
  bootstrap: SQLiteBootstrapMeta | null;
  cursor: SQLiteCursorMeta | null;
  counts: {
    notes: number;
  };
}

interface SQLiteMetaRow {
  value_json: string;
}

interface SQLiteCountRow {
  count?: number;
}

interface SQLiteNoteRow {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  created_at: number;
  updated_at: number;
}

// DB 경로를 결정합니다
function resolveDatabasePath(dbPath?: string): string {
  return dbPath ?? getDefaultDatabaseLocation(getGraphNodeHomeDirectory());
}

// DB의 NOTE TABLE에서 사용되는 row 형태에로 변환하는 Mapper입니다
function mapSQLiteNote(row: SQLiteNoteRow): SQLiteNoteRecord {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    folderId: row.folder_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// DB 실행 보장 함수입니다
async function openDatabase(
  dbPath?: string,
): Promise<{ db: DatabaseSync; resolvedPath: string }> {
  const resolvedPath = resolveDatabasePath(dbPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true }); // 디렉토리가 없으면 생성, 있으면 패스

  const db = new DatabaseSync(resolvedPath); // 기존 DB가 있으면 열고, 없으면 생성
  db.exec(await readSQLiteSchema()); // 필요한 테이블, 인덱스가 없으면 생성

  return { db, resolvedPath };
}

// CLI에서 graphnode sqlite status가 의존하는 함수입니다
// app_meta(앱 내부 상태 저장 테이블)에서 bootstrap 상태(SQL 초기 준비 상태)와 cursor(로컬에서 마지막으로 진행된 동기화 시점)를 읽고, notes 개수까지 계산해서 반환합니다
export async function getSQLiteStatus(dbPath?: string): Promise<SQLiteStatus> {
  const { db, resolvedPath } = await openDatabase(dbPath);

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

    const noteCountRow = db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM notes
          WHERE deleted_at IS NULL
        `,
      )
      .get() as SQLiteCountRow | undefined;

    return {
      databasePath: resolvedPath,
      bootstrap: bootstrapRow
        ? (JSON.parse(bootstrapRow.value_json) as SQLiteBootstrapMeta)
        : null,
      cursor: cursorRow
        ? (JSON.parse(cursorRow.value_json) as SQLiteCursorMeta)
        : null,
      counts: {
        notes: Number(noteCountRow?.count ?? 0),
      },
    };
  } finally {
    db.close();
  }
}

export async function listSQLiteNotes(
  dbPath?: string,
): Promise<SQLiteNoteRecord[]> {
  const { db } = await openDatabase(dbPath);

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
      .all() as unknown as SQLiteNoteRow[];

    return rows.map(mapSQLiteNote);
  } finally {
    db.close();
  }
}

export async function getSQLiteNoteById(
  id: string,
  dbPath?: string,
): Promise<SQLiteNoteRecord | null> {
  const { db } = await openDatabase(dbPath);

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

    if (!row) {
      return null;
    }

    return mapSQLiteNote(row);
  } finally {
    db.close();
  }
}

export async function searchSQLiteNotes(
  query: string,
  dbPath?: string,
): Promise<SQLiteNoteRecord[]> {
  const { db } = await openDatabase(dbPath);

  try {
    const rows = db
      .prepare(
        `
          SELECT id, title, content, folder_id, created_at, updated_at
          FROM notes
          WHERE deleted_at IS NULL
            AND (
              LOWER(title) LIKE '%' || LOWER(?) || '%'
              OR LOWER(content) LIKE '%' || LOWER(?) || '%'
              OR id = ?
            )
          ORDER BY updated_at DESC
        `,
      )
      .all(query, query, query) as unknown as SQLiteNoteRow[];

    return rows.map(mapSQLiteNote);
  } finally {
    db.close();
  }
}

export async function upsertSQLiteNote(
  note: SQLiteNoteRecord,
  dbPath?: string,
): Promise<SQLiteNoteRecord> {
  const { db } = await openDatabase(dbPath);

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

    return note;
  } finally {
    db.close();
  }
}

export async function softDeleteSQLiteNote(
  id: string,
  dbPath?: string,
): Promise<void> {
  const { db } = await openDatabase(dbPath);

  try {
    db.prepare(
      `
        UPDATE notes
        SET deleted_at = ?
        WHERE id = ?
      `,
    ).run(Date.now(), id);
  } finally {
    db.close();
  }
}
