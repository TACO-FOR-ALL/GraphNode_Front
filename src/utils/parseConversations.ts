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

// Claude 데이터의 created_at/updated_at는 ISO 문자열일 수 있어 문자열이면 Date.parse로 처리
const toTimestampMs = (v: any): number | undefined => {
  if (v == null) return;

  if (typeof v === "string") {
    const parsed = Date.parse(v);
    if (isFinite(parsed)) return parsed;
  }

  return toMs(v);
};

// Claude 데이터의 일부 메시지는 text가 비어있거나 구조가 달라 content/message/delta fallback이 필요
const extractMessageText = (m: any): string => {
  const text = typeof m?.text === "string" ? m.text.trim() : "";
  if (text) return text;

  const raw = m?.content ?? m?.message ?? m?.delta ?? "";
  return toMarkdownFromUnknown(raw).trim();
};

const toMsg = (m: any): ChatMessage | null => {
  const role = mapRole(m.role ?? m.author ?? m.speaker);
  const content = extractMessageText(m);
  if (!content) return null;

  const ts =
    toTimestampMs(m.ts ?? m.time ?? m.create_time ?? m.created_at) ??
    Date.now();
  return { id: uuid(), role, content, ts };
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
      threads.push({
        id: uuid(),
        title: String(th?.title),
        messages: msgs,
        updatedAt: Date.now(),
      });
    }
    return threads;
  }

  if (Array.isArray(json?.messages)) {
    const msgs = json.messages.map(toMsg).filter(isMsg);
    if (msgs.length)
      threads.push({
        id: uuid(),
        title: String(json?.title),
        messages: msgs,
        updatedAt: Date.now(),
      });
    return threads;
  }

  if (Array.isArray(json)) {
    // 클로드 데이터를 GraphNode의 ChatThread 형식으로 변환
    const looksLikeClaude = json.some(
      (it) =>
        it &&
        typeof it === "object" &&
        Array.isArray((it as any).chat_messages),
    );

    if (looksLikeClaude) {
      for (const conv of json) {
        const messages = Array.isArray(conv?.chat_messages)
          ? conv.chat_messages
          : [];

        const msgs: ChatMessage[] = messages
          .map((m: any) => {
            const content = extractMessageText(m);
            if (!content) return null;

            const role = mapRole(
              m?.sender ?? m?.role ?? m?.author ?? m?.speaker,
            );

            const ts =
              toTimestampMs(
                m?.updated_at ??
                  m?.created_at ??
                  m?.create_time ??
                  m?.time ??
                  m?.ts,
              ) ??
              toTimestampMs(conv?.updated_at) ??
              toTimestampMs(conv?.created_at) ??
              Date.now();

            return { id: uuid(), role, content, ts } as ChatMessage;
          })
          .filter((m: ChatMessage | null): m is ChatMessage => m != null);

        if (!msgs.length) continue;

        const maxMsgTs = Math.max(...msgs.map((m) => m.ts));
        const updatedAt =
          (isFinite(maxMsgTs) ? maxMsgTs : 0) ||
          toTimestampMs(conv?.updated_at) ||
          toTimestampMs(conv?.created_at) ||
          Date.now();

        threads.push({
          id: uuid(),
          title: String(conv?.name ?? conv?.title ?? "Imported Conversation"),
          messages: msgs,
          updatedAt,
        });
      }
      return threads;
    }

    // OpenAI 데이터를 GraphNode의 ChatThread 형식으로 변환
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
              toTimestampMs(msg?.create_time) ??
              toTimestampMs(n?.create_time) ??
              toTimestampMs(conv?.create_time) ??
              Date.now();

            return { id: uuid(), role, content, ts } as ChatMessage;
          })
          .filter((m): m is ChatMessage => !!m);

        if (msgs.length) {
          const title = String(conv?.title);

          const maxMsgTs = Math.max(...msgs.map((m) => m.ts));
          const updatedAt =
            (isFinite(maxMsgTs) ? maxMsgTs : 0) ||
            toTimestampMs(conv?.update_time) ||
            toTimestampMs(conv?.create_time) ||
            Date.now();

          threads.push({ id: uuid(), title, messages: msgs, updatedAt });
        }
      }
      return threads;
    }

    const maybeMsgs = json.map(toMsg).filter(isMsg);
    if (maybeMsgs.length)
      threads.push({
        id: uuid(),
        title: String(json[0]?.title),
        messages: maybeMsgs,
        updatedAt: Date.now(),
      });
    return threads;
  }

  return threads;
}
