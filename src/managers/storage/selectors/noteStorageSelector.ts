import { sqliteRendererNoteStorage } from "../adapters/sqlite/sqliteRendererNoteStorage";

export function resetNoteStorageSelection() {
  return;
}

export async function getPreferredNoteReadStorage() {
  return sqliteRendererNoteStorage;
}

export async function getPreferredNoteWriteStorage() {
  return sqliteRendererNoteStorage;
}
