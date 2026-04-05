import { isElectron } from "@/utils/platform";
import { sqliteRendererNoteStorage } from "../adapters/sqlite/sqliteRendererNoteStorage";
import { apiNoteStorage } from "../adapters/api/apiNoteStorage";

export function resetNoteStorageSelection() {
  return;
}

export async function getPreferredNoteReadStorage() {
  return isElectron() ? sqliteRendererNoteStorage : apiNoteStorage;
}

export async function getPreferredNoteWriteStorage() {
  return isElectron() ? sqliteRendererNoteStorage : apiNoteStorage;
}
