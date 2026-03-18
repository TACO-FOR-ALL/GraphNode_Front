/**
 * Storage contract reference for the future SQLite migration.
 *
 * These helpers intentionally stay runtime-light; the real implementation
 * can be provided by Dexie, SQLite, or a hybrid adapter.
 */

export const NOTE_ENTITY = "note";
export const THREAD_ENTITY = "thread";
export const FOLDER_ENTITY = "folder";

export interface StorageCapabilities {
  supportsTransactions: boolean;
  supportsVectorSearch: boolean;
  supportsBackgroundEmbedding: boolean;
}

export function createStorageCapabilities(
  overrides: Partial<StorageCapabilities> = {},
): StorageCapabilities {
  return {
    supportsTransactions: true,
    supportsVectorSearch: false,
    supportsBackgroundEmbedding: false,
    ...overrides,
  };
}
