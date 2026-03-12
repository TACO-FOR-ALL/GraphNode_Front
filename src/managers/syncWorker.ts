import { db } from "@/db/graphnode.db";
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
    await db.outbox
      .where("status")
      .equals("processing")
      .and((op) => op.updatedAt < now - 60_000)
      .modify({
        status: "pending",
        nextRetryAt: now,
        updatedAt: now,
      });

    // status가 pending이고 nextRetryAt이 현재 시간보다 작은 작업을 limit개만 가져옴
    const ops = await db.outbox
      .where("[status+nextRetryAt]")
      .between(["pending", 0], ["pending", now])
      .limit(limit)
      .toArray();

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
  await db.outbox.update(op.opId, { status: "processing", updatedAt: now });

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

        // 서버가 다른 ID를 할당한 경우 로컬 DB를 서버 ID로 교체합니다
        if (serverId !== localId) {
          await db.transaction(
            "rw",
            db.folders,
            db.notes,
            db.outbox,
            async () => {
              const local = await db.folders.get(localId);
              if (local) {
                await db.folders.put({ ...local, id: serverId });
                await db.folders.delete(localId);
              }
              // 해당 폴더를 참조하는 노트의 folderId 업데이트
              const affectedNotes = await db.notes
                .where("folderId")
                .equals(localId)
                .toArray();
              for (const note of affectedNotes) {
                await db.notes.update(note.id, { folderId: serverId });
              }
              // 동일 entityId를 가진 후속 outbox op의 entityId 업데이트
              const pending = await db.outbox
                .where("entityId")
                .equals(localId)
                .toArray();
              for (const p of pending) {
                await db.outbox.delete(p.opId);
                await db.outbox.put({ ...p, entityId: serverId });
              }
            },
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
    await db.outbox.delete(op.opId);
  } catch (e: any) {
    // 작업 실패 후 재시도 횟수 증가 및 지연 시간 계산 및 아웃박스 정보 업데이트
    const retryCount = (op.retryCount ?? 0) + 1;
    const delay = backoffMs(retryCount);

    await db.outbox.update(op.opId, {
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
