import { DatabaseSync } from "node:sqlite";

// ─── 타입 ───────────────────────────────────────────────────────────────────

export type QueueStatus = "pending" | "processing" | "done" | "failed";

export type EmbeddingQueueRow = {
  id: string;
  thread_id: string;
  user_message_id: string;
  assistant_message_id: string;
  combined_text: string;
  status: QueueStatus;
  retry_count: number;
  started_at: number | null;
  created_at: number;
};

export type ChatEmbeddingRow = {
  id: string;
  thread_id: string;
  user_message_id: string;
  assistant_message_id: string;
  embedding: Buffer;
  model_name: string;
  created_at: number;
};

export type QAPair = {
  userMessageId: string;
  assistantMessageId: string;
  combinedText: string;
};

export type SimilarResult = {
  threadId: string;
  userMessageId: string;
  assistantMessageId: string;
  score: number;
};

// ─── 큐 (embedding_queue) ────────────────────────────────────────────────────

const MAX_RETRY = 3;

/** 새 Q&A 쌍들을 큐에 추가 */
export function enqueueJobs(
  threadId: string,
  pairs: QAPair[],
  db: DatabaseSync,
): void {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO embedding_queue
      (id, thread_id, user_message_id, assistant_message_id, combined_text, status, retry_count, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)
  `);
  const now = Date.now();
  for (const pair of pairs) {
    const id = `${threadId}:${pair.userMessageId}:${pair.assistantMessageId}`;
    stmt.run(id, threadId, pair.userMessageId, pair.assistantMessageId, pair.combinedText, now);
  }
}

/** pending 잡을 limit개 가져옴 */
export function dequeueJobs(
  limit: number,
  db: DatabaseSync,
): EmbeddingQueueRow[] {
  return db
    .prepare(
      `SELECT * FROM embedding_queue
       WHERE status = 'pending'
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .all(limit) as EmbeddingQueueRow[];
}

/** 잡들을 processing 상태로 변경 */
export function markJobsProcessing(ids: string[], db: DatabaseSync): void {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(",");
  db.prepare(
    `UPDATE embedding_queue
     SET status = 'processing', started_at = ?
     WHERE id IN (${placeholders})`,
  ).run(Date.now(), ...ids);
}

/** 잡 완료 처리 */
export function markJobDone(id: string, db: DatabaseSync): void {
  db.prepare(
    `UPDATE embedding_queue SET status = 'done' WHERE id = ?`,
  ).run(id);
}

/** 잡 실패 처리 – retry_count가 MAX_RETRY 이상이면 failed로 마킹 */
export function markJobFailed(id: string, db: DatabaseSync): void {
  db.prepare(
    `UPDATE embedding_queue
     SET status = CASE WHEN retry_count + 1 >= ${MAX_RETRY} THEN 'failed' ELSE 'pending' END,
         retry_count = retry_count + 1,
         started_at = NULL
     WHERE id = ?`,
  ).run(id);
}

/** 모델 전환/재시작으로 인한 중단 – retry_count 증가 없이 pending으로 복구 */
export function requeueJobWithoutPenalty(id: string, db: DatabaseSync): void {
  db.prepare(
    `UPDATE embedding_queue SET status = 'pending', started_at = NULL WHERE id = ?`,
  ).run(id);
}

/**
 * 앱 재시작 시 호출.
 * processing 상태로 남은 잡(앱 종료 중단)을 pending으로 복구하고 retry_count 증가.
 * retry_count가 MAX_RETRY 이상이면 failed로 마킹.
 */
export function resetStuckJobs(db: DatabaseSync): void {
  db.exec(`
    UPDATE embedding_queue
    SET status = 'failed', started_at = NULL
    WHERE status = 'processing' AND retry_count + 1 >= ${MAX_RETRY};

    UPDATE embedding_queue
    SET status = 'pending', started_at = NULL, retry_count = retry_count + 1
    WHERE status = 'processing' AND retry_count + 1 < ${MAX_RETRY};
  `);
}

/** pending/processing 잡 수 조회 */
export function getPendingCount(db: DatabaseSync): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM embedding_queue WHERE status IN ('pending', 'processing')`,
    )
    .get() as { cnt: number };
  return row.cnt;
}

/** 특정 스레드에서 이미 큐에 있는 쌍 목록 조회 (중복 enqueue 방지) */
export function getQueuedPairs(
  threadId: string,
  db: DatabaseSync,
): Pick<EmbeddingQueueRow, "user_message_id" | "assistant_message_id">[] {
  return db
    .prepare(
      `SELECT user_message_id, assistant_message_id FROM embedding_queue
       WHERE thread_id = ? AND status NOT IN ('failed')`,
    )
    .all(threadId) as Pick<
    EmbeddingQueueRow,
    "user_message_id" | "assistant_message_id"
  >[];
}

// ─── 임베딩 저장소 (chat_embeddings) ─────────────────────────────────────────

/** 임베딩 저장 */
export function saveEmbedding(
  data: {
    id: string;
    threadId: string;
    userMessageId: string;
    assistantMessageId: string;
    embedding: Buffer;
    modelName: string;
    createdAt: number;
  },
  db: DatabaseSync,
): void {
  db.prepare(`
    INSERT OR REPLACE INTO chat_embeddings
      (id, thread_id, user_message_id, assistant_message_id, embedding, model_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id,
    data.threadId,
    data.userMessageId,
    data.assistantMessageId,
    data.embedding,
    data.modelName,
    data.createdAt,
  );
}

/** 특정 스레드에서 이미 임베딩된 쌍 목록 (중복 방지) */
export function getExistingEmbeddingPairs(
  threadId: string,
  db: DatabaseSync,
): Pick<ChatEmbeddingRow, "user_message_id" | "assistant_message_id">[] {
  return db
    .prepare(
      `SELECT user_message_id, assistant_message_id FROM chat_embeddings WHERE thread_id = ?`,
    )
    .all(threadId) as Pick<
    ChatEmbeddingRow,
    "user_message_id" | "assistant_message_id"
  >[];
}

/** 유사도 검색용 전체 임베딩 로드 */
export function getAllEmbeddings(db: DatabaseSync): ChatEmbeddingRow[] {
  return db
    .prepare(
      `SELECT id, thread_id, user_message_id, assistant_message_id, embedding, model_name, created_at
       FROM chat_embeddings`,
    )
    .all() as ChatEmbeddingRow[];
}

/** 스레드 삭제 시 연관 임베딩 정리 (ON DELETE CASCADE로도 처리되지만 명시적으로) */
export function deleteEmbeddingsByThread(
  threadId: string,
  db: DatabaseSync,
): void {
  db.prepare(`DELETE FROM chat_embeddings WHERE thread_id = ?`).run(threadId);
  db.prepare(`DELETE FROM embedding_queue WHERE thread_id = ?`).run(threadId);
}

/** 임베딩된 총 Q&A 쌍 수 */
export function getEmbeddingCount(db: DatabaseSync): number {
  const row = db
    .prepare(`SELECT COUNT(*) as cnt FROM chat_embeddings`)
    .get() as { cnt: number };
  return row.cnt;
}

// ─── 초기 마이그레이션 플래그 (app_meta) ─────────────────────────────────────

const MIGRATION_KEY = "embedding.initial_migration.done";

export function isMigrationDone(db: DatabaseSync): boolean {
  const row = db
    .prepare(`SELECT value_json FROM app_meta WHERE key = ?`)
    .get(MIGRATION_KEY) as { value_json: string } | undefined;
  if (!row) return false;
  try {
    return JSON.parse(row.value_json) === true;
  } catch {
    return false;
  }
}

export function setMigrationDone(db: DatabaseSync): void {
  db.prepare(`
    INSERT INTO app_meta (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(MIGRATION_KEY, JSON.stringify(true), Date.now());
}

// ─── 메인 프로세스용 메시지 조회 ──────────────────────────────────────────────

export type MessageRow = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  ts: number;
};

export type ThreadSummary = {
  id: string;
  messages: MessageRow[];
};

/** 특정 스레드의 메시지 목록 조회 (temp 제외) */
export function getThreadMessages(
  threadId: string,
  db: DatabaseSync,
): MessageRow[] {
  return db
    .prepare(
      `SELECT id, role, content, ts FROM thread_messages
       WHERE thread_id = ? AND temp = 0
       ORDER BY ts ASC`,
    )
    .all(threadId) as MessageRow[];
}

/** 모든 스레드 ID 조회 */
export function getAllThreadIds(db: DatabaseSync): string[] {
  const rows = db
    .prepare(`SELECT id FROM threads WHERE deleted_at IS NULL`)
    .all() as { id: string }[];
  return rows.map((r) => r.id);
}

// ─── 디버그/인스펙션 ──────────────────────────────────────────────────────────

export type EmbeddingSample = {
  id: string;
  thread_id: string;
  user_message_snippet: string;
  assistant_message_snippet: string;
  model_name: string;
  vector_preview: number[]; // 앞 8개 값만
  created_at: number;
};

/** 임베딩 샘플 조회 (UI 표시용) */
export function getEmbeddingSamples(
  limit: number,
  db: DatabaseSync,
): EmbeddingSample[] {
  const rows = db
    .prepare(
      `SELECT
         ce.id,
         ce.thread_id,
         ce.model_name,
         ce.embedding,
         ce.created_at,
         um.content AS user_content,
         am.content AS assistant_content
       FROM chat_embeddings ce
       LEFT JOIN thread_messages um ON um.id = ce.user_message_id
       LEFT JOIN thread_messages am ON am.id = ce.assistant_message_id
       ORDER BY ce.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    thread_id: string;
    model_name: string;
    embedding: Buffer;
    created_at: number;
    user_content: string | null;
    assistant_content: string | null;
  }>;

  return rows.map((row) => {
    const vec = new Float32Array(
      row.embedding.buffer,
      row.embedding.byteOffset,
      row.embedding.byteLength / 4,
    );
    return {
      id: row.id,
      thread_id: row.thread_id,
      user_message_snippet: (row.user_content ?? "").slice(0, 80),
      assistant_message_snippet: (row.assistant_content ?? "").slice(0, 80),
      model_name: row.model_name,
      vector_preview: Array.from(vec.slice(0, 8)),
      created_at: row.created_at,
    };
  });
}

export type EmbeddingFull = {
  id: string;
  thread_id: string;
  user_message_snippet: string;
  assistant_message_snippet: string;
  model_name: string;
  dims: number; // 전체 차원 수
  vector: number[]; // 전체 벡터
  created_at: number;
};

/** 임베딩 전체 벡터 조회 (차원 검증용) */
export function getEmbeddingsFull(
  limit: number,
  db: DatabaseSync,
): EmbeddingFull[] {
  const rows = db
    .prepare(
      `SELECT
         ce.id,
         ce.thread_id,
         ce.model_name,
         ce.embedding,
         ce.created_at,
         um.content AS user_content,
         am.content AS assistant_content
       FROM chat_embeddings ce
       LEFT JOIN thread_messages um ON um.id = ce.user_message_id
       LEFT JOIN thread_messages am ON am.id = ce.assistant_message_id
       ORDER BY ce.created_at DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    thread_id: string;
    model_name: string;
    embedding: Buffer;
    created_at: number;
    user_content: string | null;
    assistant_content: string | null;
  }>;

  return rows.map((row) => {
    const vec = new Float32Array(
      row.embedding.buffer,
      row.embedding.byteOffset,
      row.embedding.byteLength / 4,
    );
    return {
      id: row.id,
      thread_id: row.thread_id,
      user_message_snippet: (row.user_content ?? "").slice(0, 80),
      assistant_message_snippet: (row.assistant_content ?? "").slice(0, 80),
      model_name: row.model_name,
      dims: vec.length,
      vector: Array.from(vec),
      created_at: row.created_at,
    };
  });
}

export type NoteEmbeddingFull = {
  note_id: string;
  note_title_snippet: string;
  note_content_snippet: string;
  model_name: string;
  dims: number;
  vector: number[];
  embedded_at: number;
};

/** 노트 임베딩 전체 벡터 조회 (차원/실저장값 검증용) */
export function getNoteEmbeddingsFull(
  limit: number,
  db: DatabaseSync,
): NoteEmbeddingFull[] {
  const rows = db
    .prepare(
      `SELECT
         ne.note_id,
         ne.model_name,
         ne.embedding,
         ne.embedded_at,
         n.title AS note_title,
         n.content AS note_content
       FROM note_embeddings ne
       LEFT JOIN notes n ON n.id = ne.note_id
       WHERE n.id IS NULL OR n.deleted_at IS NULL
       ORDER BY ne.embedded_at DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    note_id: string;
    model_name: string;
    embedding: Buffer;
    embedded_at: number;
    note_title: string | null;
    note_content: string | null;
  }>;

  return rows.map((row) => {
    const vec = new Float32Array(
      row.embedding.buffer,
      row.embedding.byteOffset,
      row.embedding.byteLength / 4,
    );
    return {
      note_id: row.note_id,
      note_title_snippet: (row.note_title ?? "").slice(0, 80),
      note_content_snippet: (row.note_content ?? "").slice(0, 120),
      model_name: row.model_name,
      dims: vec.length,
      vector: Array.from(vec),
      embedded_at: row.embedded_at,
    };
  });
}

/** 큐 상태별 카운트 */
export function getQueueStats(db: DatabaseSync): Record<string, number> {
  const rows = db
    .prepare(
      `SELECT status, COUNT(*) as cnt FROM embedding_queue GROUP BY status`,
    )
    .all() as Array<{ status: string; cnt: number }>;
  const result: Record<string, number> = {
    pending: 0,
    processing: 0,
    done: 0,
    failed: 0,
  };
  for (const row of rows) result[row.status] = row.cnt;
  return result;
}

// ─── 노트 임베딩 (note_embeddings) ───────────────────────────────────────────

export type NoteEmbeddingRow = {
  note_id: string;
  embedding: Buffer;
  model_name: string;
  embedded_at: number;
};

/** 노트 임베딩 저장 (upsert) */
export function saveNoteEmbedding(
  data: { noteId: string; embedding: Buffer; modelName: string; embeddedAt: number },
  db: DatabaseSync,
): void {
  db.prepare(`
    INSERT OR REPLACE INTO note_embeddings (note_id, embedding, model_name, embedded_at)
    VALUES (?, ?, ?, ?)
  `).run(data.noteId, data.embedding, data.modelName, data.embeddedAt);
}

/** 특정 노트의 임베딩 조회 */
export function getNoteEmbedding(
  noteId: string,
  db: DatabaseSync,
): NoteEmbeddingRow | null {
  return (db
    .prepare(`SELECT * FROM note_embeddings WHERE note_id = ?`)
    .get(noteId) as NoteEmbeddingRow | undefined) ?? null;
}

/** 모든 노트 임베딩 조회 (유사도 검색용) */
export function getAllNoteEmbeddings(db: DatabaseSync): NoteEmbeddingRow[] {
  return db
    .prepare(`SELECT * FROM note_embeddings`)
    .all() as NoteEmbeddingRow[];
}

/** 노트 삭제 시 임베딩 정리 */
export function deleteNoteEmbedding(noteId: string, db: DatabaseSync): void {
  db.prepare(`DELETE FROM note_embeddings WHERE note_id = ?`).run(noteId);
}

/** 모든 노트 임베딩 삭제 */
export function clearNoteEmbeddings(db: DatabaseSync): void {
  db.exec(`DELETE FROM note_embeddings`);
}

// ─── 유사도 계산 ──────────────────────────────────────────────────────────────

export function bufferToFloat32Array(buf: Buffer): Float32Array {
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
