import { sqliteRendererFolderStorage } from "../adapters/sqlite/sqliteRendererFolderStorage";
import { sqliteRendererThreadStorage } from "../adapters/sqlite/sqliteRendererThreadStorage";

export async function getPreferredFolderReadStorage() {
  return sqliteRendererFolderStorage;
}

export async function getPreferredFolderWriteStorage() {
  return sqliteRendererFolderStorage;
}

export async function getPreferredThreadReadStorage() {
  return sqliteRendererThreadStorage;
}

export async function getPreferredThreadWriteStorage() {
  return sqliteRendererThreadStorage;
}
