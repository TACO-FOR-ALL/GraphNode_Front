declare module "@graphnode/paths" {
  export function getGraphNodeHomeDirectory(): string;
  export function getCliDataDirectory(): string;
  export function getCliNotesDirectory(): string;
}

declare module "@graphnode/storage" {
  import type { DatabaseSync } from "node:sqlite";

  export const NOTE_ENTITY: string;
  export const THREAD_ENTITY: string;
  export const FOLDER_ENTITY: string;
  export const SQLITE_SYNC_CURSOR_KEY: string;
  export const SQLITE_BOOTSTRAP_STATE_KEY: string;

  export function createStorageCapabilities(overrides?: Record<string, unknown>): {
    supportsTransactions: boolean;
    supportsVectorSearch: boolean;
    supportsBackgroundEmbedding: boolean;
  };

  export function createBootstrapMeta(input?: {
    state?: string;
    lastServerTime?: string | null;
    lastBootstrappedAt?: string | null;
  }): {
    state: string;
    lastServerTime: string | null;
    lastBootstrappedAt: string | null;
  };

  export function readSQLiteSchema(): Promise<string>;
  export function getDefaultDatabaseLocation(homeDirectory: string): string;
  export function applySQLiteCompatibilityMigrations(db: DatabaseSync): void;
}
