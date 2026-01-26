import { db } from "@/db/graphnode.db";
import uuid from "@/utils/uuid";
import type { OutboxOp, OutboxOpType } from "@/types/Outbox";
import type {
  ConversationUpdateDto,
  NoteCreateDto,
  NoteUpdateDto,
} from "@taco_tsinghua/graphnode-sdk";

/**
 * Coalesce 기준
 * (A) note.delete enqueue 시: 해당 noteId의 기존 pending op(create/update/move)를 전부 제거하고 delete만 남김
 * (B) note.create가 pending이면: 이후 update/move는 create payload에 흡수(merge)하고 새 op 만들지 않음
 * (C) note.update는 noteId당 1개만 유지: 이미 있으면 payload 덮어쓰기
 * (D) note.move도 NoteUpdateDto로 처리하며 noteId당 1개만 유지: 이미 있으면 payload 덮어쓰기
 */
export const outboxRepo = {
  async enqueueNoteCreate(noteId: string, payload: NoteCreateDto) {
    await enqueueWithCoalesce("note.create", noteId, payload);
  },

  async enqueueNoteUpdate(noteId: string, payload: NoteUpdateDto) {
    await enqueueWithCoalesce("note.update", noteId, payload);
  },

  async enqueueNoteMove(noteId: string, payload: NoteUpdateDto) {
    await enqueueWithCoalesce("note.move", noteId, payload);
  },

  async enqueueNoteDelete(noteId: string) {
    await enqueueWithCoalesce("note.delete", noteId, null);
  },

  async enqueueThreadUpdateTitle(
    threadId: string,
    payload: ConversationUpdateDto,
  ) {
    await enqueueWithCoalesce("thread.update", threadId, payload);
  },
  async enqueueThreadDelete(threadId: string) {
    await enqueueWithCoalesce("thread.delete", threadId, null);
  },
};

async function enqueueWithCoalesce(
  type: OutboxOpType,
  entityId: string,
  payload: any,
) {
  const now = Date.now();

  if (!entityId) {
    throw new Error("entityId is required");
  }

  await db.transaction("rw", db.outbox, async () => {
    // (A) delete: 관련 op 정리 후 delete만 남김
    if (type === "note.delete") {
      const related = await db.outbox
        .where("entityId")
        .equals(entityId)
        .toArray();
      const pendingOnly = related.filter((r) => r.status === "pending");
      if (pendingOnly.length) {
        await db.outbox.bulkDelete(pendingOnly.map((r) => r.opId));
      }
      await db.outbox.put(
        makeOp(entityId, "note.delete", { id: entityId }, now),
      );
      return;
    }

    // (A-2) thread.delete: 관련 thread.update op 정리 후 delete만 남김
    if (type === "thread.delete") {
      const related = await db.outbox
        .where("entityId")
        .equals(entityId)
        .toArray();
      const pendingOnly = related.filter((r) => r.status === "pending");
      if (pendingOnly.length) {
        await db.outbox.bulkDelete(pendingOnly.map((r) => r.opId));
      }
      await db.outbox.put(makeOp(entityId, "thread.delete", null, now));
      return;
    }

    // (A-3) thread.update: threadId당 1개로 coalesce
    if (type === "thread.update") {
      const existing = await db.outbox
        .where({ entityId, type: "thread.update" as const, status: "pending" as const })
        .first();

      if (existing) {
        await db.outbox.update(existing.opId, {
          payload,
          status: "pending",
          nextRetryAt: now,
          updatedAt: now,
          lastError: undefined,
        });
        return;
      }

      await db.outbox.put(makeOp(entityId, "thread.update", payload, now));
      return;
    }

    // (B) create가 이미 pending이면: create payload에 update/move를 흡수
    const pendingCreate = await db.outbox
      .where({
        entityId,
        type: "note.create" as const,
        status: "pending" as const,
      })
      .first();

    if (pendingCreate) {
      const merged = mergeIntoCreatePayload(
        pendingCreate.payload as NoteCreateDto,
        type,
        payload,
      );
      await db.outbox.update(pendingCreate.opId, {
        payload: merged,
        status: "pending",
        nextRetryAt: now,
        updatedAt: now,
        lastError: undefined,
      });
      return;
    }

    // (C) update/move는 noteId당 1개로 coalesce
    if (type === "note.update" || type === "note.move") {
      const existing = await db.outbox
        .where({ entityId, type: type as any, status: "pending" as const })
        .first();

      if (existing) {
        await db.outbox.update(existing.opId, {
          payload,
          status: "pending",
          nextRetryAt: now,
          updatedAt: now,
          lastError: undefined,
        });
        return;
      }

      await db.outbox.put(makeOp(entityId, type, payload, now));
      return;
    }

    // (D) create가 없으면 create는 그대로 enqueue
    if (type === "note.create") {
      await db.outbox.put(makeOp(entityId, "note.create", payload, now));
      return;
    }

    // fallback
    await db.outbox.put(makeOp(entityId, type, payload, now));
  });
}

function makeOp(
  entityId: string,
  type: OutboxOpType,
  payload: any,
  now: number,
): OutboxOp {
  return {
    opId: uuid(),
    entityId,
    type,
    payload,
    status: "pending",
    retryCount: 0,
    nextRetryAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function mergeIntoCreatePayload(
  existing: NoteCreateDto,
  incomingType: OutboxOpType,
  incomingPayload: any,
): NoteCreateDto {
  if (incomingType === "note.update" || incomingType === "note.move") {
    const u = incomingPayload as NoteUpdateDto;
    return {
      id: existing.id,
      content: u.content ?? existing.content,
      title: u.title ?? existing.title,
      folderId: u.folderId ?? existing.folderId ?? null,
    };
  }
  return existing;
}
