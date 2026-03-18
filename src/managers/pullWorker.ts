import { api } from "@/apiClient";
import { mapNote, mapFolder, mapConversation } from "@/utils/dtoMappers";
import { noteRepo } from "./noteRepo";
import { folderRepo } from "./folderRepo";
import { threadRepo } from "./threadRepo";
import { outboxRepo } from "./outboxRepo";

const SYNC_CURSOR_KEY = "graphnode_syncronization";

/**
 * 서버에서 변경된 데이터를 로컬 DB에 반영합니다 (Pull Sync).
 *
 * - `since` 커서를 사용해 마지막 동기화 이후의 변경분만 가져옵니다.
 * - outbox에 pending/processing 상태인 엔티티는 덮어쓰지 않습니다 (로컬 변경 우선).
 * - `deletedAt`이 있는 항목은 로컬 DB에서 삭제합니다.
 * - 성공 시 서버가 반환한 `serverTime`을 다음 동기화 커서로 저장합니다.
 */
export async function pullOnce() {
  const since = localStorage.getItem(SYNC_CURSOR_KEY) ?? undefined;

  const result = await api.sync.pull(since);
  if (!result.isSuccess) {
    console.error("Sync pull failed:", result.error);
    return;
  }

  const { notes, folders, conversations, serverTime } = result.data;
  const sqliteSyncPayload = {
    notes: {
      upserts: notes.filter((n) => !n.deletedAt).map(mapNote),
      deleteIds: notes.filter((n) => n.deletedAt).map((n) => n.id),
    },
    folders: {
      upserts: folders.filter((f) => !f.deletedAt).map(mapFolder),
      deleteIds: folders.filter((f) => f.deletedAt).map((f) => f.id),
    },
    threads: {
      upserts: conversations
        .filter((c) => !c.deletedAt)
        .map(mapConversation),
      deleteIds: conversations.filter((c) => c.deletedAt).map((c) => c.id),
    },
    serverTime,
  };

  // ── Notes ──────────────────────────────────────────────────────────────
  if (notes.length > 0) {
    const deletedIds = notes.filter((n) => n.deletedAt).map((n) => n.id);
    const active = notes.filter((n) => !n.deletedAt);
    const ids = notes.map((n) => n.id);
    const ops = await outboxRepo.listOpsByEntityIds(ids);
    const locked = new Set(
      ops
        .filter((op) => op.status === "pending" || op.status === "processing")
        .map((op) => op.entityId),
    );

    const toUpsert = active.filter((n) => !locked.has(n.id)).map(mapNote);
    if (toUpsert.length > 0) await noteRepo.upsertMany(toUpsert);

    const toDelete = deletedIds.filter((id) => !locked.has(id));
    if (toDelete.length > 0) await noteRepo.deleteMany(toDelete);
  }

  // ── Folders ────────────────────────────────────────────────────────────
  if (folders.length > 0) {
    const deletedIds = folders.filter((f) => f.deletedAt).map((f) => f.id);
    const active = folders.filter((f) => !f.deletedAt);
    const ids = folders.map((f) => f.id);
    const ops = await outboxRepo.listOpsByEntityIds(ids);
    const locked = new Set(
      ops
        .filter((op) => op.status === "pending" || op.status === "processing")
        .map((op) => op.entityId),
    );

    const toUpsert = active.filter((f) => !locked.has(f.id)).map(mapFolder);
    if (toUpsert.length > 0) await folderRepo.upsertMany(toUpsert);

    const toDelete = deletedIds.filter((id) => !locked.has(id));
    if (toDelete.length > 0) await folderRepo.deleteMany(toDelete);
  }

  // ── Conversations / Threads ────────────────────────────────────────────
  if (conversations.length > 0) {
    const deletedIds = conversations
      .filter((c) => c.deletedAt)
      .map((c) => c.id);
    const active = conversations.filter((c) => !c.deletedAt);
    const ids = conversations.map((c) => c.id);
    const ops = await outboxRepo.listOpsByEntityIds(ids);
    const locked = new Set(
      ops
        .filter((op) => op.status === "pending" || op.status === "processing")
        .map((op) => op.entityId),
    );

    const toUpsert = active
      .filter((c) => !locked.has(c.id))
      .map(mapConversation);
    if (toUpsert.length > 0) await threadRepo.upsertMany(toUpsert);

    const toDelete = deletedIds.filter((id) => !locked.has(id));
    if (toDelete.length > 0) await threadRepo.deleteMany(toDelete);
  }

  // ── 커서 저장 ─────────────────────────────────────────────────────────
  localStorage.setItem(SYNC_CURSOR_KEY, serverTime);

  if (window.graphnodeAPI?.applyStartupSync) {
    try {
      await window.graphnodeAPI.applyStartupSync(sqliteSyncPayload);
    } catch (error) {
      console.error("SQLite startup sync failed:", error);
    }
  }
}
