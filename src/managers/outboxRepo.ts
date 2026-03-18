import type { OutboxOp, OutboxOpType } from "@/types/Outbox";
import type { FolderCreate, FolderUpdate } from "@/types/Folder";
import type { NoteCreate, NoteUpdate } from "@/types/Note";
import type { ConversationUpdate } from "@/types/Conversation";
import uuid from "@/utils/uuid";

function requireGraphNodeAPI() {
  if (!window.graphnodeAPI) {
    throw new Error("graphnodeAPI is not available");
  }

  return window.graphnodeAPI;
}

function getEntityType(type: OutboxOpType) {
  if (type.startsWith("note.")) return "note";
  if (type.startsWith("folder.")) return "folder";
  return "thread";
}

function makeOp(
  entityId: string,
  type: OutboxOpType,
  payload: unknown,
  now: number,
): OutboxOp & { entityType: string } {
  return {
    opId: uuid(),
    entityId,
    entityType: getEntityType(type),
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
  createPayload: NoteCreate,
  incomingType: OutboxOpType,
  incomingPayload: NoteUpdate,
) {
  switch (incomingType) {
    case "note.update":
      return {
        ...createPayload,
        ...incomingPayload,
      };
    case "note.move":
      return {
        ...createPayload,
        folderId: incomingPayload.folderId ?? null,
      };
    default:
      return createPayload;
  }
}

async function listEntityOps(entityId: string) {
  return requireGraphNodeAPI().listSQLiteOutboxByEntityId(entityId);
}

async function putOp(op: OutboxOp & { entityType: string }) {
  await requireGraphNodeAPI().putSQLiteOutbox(op);
}

async function updateOp(opId: string, updates: Record<string, unknown>) {
  await requireGraphNodeAPI().updateSQLiteOutbox(opId, updates);
}

async function deleteOps(opIds: string[]) {
  if (opIds.length === 0) {
    return;
  }

  await requireGraphNodeAPI().bulkDeleteSQLiteOutbox(opIds);
}

export const outboxRepo = {
  async enqueueNoteCreate(noteId: string, payload: NoteCreate) {
    await enqueueWithCoalesce("note.create", noteId, payload);
  },

  async enqueueNoteUpdate(noteId: string, payload: NoteUpdate) {
    await enqueueWithCoalesce("note.update", noteId, payload);
  },

  async enqueueNoteMove(noteId: string, payload: NoteUpdate) {
    await enqueueWithCoalesce("note.move", noteId, payload);
  },

  async enqueueNoteDelete(noteId: string) {
    await enqueueWithCoalesce("note.delete", noteId, null);
  },

  async enqueueThreadUpdateTitle(
    threadId: string,
    payload: ConversationUpdate,
  ) {
    await enqueueWithCoalesce("thread.update", threadId, payload);
  },

  async enqueueThreadDelete(threadId: string) {
    await enqueueWithCoalesce("thread.delete", threadId, null);
  },

  async enqueueFolderCreate(folderId: string, payload: FolderCreate) {
    await enqueueWithCoalesce("folder.create", folderId, payload);
  },

  async enqueueFolderUpdate(folderId: string, payload: FolderUpdate) {
    await enqueueWithCoalesce("folder.update", folderId, payload);
  },

  async enqueueFolderDelete(folderId: string) {
    await enqueueWithCoalesce("folder.delete", folderId, null);
  },

  async listOpsByEntityIds(entityIds: string[]) {
    if (!window.graphnodeAPI?.listSQLiteOutboxByEntityIds) {
      return [];
    }

    return window.graphnodeAPI.listSQLiteOutboxByEntityIds(entityIds);
  },
};

async function enqueueWithCoalesce(
  type: OutboxOpType,
  entityId: string,
  payload: unknown,
) {
  const now = Date.now();

  if (!entityId) {
    throw new Error("entityId is required");
  }

  if (type === "note.delete" || type === "thread.delete" || type === "folder.delete") {
    const related = await listEntityOps(entityId);
    const pendingOnly = related.filter((op) => op.status === "pending");
    await deleteOps(pendingOnly.map((op) => op.opId));
    await putOp(
      makeOp(
        entityId,
        type,
        type === "note.delete" ? { id: entityId } : null,
        now,
      ),
    );
    return;
  }

  if (type === "thread.update") {
    const existing = await requireGraphNodeAPI().getSQLitePendingOutbox(
      entityId,
      "thread.update",
    );

    if (existing) {
      await updateOp(existing.opId, {
        payload,
        status: "pending",
        nextRetryAt: now,
        updatedAt: now,
        lastError: undefined,
      });
      return;
    }

    await putOp(makeOp(entityId, "thread.update", payload, now));
    return;
  }

  if (type === "folder.update") {
    const pendingCreate = await requireGraphNodeAPI().getSQLitePendingOutbox(
      entityId,
      "folder.create",
    );

    if (pendingCreate) {
      const merged = {
        ...(pendingCreate.payload as FolderCreate),
        ...(payload as FolderUpdate),
      };
      await updateOp(pendingCreate.opId, {
        payload: merged,
        nextRetryAt: now,
        updatedAt: now,
        lastError: undefined,
      });
      return;
    }

    const existing = await requireGraphNodeAPI().getSQLitePendingOutbox(
      entityId,
      "folder.update",
    );

    if (existing) {
      await updateOp(existing.opId, {
        payload: {
          ...(existing.payload as FolderUpdate),
          ...(payload as FolderUpdate),
        },
        nextRetryAt: now,
        updatedAt: now,
        lastError: undefined,
      });
      return;
    }

    await putOp(makeOp(entityId, "folder.update", payload, now));
    return;
  }

  if (type === "folder.create") {
    await putOp(makeOp(entityId, "folder.create", payload, now));
    return;
  }

  const pendingCreate = await requireGraphNodeAPI().getSQLitePendingOutbox(
    entityId,
    "note.create",
  );

  if (pendingCreate) {
    const merged = mergeIntoCreatePayload(
      pendingCreate.payload as NoteCreate,
      type,
      payload as NoteUpdate,
    );
    await updateOp(pendingCreate.opId, {
      payload: merged,
      status: "pending",
      nextRetryAt: now,
      updatedAt: now,
      lastError: undefined,
    });
    return;
  }

  if (type === "note.update" || type === "note.move") {
    const existing = await requireGraphNodeAPI().getSQLitePendingOutbox(
      entityId,
      type,
    );

    if (existing) {
      await updateOp(existing.opId, {
        payload,
        status: "pending",
        nextRetryAt: now,
        updatedAt: now,
        lastError: undefined,
      });
      return;
    }

    await putOp(makeOp(entityId, type, payload, now));
    return;
  }

  if (type === "note.create") {
    await putOp(makeOp(entityId, "note.create", payload, now));
    return;
  }

  await putOp(makeOp(entityId, type, payload, now));
}
