import { db } from "@/db/graphnode.db";
import { api } from "@/apiClient";
import type { OutboxOp } from "@/types/Outbox";

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
        await api.note.deleteNote(op.entityId);
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
