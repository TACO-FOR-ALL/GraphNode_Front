import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { getGraphNodeHomeDirectory } from "@graphnode/paths";
import {
  getDefaultDatabaseLocation,
  readSQLiteSchema,
} from "@graphnode/storage";

type OutboxRow = {
  op_id: string;
  entity_id: string;
  entity_type: string;
  op_type: string;
  payload_json: string;
  status: "pending" | "processing";
  retry_count: number;
  next_retry_at: number;
  created_at: number;
  updated_at: number;
  last_error: string | null;
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
  return db;
}

function mapOutbox(row: OutboxRow) {
  return {
    opId: row.op_id,
    entityId: row.entity_id,
    type: row.op_type,
    payload: JSON.parse(row.payload_json),
    status: row.status,
    retryCount: row.retry_count,
    nextRetryAt: row.next_retry_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastError: row.last_error ?? undefined,
  };
}

// 단일 엔티티에 대한 대기 중인 모든 CUD 작업을 가져옵니다
export async function listSQLiteOutboxByEntityId(entityId: string) {
  const db = await openDatabase();
  try {
    const rows = db
      .prepare(
        `SELECT * FROM outbox_ops WHERE entity_id = ? ORDER BY created_at ASC`,
      )
      .all(entityId) as OutboxRow[];
    return rows.map(mapOutbox);
  } finally {
    db.close();
  }
}

// 여러 엔티티에 대한 대기 중인 모든 CUD 작업을 가져옵니다
export async function listSQLiteOutboxByEntityIds(entityIds: string[]) {
  if (entityIds.length === 0) {
    return [];
  }

  const db = await openDatabase();
  try {
    const placeholders = entityIds.map(() => "?").join(", ");
    const rows = db
      .prepare(
        `SELECT * FROM outbox_ops
         WHERE entity_id IN (${placeholders})
         ORDER BY created_at ASC`,
      )
      .all(...entityIds) as OutboxRow[];
    return rows.map(mapOutbox);
  } finally {
    db.close();
  }
}

export async function getSQLitePendingOutbox(entityId: string, type: string) {
  const db = await openDatabase();
  try {
    const row = db
      .prepare(
        `SELECT * FROM outbox_ops WHERE entity_id = ? AND op_type = ? AND status = 'pending' LIMIT 1`,
      )
      .get(entityId, type) as OutboxRow | undefined;
    return row ? mapOutbox(row) : null;
  } finally {
    db.close();
  }
}

export async function putSQLiteOutbox(op: {
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
}) {
  const db = await openDatabase();
  try {
    db.prepare(
      `INSERT INTO outbox_ops (
        op_id, entity_id, entity_type, op_type, payload_json, status,
        retry_count, next_retry_at, created_at, updated_at, last_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(op_id) DO UPDATE SET
        entity_id = excluded.entity_id,
        entity_type = excluded.entity_type,
        op_type = excluded.op_type,
        payload_json = excluded.payload_json,
        status = excluded.status,
        retry_count = excluded.retry_count,
        next_retry_at = excluded.next_retry_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        last_error = excluded.last_error`,
    ).run(
      op.opId,
      op.entityId,
      op.entityType,
      op.type,
      JSON.stringify(op.payload),
      op.status,
      op.retryCount,
      op.nextRetryAt,
      op.createdAt,
      op.updatedAt,
      op.lastError ?? null,
    );
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function updateSQLiteOutbox(
  opId: string,
  updates: Record<string, unknown>,
) {
  const db = await openDatabase();
  try {
    const existing = db
      .prepare(`SELECT * FROM outbox_ops WHERE op_id = ?`)
      .get(opId) as OutboxRow | undefined;
    if (!existing) return { ok: false };

    const merged = {
      ...mapOutbox(existing),
      ...updates,
    };

    await putSQLiteOutbox({
      opId: merged.opId,
      entityId: merged.entityId,
      entityType: existing.entity_type,
      type: merged.type,
      payload: merged.payload,
      status: merged.status,
      retryCount: merged.retryCount,
      nextRetryAt: merged.nextRetryAt,
      createdAt: merged.createdAt,
      updatedAt: merged.updatedAt,
      lastError: merged.lastError,
    });

    return { ok: true };
  } finally {
    db.close();
  }
}

export async function deleteSQLiteOutbox(opId: string) {
  const db = await openDatabase();
  try {
    db.prepare(`DELETE FROM outbox_ops WHERE op_id = ?`).run(opId);
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function bulkDeleteSQLiteOutbox(opIds: string[]) {
  const db = await openDatabase();
  try {
    db.exec("BEGIN");
    const stmt = db.prepare(`DELETE FROM outbox_ops WHERE op_id = ?`);
    for (const opId of opIds) stmt.run(opId);
    db.exec("COMMIT");
    return { ok: true, count: opIds.length };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export async function requeueStaleSQLiteOutbox(now: number) {
  const db = await openDatabase();
  try {
    db.prepare(
      `UPDATE outbox_ops
       SET status = 'pending', next_retry_at = ?, updated_at = ?
       WHERE status = 'processing' AND updated_at < ?`,
    ).run(now, now, now - 60_000);
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function listSQLitePendingOutboxDue(now: number, limit: number) {
  const db = await openDatabase();
  try {
    const rows = db
      .prepare(
        `SELECT * FROM outbox_ops
         WHERE status = 'pending' AND next_retry_at <= ?
         ORDER BY next_retry_at ASC, created_at ASC
         LIMIT ?`,
      )
      .all(now, limit) as OutboxRow[];
    return rows.map(mapOutbox);
  } finally {
    db.close();
  }
}

export async function replaceSQLiteOutboxEntityId(
  oldEntityId: string,
  newEntityId: string,
) {
  const db = await openDatabase();
  try {
    db.prepare(
      `UPDATE outbox_ops
       SET entity_id = ?, updated_at = ?
       WHERE entity_id = ?`,
    ).run(newEntityId, Date.now(), oldEntityId);
    return { ok: true };
  } finally {
    db.close();
  }
}

export async function deleteSQLiteOutboxByEntityType(entityType: string) {
  const db = await openDatabase();
  try {
    const result = db
      .prepare(`DELETE FROM outbox_ops WHERE entity_type = ?`)
      .run(entityType);
    return { ok: true, count: Number(result.changes ?? 0) };
  } finally {
    db.close();
  }
}
