export const SQLITE_SCHEMA = `PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_deleted_at ON threads(deleted_at);

CREATE TABLE IF NOT EXISTS thread_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  message_index INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  ts INTEGER NOT NULL,
  temp INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_thread_messages_thread_index
  ON thread_messages(thread_id, message_index);

CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_ts
  ON thread_messages(thread_id, ts);

CREATE INDEX IF NOT EXISTS idx_thread_messages_content
  ON thread_messages(content);

CREATE TABLE IF NOT EXISTS outbox_ops (
  op_id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  op_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_retry
  ON outbox_ops(status, next_retry_at);

CREATE TABLE IF NOT EXISTS trashed_notes (
  id TEXT PRIMARY KEY,
  original_note_json TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trashed_notes_deleted_at
  ON trashed_notes(deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_trashed_notes_expires_at
  ON trashed_notes(expires_at);

CREATE TABLE IF NOT EXISTS trashed_threads (
  id TEXT PRIMARY KEY,
  original_thread_json TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trashed_threads_deleted_at
  ON trashed_threads(deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_trashed_threads_expires_at
  ON trashed_threads(expires_at);

CREATE TABLE IF NOT EXISTS trashed_folders (
  id TEXT PRIMARY KEY,
  original_folder_json TEXT NOT NULL,
  note_ids_json TEXT NOT NULL,
  deleted_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trashed_folders_deleted_at
  ON trashed_folders(deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_trashed_folders_expires_at
  ON trashed_folders(expires_at);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS embedding_queue (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_message_id TEXT NOT NULL,
  assistant_message_id TEXT NOT NULL,
  combined_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_embedding_queue_status ON embedding_queue(status);
CREATE INDEX IF NOT EXISTS idx_embedding_queue_thread ON embedding_queue(thread_id);

CREATE TABLE IF NOT EXISTS chat_embeddings (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_message_id TEXT NOT NULL,
  assistant_message_id TEXT NOT NULL,
  embedding BLOB NOT NULL,
  model_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_embeddings_thread ON chat_embeddings(thread_id);

CREATE TABLE IF NOT EXISTS note_embeddings (
  note_id TEXT PRIMARY KEY,
  embedding BLOB NOT NULL,
  model_name TEXT NOT NULL,
  embedded_at INTEGER NOT NULL
);
`;
