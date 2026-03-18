import { api } from "@/apiClient";
import type { OutboxOp } from "@/types/Outbox";
import type { FolderCreate, FolderUpdate } from "@/types/Folder";

let running = false;

export async function syncOnce(limit = 20) {
  if (running) return;
  running = true;

  try {
    const now = Date.now();

    // 60초 이상 실패한 작업을 pending으로 변경해서 앱 크래시나 강제 종료로 인한 processing 상태 초기화
    await window.graphnodeAPI.requeueStaleSQLiteOutbox(now);

    // status가 pending이고 nextRetryAt이 현재 시간보다 작은 작업을 limit개만 가져옴
    const ops = await window.graphnodeAPI.listSQLitePendingOutboxDue(
      now,
      limit,
    );

    for (const op of ops) {
      await processOp(op);
    }
  } finally {
    running = false;
  }
}

async function processOp(op: OutboxOp) {
  const now = Date.now();

  // 현재 작업 상황 업데이트 => 같은 탭에서 중복 실행 방지
  await window.graphnodeAPI.updateSQLiteOutbox(op.opId, {
    status: "processing",
    updatedAt: now,
  });

  try {
    switch (op.type) {
      case "note.create":
        await api.note.createNote(op.payload);
        break;

      case "note.update":
        await api.note.updateNote(op.entityId, op.payload);
        break;

      case "note.move":
        await api.note.updateNote(op.entityId, op.payload);
        break;

      case "note.delete":
        await api.note.softDeleteNote(op.entityId);
        break;

      case "thread.update":
        await api.conversations.update(op.entityId, op.payload);
        break;

      case "thread.delete":
        await api.conversations.softDelete(op.entityId);
        break;

      case "folder.create": {
        const result = await api.note.createFolder(op.payload as FolderCreate);
        if (!result.isSuccess) throw new Error(result.error.message);

        const serverId = result.data.id;
        const localId = op.entityId;

        // TODO: 엔드 노트랑 폴더랑 스레드 아이디 다 프론트에서 만들어진 uuid 사용할 경우 제거합니다
        // 서버가 다른 ID를 할당한 경우 로컬 DB를 서버 ID로 교체합니다
        if (serverId !== localId) {
          const localFolder =
            await window.graphnodeAPI.getSQLiteFolderById(localId);
          if (localFolder) {
            await window.graphnodeAPI.upsertSQLiteFolder({
              ...localFolder,
              id: serverId,
            });
            await window.graphnodeAPI.bulkDeleteSQLiteFolders([localId]);
          }

          const notes = await window.graphnodeAPI.listSQLiteNotes();
          const affectedNotes = notes.filter(
            (note) => note.folderId === localId,
          );
          if (affectedNotes.length > 0) {
            await window.graphnodeAPI.bulkUpsertSQLiteNotes(
              affectedNotes.map((note) => ({
                ...note,
                folderId: serverId,
              })),
            );
          }

          await window.graphnodeAPI.replaceSQLiteOutboxEntityId(
            localId,
            serverId,
          );
        }
        break;
      }

      case "folder.update":
        await api.note.updateFolder(op.entityId, op.payload as FolderUpdate);
        break;

      case "folder.delete":
        await api.note.softDeleteFolder(op.entityId);
        break;
    }

    // 작업 성공 후 outbox에서 제거
    await window.graphnodeAPI.deleteSQLiteOutbox(op.opId);
  } catch (e: any) {
    // 작업 실패 후 재시도 횟수 증가 및 지연 시간 계산 및 아웃박스 정보 업데이트
    const retryCount = (op.retryCount ?? 0) + 1;
    const delay = backoffMs(retryCount);

    await window.graphnodeAPI.updateSQLiteOutbox(op.opId, {
      status: "pending",
      retryCount,
      nextRetryAt: now + delay,
      updatedAt: now,
      lastError: String(e?.message ?? e),
    });
  }
}

function backoffMs(retryCount: number) {
  // 1s, 2s, 4s, 8s, 16s, 32s, max 60s (+jitter)
  const base = Math.min(60_000, 1000 * 2 ** Math.min(6, retryCount - 1));
  const jitter = Math.floor(Math.random() * 300);
  return base + jitter;
}
