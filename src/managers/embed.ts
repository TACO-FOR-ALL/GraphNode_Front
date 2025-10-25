// src/managers/embed.ts
import { ChatMessage } from "@/types/Chat";
import { upsertVectors } from "./vectorManager";

export async function embedOne(text: string): Promise<number[]> {
  console.log("🔍 embedOne 시작:", text.substring(0, 50) + "...");

  try {
    console.log("📡 embedAPI 호출 전");
    const res = await window.embedAPI.texts([text]);
    console.log("✅ embedAPI 응답 받음:", res?.length);
    return res[0] as number[];
  } catch (error) {
    console.error("❌ embedOne 오류:", error);
    throw error;
  }
}

export async function indexMessageVector(m: ChatMessage) {
  console.log("🚀 indexMessageVector 시작:", m.id);

  try {
    console.log("📊 임베딩 생성 중...");
    const vec = await embedOne(m.content);
    console.log("✅ 임베딩 생성 완료, 차원:", vec.length);

    console.log("💾 벡터 저장 중...");
    await upsertVectors([
      {
        id: m.id,
        threadId: m.threadId,
        ts: m.ts,
        model: "MiniLM-L6-v2",
        vec,
        preview: m.content.slice(0, 500),
      },
    ]);
    console.log("✅ indexMessageVector 완료");
  } catch (error) {
    console.error("❌ indexMessageVector 오류:", error);
    throw error;
  }
}

export async function indexThreadVectors(
  threadId: string,
  msgs: { id: string; content: string; ts: number }[],
  model = "MiniLM-L6-v2"
) {
  if (!msgs.length) return;

  const CHUNK = 4;
  for (let i = 0; i < msgs.length; i += CHUNK) {
    const batch = msgs.slice(i, i + CHUNK);

    // 안전 가드: 너무 긴 텍스트는 잘라서 임베딩 (토크나이저 폭주 방지)
    const safe = batch.map((m) => ({
      ...m,
      content: m.content.length > 4000 ? m.content.slice(0, 4000) : m.content,
    }));

    // ✅ 청크 사이에 이벤트 루프 양보 (크래시/프리징 완화)
    if (i > 0) await new Promise((r) => setTimeout(r, 0));

    const vectors = await window.embedAPI.texts(safe.map((m) => m.content)); // number[][]
    await upsertVectors(
      safe.map((m, j) => ({
        id: m.id,
        threadId,
        ts: m.ts,
        model,
        vec: vectors[j],
        preview: m.content.slice(0, 500),
      }))
    );
  }
}
