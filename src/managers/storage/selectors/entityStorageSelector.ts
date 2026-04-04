import { isElectron } from "@/utils/platform";
import { sqliteRendererFolderStorage } from "../adapters/sqlite/sqliteRendererFolderStorage";
import { sqliteRendererThreadStorage } from "../adapters/sqlite/sqliteRendererThreadStorage";
import { apiFolderStorage } from "../adapters/api/apiFolderStorage";
import { apiThreadStorage } from "../adapters/api/apiThreadStorage";

export async function getPreferredFolderReadStorage() {
  return isElectron() ? sqliteRendererFolderStorage : apiFolderStorage;
}

export async function getPreferredFolderWriteStorage() {
  return isElectron() ? sqliteRendererFolderStorage : apiFolderStorage;
}

export async function getPreferredThreadReadStorage() {
  return isElectron() ? sqliteRendererThreadStorage : apiThreadStorage;
}

export async function getPreferredThreadWriteStorage() {
  return isElectron() ? sqliteRendererThreadStorage : apiThreadStorage;
}
