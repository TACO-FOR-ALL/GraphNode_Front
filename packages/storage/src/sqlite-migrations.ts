import type { DatabaseSync } from "node:sqlite";

const SQLITE_COMPAT_MIGRATION_VERSION_KEY = "sqlite.compat.migration.version";
const CURRENT_COMPAT_MIGRATION_VERSION = 1; // 마이그레이션 필요시 버전 승격 필요

// 현재 DB에 저장된 migration 버전을 읽습니다
function getCurrentCompatibilityMigrationVersion(db: DatabaseSync): number {
  const row = db
    .prepare(
      `
        SELECT value_json
        FROM app_meta
        WHERE key = ?
      `,
    )
    .get(SQLITE_COMPAT_MIGRATION_VERSION_KEY) as
    | { value_json: string }
    | undefined;

  if (!row) {
    return 0;
  }

  try {
    const parsed = JSON.parse(row.value_json) as { version?: number };
    return Number(parsed.version ?? 0);
  } catch {
    return 0;
  }
}

// 현재 DB에 migration 버전을 DB에 기록합니다
function setCompatibilityMigrationVersion(
  db: DatabaseSync,
  version: number,
): void {
  db.prepare(
    `
      INSERT INTO app_meta (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `,
  ).run(
    SQLITE_COMPAT_MIGRATION_VERSION_KEY,
    JSON.stringify({ version }),
    Date.now(),
  );
}

// 현재 런타임 스키마에서 제거된 예전 실험 테이블/인덱스를 정리합니다 (마이그레이션 시 내용 업데이트 필요)
export function applySQLiteCompatibilityMigrations(db: DatabaseSync): void {
  const currentVersion = getCurrentCompatibilityMigrationVersion(db);

  if (currentVersion >= CURRENT_COMPAT_MIGRATION_VERSION) {
    return;
  }

  db.exec("BEGIN");

  try {
    db.exec(`
    DROP INDEX IF EXISTS idx_embedding_jobs_status_schedule;
    DROP INDEX IF EXISTS idx_embeddings_entity_model;
    DROP INDEX IF EXISTS idx_note_chunks_note_chunk;

    DROP TABLE IF EXISTS embedding_jobs;
    DROP TABLE IF EXISTS embeddings;
    DROP TABLE IF EXISTS note_chunks;
  `);

    setCompatibilityMigrationVersion(db, CURRENT_COMPAT_MIGRATION_VERSION);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
