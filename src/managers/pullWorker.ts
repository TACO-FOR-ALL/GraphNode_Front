import { api } from "@/apiClient";
import { mapNote, mapFolder, mapConversation } from "@/utils/dtoMappers";
import { sortFoldersTopologically } from "@/utils/sortFoldersTopologically";
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
      upserts: sortFoldersTopologically(folders.filter((f) => !f.deletedAt).map(mapFolder)),
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

  // ── Folders ────────────────────────────────────────────────────────────
  // 노트보다 먼저 처리해야 FOREIGN KEY constraint 오류 방지
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

    const toUpsert = sortFoldersTopologically(active.filter((f) => !locked.has(f.id)).map(mapFolder));
    if (toUpsert.length > 0) await folderRepo.upsertMany(toUpsert);

    const toDelete = deletedIds.filter((id) => !locked.has(id));
    if (toDelete.length > 0) await folderRepo.deleteMany(toDelete);
  }

  // ── 유효한 폴더 ID 목록 조회 (FOREIGN KEY constraint 방지용) ───────────
  // 폴더 sync 이후에 실행하여 삭제된 폴더가 반영된 최신 목록을 가져옴
  let validFolderIds = new Set<string>();
  if (window.graphnodeAPI) {
    const sqliteFolders = await window.graphnodeAPI.listSQLiteFolders();
    validFolderIds = new Set(sqliteFolders.map((f: { id: string }) => f.id));
  }

  // applyStartupSync 페이로드의 노트도 동일하게 sanitize
  // Electron 메인 프로세스도 같은 FK constraint를 가지므로 SQLite에 없는 folderId 제거
  if (window.graphnodeAPI) {
    sqliteSyncPayload.notes.upserts = sqliteSyncPayload.notes.upserts.map((n) => ({
      ...n,
      folderId: n.folderId && validFolderIds.has(n.folderId) ? n.folderId : null,
    }));
  }

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

    // sqliteSyncPayload.notes.upserts와 동일한 sanitize 적용
    const toUpsert = active
      .filter((n) => !locked.has(n.id))
      .map(mapNote)
      .map((n) => ({
        ...n,
        folderId: n.folderId && validFolderIds.has(n.folderId) ? n.folderId : null,
      }));

    if (toUpsert.length > 0) await noteRepo.upsertMany(toUpsert);

    const toDelete = deletedIds.filter((id) => !locked.has(id));
    if (toDelete.length > 0) await noteRepo.deleteMany(toDelete);
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

    const rawUpserts = active
      .filter((c) => !locked.has(c.id))
      .map(mapConversation);

    if (rawUpserts.length > 0) {
      // 서버는 델타 동기화(since 커서 이후 변경분만 반환)하므로
      // 기존 로컬 메시지를 보존하고 서버에서 받은 메시지와 병합해야 함.
      // 같은 ID면 서버 버전 우선, 로컬에만 있는 메시지는 그대로 유지.
      const mergedUpserts = await Promise.all(
        rawUpserts.map(async (serverThread) => {
          const local = await threadRepo.getThreadById(serverThread.id);
          if (!local || local.messages.length === 0) return serverThread;

          const serverMsgIds = new Set(serverThread.messages.map((m) => m.id));
          const localOnlyMsgs = local.messages.filter(
            (m) => !serverMsgIds.has(m.id),
          );

          return {
            ...serverThread,
            messages: [...localOnlyMsgs, ...serverThread.messages].sort(
              (a, b) => a.ts - b.ts,
            ),
          };
        }),
      );
      await threadRepo.upsertMany(mergedUpserts);
      // applyStartupSync도 병합본으로 덮어쓰지 않도록 동기화
      sqliteSyncPayload.threads.upserts = mergedUpserts;
    }

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
