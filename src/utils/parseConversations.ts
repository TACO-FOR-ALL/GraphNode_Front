import { toMarkdownFromUnknown } from "./toMarkdown";
import { ChatMessage, ChatThread } from "../types/Chat";
import uuid from "./uuid";

const mapRole = (raw: any): "user" | "assistant" | "system" => {
  const r = String(raw ?? "").toLowerCase();
  if (r.includes("assist")) return "assistant";
  if (r.includes("system") || r === "sys") return "system";
  return "user";
};

const toMs = (v: any): number | undefined => {
  const n = Number(v);
  if (!isFinite(n)) return;
  // 13자리 이상이면 이미 ms로 간주
  return n > 1e12 ? Math.round(n) : Math.round(n * 1000);
};

const toMsg = (m: any): ChatMessage | null => {
  const role = mapRole(m.role ?? m.author ?? m.speaker);
  const raw = m.content ?? m.text ?? m.message ?? m.delta ?? "";
  const content = toMarkdownFromUnknown(raw);
  if (!content) return null;

  const ts = Number(m.ts ?? m.time ?? m.create_time ?? Date.now());
  return { id: uuid(), role, content, ts: isFinite(ts) ? ts : Date.now() };
};

// OpenAI conversations.json의 `mapping`은 메시지들을 배열이 아니라
// messages[]는 화면에 보여주기 좋은 “일렬 순서의 메시지 목록”이고
// mapping은 원본 대화가 어떻게 연결되어 있는지 담는 “구조 정보(트리)”예요
// 대화 중 응답 재생성 등이 발생하면 브랜치가 생길 수 있으므로, 전체 mapping을 그대로 펼치면 실제로 선택되지 않은 메시지까지 섞일 수 있습니다.
//
// 이 함수는 `current_node`(현재 선택된 마지막 메시지)에서 시작해
// parent를 따라 루트까지 거슬러 올라간 뒤, 순서를 뒤집어
// 실제 대화 흐름대로 처음 메시지부터 마지막 메시지까지 반환합니다.
//
// `current_node`가 없거나 유효하지 않은 경우에는 fallback으로
// message가 있는 모든 노드를 반환합니다.
function getOpenAIConversationPath(conv: any): any[] {
  const mapping = conv?.mapping;
  if (!mapping || typeof mapping !== "object") return [];

  const currentNodeId = conv?.current_node;
  if (!currentNodeId || !mapping[currentNodeId]) {
    return Object.values(mapping).filter((node: any) => node && node.message);
  }

  const path: any[] = [];
  const seen = new Set<string>();
  let nodeId: string | null = currentNodeId;

  while (nodeId && mapping[nodeId] && !seen.has(nodeId)) {
    seen.add(nodeId);
    path.push(mapping[nodeId]);
    nodeId = mapping[nodeId]?.parent ?? null;
  }

  return path.reverse().filter((node: any) => node && node.message);
}

export function parseConversations(json: any): ChatThread[] {
  const threads: ChatThread[] = [];
  const isMsg = (x: ChatMessage | null): x is ChatMessage => x != null;

  if (Array.isArray(json?.threads)) {
    for (const th of json.threads) {
      const msgs = (Array.isArray(th?.messages) ? th.messages : [])
        .map(toMsg)
        .filter(isMsg);
      if (!msgs.length) continue;
      threads.push({ id: uuid(), title: String(th?.title), messages: msgs, updatedAt: Date.now() });
    }
    return threads;
  }

  if (Array.isArray(json?.messages)) {
    const msgs = json.messages.map(toMsg).filter(isMsg);
    if (msgs.length)
      threads.push({ id: uuid(), title: String(json?.title), messages: msgs, updatedAt: Date.now() });
    return threads;
  }

  if (Array.isArray(json)) {
    const looksLikeOpenAI = json.some(
      (it) =>
        it &&
        typeof it === "object" &&
        it.mapping &&
        typeof it.mapping === "object",
    );

    if (looksLikeOpenAI) {
      for (const conv of json) {
        const nodes = getOpenAIConversationPath(conv);

        const msgs = nodes
          .map((n: any) => {
            const msg = n.message;

            const role = mapRole(msg?.author?.role);

            const content = toMarkdownFromUnknown(
              msg?.content ?? msg?.text ?? "",
            );

            const hidden = msg?.metadata?.is_visually_hidden_from_conversation;
            if (hidden || !content.trim()) return null;

            const ts =
              toMs(msg?.create_time) ??
              toMs(n?.create_time) ??
              toMs(conv?.create_time) ??
              Date.now();

            return { id: uuid(), role, content, ts } as ChatMessage;
          })
          .filter((m): m is ChatMessage => !!m);

        if (msgs.length) {
          const title = String(conv?.title);

          const maxMsgTs = Math.max(...msgs.map((m) => m.ts));
          const updatedAt =
            (isFinite(maxMsgTs) ? maxMsgTs : 0) ||
            toMs(conv?.update_time) ||
            toMs(conv?.create_time) ||
            Date.now();

          threads.push({ id: uuid(), title, messages: msgs, updatedAt });
        }
      }
      return threads;
    }

    const maybeMsgs = json.map(toMsg).filter(isMsg);
    if (maybeMsgs.length)
      threads.push({ id: uuid(), title: String(json[0]?.title), messages: maybeMsgs, updatedAt: Date.now() });
    return threads;
  }

  return threads;
}
