import {
  getPreferredNoteReadStorage,
  getPreferredNoteWriteStorage,
} from "../storage/selectors/noteStorageSelector";
import {
  getPreferredFolderReadStorage,
  getPreferredFolderWriteStorage,
  getPreferredThreadReadStorage,
  getPreferredThreadWriteStorage,
} from "../storage/selectors/entityStorageSelector";
import { sqliteRendererNoteStorage } from "../storage/adapters/sqlite/sqliteRendererNoteStorage";
import { sqliteRendererFolderStorage } from "../storage/adapters/sqlite/sqliteRendererFolderStorage";
import { sqliteRendererThreadStorage } from "../storage/adapters/sqlite/sqliteRendererThreadStorage";

describe("SQLite storage selectors", () => {
  test("note read/write selectors always return SQLite storage", async () => {
    await expect(getPreferredNoteReadStorage()).resolves.toBe(
      sqliteRendererNoteStorage,
    );
    await expect(getPreferredNoteWriteStorage()).resolves.toBe(
      sqliteRendererNoteStorage,
    );
  });

  test("folder/thread selectors always return SQLite storage", async () => {
    await expect(getPreferredFolderReadStorage()).resolves.toBe(
      sqliteRendererFolderStorage,
    );
    await expect(getPreferredFolderWriteStorage()).resolves.toBe(
      sqliteRendererFolderStorage,
    );
    await expect(getPreferredThreadReadStorage()).resolves.toBe(
      sqliteRendererThreadStorage,
    );
    await expect(getPreferredThreadWriteStorage()).resolves.toBe(
      sqliteRendererThreadStorage,
    );
  });
});
