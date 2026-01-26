import { db } from "@/db/graphnode.db";
import { api } from "@/apiClient";
import { Note } from "@/types/Note";
import { NoteDto } from "@taco_tsinghua/graphnode-sdk";

export async function pullNotesOnce() {
  const result = await api.note.listNotes();

  let serverNotes: Note[] = [];

  if (result.isSuccess) {
    serverNotes = result.data.map((n: NoteDto) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      folderId: n.folderId,
      createdAt: new Date(n.createdAt).getTime(),
      updatedAt: new Date(n.updatedAt).getTime(),
    }));
  } else {
    console.error(result.error);
    return;
  }

  if (!Array.isArray(serverNotes) || serverNotes.length === 0) return;

  // 아직 로컬에서 oubox 처리가 안 된 노트들은 서버 최신으로 덮어쓰지 않습니다
  const ids = serverNotes.map((n) => n.id);

  await db.transaction("rw", db.notes, db.outbox, async () => {
    const ops = await db.outbox.where("entityId").anyOf(ids).toArray();

    const locked = new Set(
      ops
        .filter((op) => op.status === "pending" || op.status === "processing")
        .map((op) => op.entityId),
    );

    const upserts = serverNotes.filter((n) => !locked.has(n.id));

    // createdAt/updatedAt 타입 통일(서버가 문자열이면 Date로, 숫자면 new Date)
    // 여기선 서버가 Date/ISO string 올 수도 있으니 방어적으로 처리
    const normalized = upserts.map((n) => ({
      ...n,
      createdAt: new Date(n.createdAt).getTime(),
      updatedAt: new Date(n.updatedAt).getTime(),
    }));

    await db.notes.bulkPut(normalized);
  });
}
